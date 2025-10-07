// backend/controllers/dealsController.js
import axios from "axios";
import Product from "../models/Product.js";
import ProductHistory from "../models/ProductHistory.js";
import ProductResponse from "../models/ProductResponse.js";
import config from "../utils/config.js";
import {
  groupByVariantAndQuantityWithAI,
  filterOffersByRelevance, // optional, used for fallback
} from "../lib/ai.js";

const {
  MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS,
  MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED,
} = config;

/**
 * POST /api/deals
 * Body: { products: [{ id?, name }], start?: number }
 *
 * Steps:
 * 1) validate + limit
 * 2) resolve/create Product docs
 * 3) record ProductHistory
 * 4) for each product -> get deals (cache or SerpAPI), paginate slice
 * 5) for each product -> AI filter+enrich+group with queryHint = product.name
 * 6) flatten groups and return
 */
export async function getProductDeals(req, res) {
  console.log("🟢 getProductDeals called with body:", req.body);

  try {
    // 1) validate
    const products = req.body?.products;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Products array is required" });
    }

    // pagination
    const start = parseInt(req.query.start || "0", 10) || 0;

    // limit (guest vs auth)
    const maxAllowed = req.user
      ? MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED
      : MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS;

    if (products.length > maxAllowed) {
      return res.status(400).json({
        message: `Only ${MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS} products can be checked at a time for guests. Please log in to check more products.`,
      });
    }

    // 2) resolve/create product docs
    const productDocs = await Promise.all(
      products.map(async (p) => {
        if (p.id) return Product.findById(p.id);
        const existing = await Product.findOne({
          name: new RegExp(`^${p.name}$`, "i"),
        });
        return existing || Product.create({ name: p.name, category: "General" });
      })
    );
    const valid = productDocs.filter(Boolean);
    if (valid.length === 0) {
      return res.status(400).json({ message: "No valid products found" });
    }

    // 3) record history
    const history = await ProductHistory.create({
      products: valid.map((d) => d._id),
    });

    // 4) gather raw results per product
    const perProductResults = [];
    for (const prod of valid) {
      // find unexpired cached response
      const cachedDoc = await ProductResponse.findOne({
        "products.product": prod._id,
        expiresAt: { $gt: new Date() },
      }).lean();

      // find entry for this product
      const entry = cachedDoc?.products?.find(
        (e) => String(e.product) === String(prod._id)
      );
      const hasDeals = Array.isArray(entry?.deals) && entry.deals.length > 0;

      let fetchedFromApi = false;
      let deals = [];

      if (!cachedDoc || start > 0 || !hasDeals) {
        // cache miss or paginating or empty cache -> pull from SerpAPI
        fetchedFromApi = true;
        deals = await fetchDealsFromSerpAPI(prod.name);

        // write/refresh cache only when start==0
        if (start === 0) {
          const writeDoc = await ProductResponse.findOne({
            "products.product": prod._id,
          });
          if (!writeDoc) {
            await ProductResponse.create({
              productHistory: history._id,
              products: [{ product: prod._id, productName: prod.name, deals }],
            });
          } else {
            const pEntry = writeDoc.products.find((e) =>
              e.product.equals(prod._id)
            );
            if (pEntry) {
              pEntry.deals = deals;
              pEntry.productName = prod.name;
            } else {
              writeDoc.products.push({
                product: prod._id,
                productName: prod.name,
                deals,
              });
            }
            await writeDoc.save();
          }
        }
      } else {
        // cache hit
        deals = entry.deals || [];
      }

      // pagination slice for UI “load more”
      const slice = deals.slice(start, start + 10);

      perProductResults.push({
        product: { id: String(prod._id), name: prod.name },
        deals: slice,
        source: fetchedFromApi ? "api" : "db",
      });
    }

    // 5) AI grouping PER PRODUCT (pass queryHint = product.name)
    const useAI = (req.query.groupAI ?? "true") !== "false";

    if (!useAI) {
      // raw passthrough (legacy)
      return res.json(perProductResults);
    }

    const allGroups = [];
    for (const r of perProductResults) {
      try {
        // attach productName to help UI (optional)
        const flatOffers = (r.deals || []).map((d) => ({
          ...d,
          productName: r.product?.name,
        }));

        const groupsForProduct = await groupByVariantAndQuantityWithAI(
          flatOffers,
          { queryHint: r.product?.name }
        );

        // Tag each group with where the deals came from (api/db) for UI badge
       groupsForProduct.forEach((g) => {
        g.source = r.source || "db";
        g.rootName = r.product?.name || "results";   // 👈 add this line
      });

        allGroups.push(...groupsForProduct);
      } catch (e) {
        console.error(
          `⚠️ AI grouping failed for "${r.product?.name}":`,
          e?.message || e
        );
        // Fallback: quick local filter then return as a single group
        try {
          const filtered = filterOffersByRelevance(r.deals || [], r.product?.name || "");
          allGroups.push({
            product: {
              id: `${r.product?.id}-raw`,
              name: (r.product?.name || "results") + " — unknown size",
            },
            deals: filtered,
            source: r.source || "db",
          });
        } catch {
          allGroups.push({
            product: {
              id: `${r.product?.id}-raw`,
              name: (r.product?.name || "results"),
            },
            deals: r.deals || [],
            source: r.source || "db",
          });
        }
      }
    }

    // 6) return flattened groups
    return res.json(allGroups);
  } catch (err) {
    console.error("❗ getProductDeals error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
}

/* ---------------------- SerpAPI helper ---------------------- */
async function fetchDealsFromSerpAPI(rawQuery) {
  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) throw new Error("SERPAPI_KEY not defined");

    const query = String(rawQuery || "").replace(/[^\w\s]/g, " ").trim();
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

    const raw = data?.shopping_results || [];

    // normalize
    return raw
      .filter((item) => item?.title && (item?.source || item?.seller))
      .map((item) => ({
        title: item.title,
        link: item.product_link || item.link || "",
        image: item.thumbnail || "",
        price: item.price || item.extracted_price || "",
        source: item.source || item.seller || "Unknown",
        rating: item.rating ?? null,
        reviews: item.reviews ?? null,
        fetchedAt: new Date().toISOString(),
      }));
  } catch (err) {
    console.error("❌ SerpAPI error:", err.message || err);
    return [];
  }
}
