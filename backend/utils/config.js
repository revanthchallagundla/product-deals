/*
Purpose of this class : Handle configuration settings for the application.
This module provides constants for allowed sources, featured product limits, and logo URLs.
Dependencies : dotenv for environment variable management
Author : Nuthan M
Created Date : 2025-July-03
*/

import "dotenv/config";

// Validate and parse environment variables
if (!process.env.ALLOWED_SOURCES) {
  throw new Error("ALLOWED_SOURCES environment variable is required");
}
if (!process.env.FEATURED_LIMIT) {
  throw new Error("FEATURED_LIMIT environment variable is required");
}

// Parse ALLOWED_SOURCES from environment variable
// Expected format: '["source1", "source2", ...]'
const ALLOWED_SOURCES = JSON.parse(process.env.ALLOWED_SOURCES || "[]");
if (!Array.isArray(ALLOWED_SOURCES) || ALLOWED_SOURCES.length === 0) {
  throw new Error("ALLOWED_SOURCES must be a non-empty array");
}
// Validate each source in ALLOWED_SOURCES
ALLOWED_SOURCES.forEach((src) => {
  if (typeof src !== "string" || src.trim() === "") {
    throw new Error(`Invalid source in ALLOWED_SOURCES: ${src}`);
  }
});

// Parse FEATURED_LIMIT from environment variable
const FEATURED_LIMIT = parseInt(process.env.FEATURED_LIMIT, 10) || 3;

// Validate FEATURED_LIMIT
if (isNaN(FEATURED_LIMIT) || FEATURED_LIMIT <= 0)
  throw new Error("FEATURED_LIMIT must be a positive integer");

if (!process.env.MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS) {
  throw new Error(
    "MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS environment variable is required"
  );
}

if (!process.env.MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED) {
  throw new Error(
    "MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED environment variable is required"
  );
}

const MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS = parseInt(
  process.env.MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS,
  10
);

if (
  isNaN(MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS) ||
  MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS <= 0
) {
  throw new Error(
    "MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS must be a positive integer"
  );
}

const MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED = parseInt(
  process.env.MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED,
  10
);

if (
  isNaN(MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED) ||
  MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED <= 0
) {
  throw new Error(
    "MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED must be a positive integer"
  );
}

export default {
  ALLOWED_SOURCES,
  FEATURED_LIMIT,
  MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS,
  MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED,
};
