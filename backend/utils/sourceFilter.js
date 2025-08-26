/*
Purpose of this class : Handle source filtering functionality
This module provides functions to sanitize source names, check allowed sources, and filter items based on allowed sources.
Dependencies : None
Author : Nuthan M
Created Date : 2025-July-03
*/

// sanitization function to normalize source names
// Ensure the input is a string, then convert to lowercase and remove non-alphanumeric characters
function sanitize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/gi, "");
}

// Function to get allowed sources from environment variable
// Parses the ALLOWED_SOURCES environment variable, which should be a JSON array of allowed source
function getAllowedSources() {
  try {
    return JSON.parse(process.env.ALLOWED_SOURCES || "[]");
  } catch (e) {
    console.error("❌ Failed to parse ALLOWED_SOURCES:", e);
    return [];
  }
}

// Function to check if an item is from an allowed source
// It checks if the item's source or product link matches any of the allowed sources.
function isAllowedSource(item) {
  const allowedSources = getAllowedSources();
  const sourceSanitized = sanitize(item.source);

  // If no source is provided, we consider it not allowed
  const linkSanitized = sanitize(item.product_link || item.link || "");

  return allowedSources.some(
    (allowed) =>
      sourceSanitized.includes(sanitize(allowed)) ||
      linkSanitized.includes(sanitize(allowed))
  );
}

// Function to filter items based on allowed sources
// It returns a new array containing only items that are from allowed sources.
function filterByAllowedSources(items) {
  return items.filter(isAllowedSource);
}

// Exporting the functions for use in other modules
// This allows other parts of the application to use these utility functions.
export default {
  sanitize,
  getAllowedSources,
  isAllowedSource,
  filterByAllowedSources,
};
