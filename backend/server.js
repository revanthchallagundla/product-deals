/*
Purpose of this class : Handle server setup and configuration
This module initializes the Express server, connects to MongoDB, and sets up middleware and routes.
Dependencies : Express, Mongoose, CORS, dotenv for environment variables
Author : Nuthan M
Created Date : 2025-July-03
*/

import "dotenv/config";

import express, { json, urlencoded, static as expressStatic } from "express";
import { connect } from "mongoose";
import cors from "cors";
import routes from "./routes/index.js";
import { join } from "path"; //- For local static file serving
import { fileURLToPath } from "url";
// import { dirname } from "path";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Must be first: Health check
app.get("/", (req, res) => {
  res.status(200).send("✅ API backend is running");
});

// ✅ Middlewares
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// ✅ Static files - For Local testing
// Serve static files from the "src" directory
// Todo: app.use(expressStatic(join(__dirname, "../src")));

// ✅ Routes
app.use("/api", routes);

// ✅ DB and Server startup
connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });
