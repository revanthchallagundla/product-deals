/*
Purpose of this class : Handle product schema and model
This module defines the schema for products in the database, including fields for name, category, and creation date.
Dependencies : Mongoose for schema definition and model creation.
Author : Nuthan M
Created Date : 2025-July-03
*/

import { Schema, model } from "mongoose";

const ProductSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create text index for search
ProductSchema.index({ name: "text" });

export default model("Product", ProductSchema);
