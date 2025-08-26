import axios from "axios";
import Product from "../models/Product.js";
import ProductHistory from "../models/ProductHistory.js";
import ProductResponse from "../models/ProductResponse.js";
import sourceFilter from "../utils/sourceFilter.js";
import config from "../utils/config.js";

const {
  ALLOWED_SOURCES,
  MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS,
  MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED,
} = config;

/**
 * POST /api/deals
 * Body: { products: [{ id?, name }], start?: number }
 *
 * 1. Validate input & pagination parameters
 * 2. Enforce per-user product limits (guest vs. authenticated)
 * 3. Lookup or create Product documents
 * 4. Record a ProductHistory entry
 * 5. For each product:
 *    – Check MongoDB cache (ProductResponse)
 *    – Treat empty or missing cache as a MISS
 *    – On MISS or paginating (start > 0):
 *        • Sanitize & call SerpAPI
 *        • Update/create cache only on first page
 *    – On HIT:
 *        • Read deals from cache
 *    – Push { product, deals, source } with accurate source flag
 */ export async function getProductDeals(req, res) {
  console.log("🟢 getProductDeals called with body:", req.body);

  try {
    // 1️⃣ Validate request body
    const products = req.body?.products;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array is required" });
    }

    // 2️⃣ Parse pagination start index
    const start = parseInt(req.query.start || "0", 10);
    console.log(`🔢 Pagination start index: ${start}`);

    // 3️⃣ Enforce per-day product limit
    const maxAllowed = req.user
      ? MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED
      : MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS;
    if (products.length > maxAllowed) {
      return res.status(400).json({
        message: `Only ${MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS} products can be checked at a time for guests. Please log in to check more products.`,
      });
    }
    console.log(req.user ? "👤 Authenticated user" : "👤 Anonymous user");
    console.log(`📦 Processing ${products.length} products (start=${start})`);

    // 4️⃣ Resolve or create Product documents
    const productDocs = await Promise.all(
      products.map(async (p) => {
        if (p.id) return Product.findById(p.id);
        const existing = await Product.findOne({
          name: new RegExp(`^${p.name}$`, "i"),
        });
        return (
          existing || Product.create({ name: p.name, category: "General" })
        );
      })
    );
    const valid = productDocs.filter(Boolean);
    if (valid.length === 0) {
      return res.status(400).json({ message: "No valid products found" });
    }
    console.log(
      "✅ Valid products:",
      valid.map((p) => p.name)
    );

    // 5️⃣ Record history of this lookup
    const history = await ProductHistory.create({
      products: valid.map((d) => d._id),
    });
    console.log("🗂️ Created ProductHistory ID:", history._id);

    // 6️⃣ Fetch deals for each product
    const results = [];
    for (const prod of valid) {
      console.log(
        `\n=== Handling product "${prod.name}" (ID: ${prod._id}) ===`
      );

      // 6a. Check existing cache entry
      const initialRespDoc = await ProductResponse.findOne({
        "products.product": prod._id,
        expiresAt: { $gt: new Date() },
      });
      console.log("🗄️ initialRespDoc found:", !!initialRespDoc);

      // *** ADD THIS LINE: initialize respDoc to point at your existing cache ***
      let respDoc = initialRespDoc;

      // 6b. Determine if cache has any deals
      const entry = respDoc?.products.find((e) => e.product.equals(prod._id));
      const hasDeals = Array.isArray(entry?.deals) && entry.deals.length > 0;
      console.log(
        "🔎 Cache has deals:",
        hasDeals,
        `(${entry?.deals.length || 0})`
      );

      // 6c. Decide MISS vs. HIT
      let fetchedFromApi = false;
      let deals = [];
      if (!respDoc || start > 0 || !hasDeals) {
        // MISS: either no cache, paginating, or empty cache
        fetchedFromApi = true;
        console.log("🚀 MISS: fetching from SerpAPI…");
        deals = await fetchDealsFromSerpAPI(prod.name);
        console.log(
          `📈 SerpAPI returned ${deals.length} deals for "${prod.name}"`
        );

        // 6d. Update cache only on first page
        if (start === 0) {
          if (!respDoc) {
            respDoc = await ProductResponse.create({
              productHistory: history._id,
              products: [{ product: prod._id, productName: prod.name, deals }],
            });
            console.log(`💾 Cached NEW deals for "${prod.name}"`);
          } else {
            entry.deals = deals;
            await respDoc.save();
            console.log(`🔄 Updated cache for "${prod.name}"`);
          }
        }
      } else {
        // HIT: return existing deals
        console.log("✅ HIT: serving from cache");
        deals = entry.deals;
        console.log(`📊 Returning ${deals.length} cached deals`);
      }

      // 6e. Push final result slice + correct source flag
      const slice = deals.slice(start, start + 10);
      const source = fetchedFromApi ? "api" : "db";
      console.log(
        `📝 Pushing result: source="${source}", dealsCount=${slice.length}`
      );
      results.push({
        product: { id: prod._id, name: prod.name },
        deals: slice,
        source,
      });
    }

    return res.json(results);
  } catch (err) {
    console.error("❗ getProductDeals error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}

/**
 * Helper: Fetch & filter shopping results from SerpAPI
 */
async function fetchDealsFromSerpAPI(rawQuery) {
  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) throw new Error("SERPAPI_KEY not defined");

    // Remove punctuation from search term
    const query = rawQuery.replace(/[^\w\s]/g, "").trim();
    console.log("🔍 Searching SerpAPI for:", query);

    const { data } = await axios.get("https://serpapi.com/search", {
      params: {
        api_key: apiKey,
        q: query,
        engine: "google_shopping",
        google_domain: "google.com.au",
        hl: "en",
        gl: "au",
        tdm: "shop",
        num: 40,
        direct_link: true,
      },
    });

    const raw = data.shopping_results || [];
    console.log(`🛒 SerpAPI returned ${raw.length} raw results`);

    // Filter by allowed sources & normalize shape
    return sourceFilter
      .filterByAllowedSources(raw, ALLOWED_SOURCES)
      .map((item) => ({
        title: item.title,
        link: item.product_link || item.link,
        image: item.thumbnail,
        price: item.price,
        source: item.source,
        rating: item.rating,
        reviews: item.reviews,
        shipping: item.shipping,
      }));
  } catch (err) {
    console.error("❌ SerpAPI error:", err.message || err);
    return [];
  }
}
