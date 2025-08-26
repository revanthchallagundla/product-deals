/*
Purpose of this class : Handle autocomplete search functionality for products
This controller provides an endpoint to fetch product suggestions based on user input.
Dependencies : Product model
Author : Nuthan M
Created Date : 2025-July-03
*/

import Product from "../models/Product.js";

/**
 * GET /api/autocomplete : Get autocomplete results for product search.
 */
export async function getAutocompleteResults(req, res) {
  try {
    const { query } = req.query;

    // Validate query parameter - Ensure query is a string and has at least 2 characters
    if (typeof query !== "string") {
      return res.status(400).json({ message: "Query must be a string" });
    }

    // Validate query parameter -
    // 1. Check if query length is less than 2 characters
    // 2. This is to prevent unnecessary database queries for very short inputs and to ensure a better user experience.
    // 3. This also helps in reducing load on the database and improving performance
    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ message: "Query must be at least 2 characters" });
    }

    // Objective: Fetch products from the database if the query is valid
    // Approach:
    // 1. Using regex to match product names that contain the query string
    // 2. Using $options: "i" for case-insensitive search
    // 3. Limiting results to 10 for performance and usability.
    // 4. If no results found, add a generic fallback product with the query as name.

    const products = await Product.find({
      name: { $regex: query, $options: "i" },
    })
      .select("name _id category")
      .limit(10);

    // If no results found, add a generic fallback
    // product with the query as name.
    // This fallback ensures that the user always gets a response,
    // even if there are no matching products in the database.
    if (products.length === 0) {
      products.push({
        name: query,
        _id: null,
        category: "General",
      });
    }

    // Mapping should be done after fallback
    // Objective: Map the results to a simpler structure for the response.
    // Approach:
    // 1. Extracting only the necessary fields: name, id, and category.
    // 2. This helps in reducing the size of the response and makes it easier to handle on the client side.
    // 3. If category is not available, default to "General".
    const mappedResults = products.map((product) => ({
      name: product.name,
      id: product._id,
      category: product.category || "General",
    }));

    // Objective: Return the mapped results as JSON response.
    res.json(mappedResults);
  } catch (error) {
    console.error("Error in autocomplete:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
