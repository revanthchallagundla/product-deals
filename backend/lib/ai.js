// backend/lib/ai.js
import crypto from "node:crypto";
import OpenAI from "openai";

/**
 * We use OpenRouter via OpenAI SDK.
 * TEXT model: deepseek/deepseek-chat-v3.1 (you already use this)
 * VISION model: openai/gpt-4o-mini (supports image_url on OpenRouter)
 */
export const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
    "X-Title": "Product Deals - Vision Grouping",
  },
});

// ---------- helpers ----------
const id24 = (s) =>
  crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 24);

const priceToNumber = (price) => {
  if (price == null) return null;
  const n = String(price).replace(/[^0-9.,]/g, "").replace(",", ".");
  const f = parseFloat(n);
  return Number.isFinite(f) ? f : null;
};

const normalisePriceStr = (price) => {
  const n = priceToNumber(price);
  return n == null ? null : `$${n.toFixed(2)}`;
};

// ------------------------ Relevance filtering ------------------------

const STOPWORDS = new Set([
  "the","a","an","and","or","of","for","with","to","on","at","by","from","in",
  "pack","pcs","each","new","set","box"
]);

const APPAREL_TOKENS = [
  "shoe","sneaker","trainer","sandals","boot","heels","clog","flip","thong",
  "dress","skirt","top","tee","t-shirt","shirt","polo","jumper","hoodie","sweater",
  "jacket","coat","jeans","pants","shorts","tracksuit","activewear","sock","belt",
  "cap","hat","bag","wallet","watch","ring","necklace","earring","sunglass","scarf",
  "mens","women","kids","boy","girl","size","colour","black","white","blue","green",
  "lacoste","nike","adidas","puma","reebok","asics","new balance","under armour",
];

const GROCERY_HINT_TOKENS = [
  "milk","cream","cheese","butter","yoghurt","yogurt","bread","cereal","chips",
  "snack","snacks","biscuits","biscuit","cracker","dip","chocolate","chocolates",
  "coffee","tea","sugar","salt","oil","olive","canola","dishwashing","detergent",
  "soap","shampoo","toothpaste","juice","soda","soft","drink","water"
];

function normalize(str = "") {
  return str.toLowerCase().replace(/[^a-z0-9\s\.\-\+]/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(str = "") {
  return normalize(str)
    .split(" ")
    .filter(t => t && !STOPWORDS.has(t));
}
function hasAny(str, list) {
  const t = normalize(str);
  return list.some(k => t.includes(k));
}
function jaccard(aSet, bSet) {
  const inter = new Set([...aSet].filter(x => bSet.has(x)));
  const uni = new Set([...aSet, ...bSet]);
  return uni.size ? inter.size / uni.size : 0;
}

/**
 * Score an offer vs. the query. Require minimal overlap; down-rank apparel if the query looks grocery.
 */
function relevanceScore(offer, query) {
  const title = offer?.title || "";
  const source = offer?.source || "";
  const tSet = new Set(tokens(title + " " + source));
  const qSet = new Set(tokens(query));

  let score = 0;

  // lexical overlap
  const jac = jaccard(tSet, qSet);
  score += jac * 2;

  // exact phrase bumps (e.g., "le snak", "full cream")
  const tNorm = normalize(title);
  const qNorm = normalize(query);
  if (qNorm && tNorm.includes(qNorm)) score += 1.5;

  // brand/product key phrases
  const hints = [
    "uncle toby","uncle tobys","le snak","le snack","doritos","full cream",
    "skim","lite","light","zymil","farmhouse","coles","woolworths"
  ];
  if (hasAny(title, hints)) score += 0.6;

  // penalty: apparel words for grocery-like query
  const queryLooksGrocery = hasAny(query, GROCERY_HINT_TOKENS) || hasAny(query, ["milk","snack","biscuits","chips","cheese","coffee","chocolate"]);
  if (queryLooksGrocery && hasAny(title, APPAREL_TOKENS)) score -= 2.5;

  // tiny boost if seller looks like a supermarket
  if (hasAny(source, ["woolworths","coles","aldi","iga","harris farm","big w","kmart","chemwarehouse","chemist","amazon","costco","dan murphy"])) {
    score += 0.2;
  }

  return score;
}

/**
 * Drop obviously wrong-category items and wild price outliers.
 */
function filterOffersByRelevance(offers = [], queryHint = "") {
  if (!offers.length) return [];

  // 1) lexical/category filter
  let scored = offers
    .map(o => ({ o, s: relevanceScore(o, queryHint) }))
    .filter(x => x.s >= 0.15); // minimum overlap / relevance

  // If we were too aggressive, relax slightly
  if (scored.length === 0) {
    scored = offers.map(o => ({ o, s: relevanceScore(o, queryHint) }))
                   .filter(x => x.s >= 0.05);
  }

  let kept = scored.map(x => x.o);

  // 2) price outlier filter (keep within 4× of median for non-empty prices)
  const nums = kept.map(k => priceToNumber(k.price)).filter(n => Number.isFinite(n)).sort((a,b)=>a-b);
  if (nums.length >= 3) {
    const median = nums[Math.floor(nums.length/2)];
    kept = kept.filter(k => {
      const p = priceToNumber(k.price);
      if (!Number.isFinite(p)) return true; // keep unknown
      return p <= median * 4; // drop ludicrously high priced unrelated items
    });
  }

  // 3) dedupe identical titles+source
  const seen = new Set();
  kept = kept.filter(k => {
    const key = `${normalize(k.title)}|${normalize(k.source)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return kept;
}

// ------------------------ Quantity/variant extraction ------------------------

/** Extract total mL from the title (regex): "1L", "1.5 L", "1000ml", "6 x 200ml", etc. */
export function extractMlFromTitle(title = "") {
  const t = title.toLowerCase();

  // "6 x 200ml", "6x200 ml"
  const pack = t.match(
    /(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)\s*(ml|mL|l|L|liters?|litres?)/i
  );
  if (pack) {
    const count = parseFloat(pack[1]);
    const each = parseFloat(pack[2]);
    const unit = pack[3].toLowerCase();
    const eachMl = /l|liters?|litres?/.test(unit) ? each * 1000 : each;
    const total = Math.round(count * eachMl);
    if (Number.isFinite(total)) return total;
  }

  // "1.5L", "2 L", "1 litre"
  const litre = t.match(/(\d+(?:\.\d+)?)\s*(l|liters?|litres?)/i);
  if (litre) {
    const qty = parseFloat(litre[1]);
    const ml = Math.round(qty * 1000);
    if (Number.isFinite(ml)) return ml;
  }

  // "1000ml", "250 ml"
  const ml = t.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
  if (ml) {
    const qty = parseFloat(ml[1]);
    const val = Math.round(qty);
    if (Number.isFinite(val)) return val;
  }

  return null;
}

/** Milk "variant" (also used generically as a style tag) from title */
export function extractVariant(title = "") {
  const t = title.toLowerCase();
  if (/(full[\s-]?cream|whole)/.test(t)) return "full-cream";
  if (/(lite|light|reduced\s*fat|low[-\s]?fat|smarter\s*white)/.test(t)) return "lite";
  if (/\bskim\b/.test(t)) return "skim";
  if (/\ba2\b/.test(t)) return "a2";
  if (/\borganic\b/.test(t)) return "organic";
  if (/(lactose\s*free|zymil|lactosefree)/.test(t)) return "lactose-free";
  if (/\bsoy\b|\bso\s?good\b/.test(t)) return "soy";
  if (/\balmond\b/.test(t)) return "almond";
  if (/\boat\b/.test(t)) return "oat";
  // generic snack cues (helps chips/biscuits etc.)
  if (/\b(biscuit|biscuits|cracker|chips?|snack|snacks?)\b/.test(t)) return "snack";
  return "milk";
}

export const mlLabel = (ml) =>
  ml == null ? "unknown size" : ml >= 1000 ? `${(ml / 1000).toFixed(2)} L` : `${ml} mL`;

/**
 * 🔎 Vision extract: ask the model to read the QUANTITY printed on the product image.
 * Returns { quantityMl: number|null }
 */
export async function visionExtractQuantityMl(imageUrl, {
  model = "openai/gpt-4o-mini",
  timeoutMs = 20000,
} = {}) {
  if (!imageUrl) return { quantityMl: null };

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const prompt = `Read only the package size (quantity) visible on the product label.
Return JSON like: {"quantityMl": 1000}
- If the label says "1L" or "1 litre" => 1000
- "2L" => 2000
- "250 mL" => 250
- "6 x 200 mL" => 1200
If unsure, return {"quantityMl": null}. Respond with ONLY JSON.`;

    const resp = await openai.chat.completions.create({
      model,
      temperature: 0.0,
      messages: [
        { role: "system", content: "You are a precise OCR assistant. Output strict JSON only." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      signal: controller.signal,
    });

    const txt = resp?.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(txt);
    const q = parsed?.quantityMl;
    if (q == null) return { quantityMl: null };
    const n = Number(q);
    return { quantityMl: Number.isFinite(n) ? Math.round(n) : null };
  } catch (e) {
    // swallow vision errors; we'll fallback
    return { quantityMl: null };
  } finally {
    clearTimeout(to);
  }
}

/**
 * Enrich deals with {variant, quantityMl}.
 * 1) title regex
 * 2) if quantityMl missing → Vision OCR from image
 */
export async function enrichDealsWithAI(deals, { visionModel } = {}) {
  const enriched = [];

  // First pass: extract from titles
  const withNeedsVision = [];
  for (const d of deals) {
    const variant = extractVariant(d.title || "");
    const quantityMl = extractMlFromTitle(d.title || "");
    const base = {
      ...d,
      price: normalisePriceStr(d.price),
      variant,
      quantityMl: quantityMl ?? null,
    };
    if (base.quantityMl == null) withNeedsVision.push(base);
    enriched.push(base);
  }

  // Vision pass for ones we couldn't parse
  if (withNeedsVision.length > 0) {
    await Promise.all(
      withNeedsVision.map(async (d) => {
        const { quantityMl } = await visionExtractQuantityMl(d.image, {
          model: visionModel || "openai/gpt-4o-mini",
        });
        d.quantityMl = quantityMl ?? d.quantityMl ?? null;
      })
    );
  }

  return enriched;
}

/**
 * Group by (variant + quantityMl), sort each group by price asc.
 * Returns [{ product:{id,name}, deals:[...] , source:"db" }]
 */
export function groupByVariantAndQuantity(deals) {
  const buckets = new Map();
  for (const d of deals) {
    const key = `${d.variant}|${d.quantityMl ?? "unknown"}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(d);
  }

  const groups = [];
  for (const [key, arr] of buckets.entries()) {
    // sort by price asc
    arr.sort((a, b) => {
      const pa = priceToNumber(a.price);
      const pb = priceToNumber(b.price);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return pa - pb;
    });

    const [variant, q] = key.split("|");
    const quantityMl = q === "unknown" ? null : Number(q);
    const name =
      variant === "milk"
        ? `Milk — ${mlLabel(quantityMl)}`
        : `${variant.replace("-", " ")} — ${mlLabel(quantityMl)}`;

    groups.push({
      product: { id: id24(`${variant}:${quantityMl ?? "unknown"}`), name },
      deals: arr,
      source: "db",
    });
  }

  // optional sort
  groups.sort((a, b) => a.product.name.localeCompare(b.product.name));
  return groups;
}

/**
 * Utility: find the most common productName in a list of offers.
 */
function modeProductName(offers = []) {
  const counts = new Map();
  offers.forEach(o => {
    const k = (o.productName || "").trim().toLowerCase();
    if (!k) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  let best = "";
  let max = 0;
  for (const [k,v] of counts.entries()) {
    if (v > max) { max = v; best = k; }
  }
  return best || "";
}

/**
 * High-level: filter irrelevant offers, enrich with variant/quantity via regex + vision,
 * then group them and return.
 */
export async function groupByVariantAndQuantityWithAI(
  flatOffers,
  { visionModel = "openai/gpt-4o-mini", queryHint } = {}
) {
  const hint = (queryHint || modeProductName(flatOffers) || "").trim();
  const filtered = filterOffersByRelevance(flatOffers, hint);
  const enriched = await enrichDealsWithAI(filtered, { visionModel });
  return groupByVariantAndQuantity(enriched);
}

// Also export if the controller wants to run only filtering:
export { filterOffersByRelevance };
