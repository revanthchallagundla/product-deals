/*
Purpose of this class : Handle product history schema and model
This module defines the schema for product search history, including the products searched and the date of the
search. It is used to track user search history for products in the application.
Dependencies : Mongoose for schema definition and model creation.
Author : Nuthan M
Created Date : 2025-July-03
*/

import { Schema, model } from "mongoose";

const ProductHistorySchema = new Schema({
  products: [
    {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  searchDate: {
    type: Date,
    default: Date.now,
  },
});

export default model("ProductHistory", ProductHistorySchema);
