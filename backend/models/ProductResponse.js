/*
Purpose of this class : Handle product response schema and model
This module defines the schema for product responses, including product history, products, and their deals.
Dependencies : Mongoose for schema definition and model creation.
Author : Nuthan M
Created Date : 2025-July-03
*/

import { Schema, model } from "mongoose";

const ProductResponseSchema = new Schema({
  productHistory: {
    type: Schema.Types.ObjectId,
    ref: "ProductHistory",
    required: true,
  },
  products: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
      productName: String,
      deals: [
        {
          title: String,
          link: String,
          image: String,
          price: String,
          source: String,
          rating: Number,
          reviews: Number,
          shipping: String,
          fetchedAt: { type: Date, default: Date.now }, // 🆕 New field to track when we fetched it from Serp API
        },
      ],
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: function () {
      // Set expiration to 24 hours from now
      const date = new Date();
      date.setHours(date.getHours() + 24);
      return date;
    },
  },
});

// Create index for expiration
ProductResponseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("ProductResponse", ProductResponseSchema);
