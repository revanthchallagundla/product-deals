/*
Purpose of this class : Handle API routes for autocomplete and deals
This module defines the API endpoints for product autocomplete search and fetching product deals.
Dependencies : Express.js for routing, controllers for handling requests.
Author : Nuthan M
Created Date : 2025-July-03
*/

import { Router } from "express";
const router = Router();

import { getAutocompleteResults } from "../controllers/autocompleteController.js";
import {
  getProductDeals,
  // Todo: getBestDeals,
} from "../controllers/dealsController.js";

// This is used to fetch autocomplete results for product search
// It is used in the search bar to provide suggestions as the user types
router.get("/autocomplete", getAutocompleteResults);

// This is used to fetch product suggestions based on user input
// It is used in the search bar to provide suggestions as the user types
router.post("/deals", getProductDeals);

// We use this to fetch best deals from the database
// This is used to display the best deals on the homepage
// Todo: router.get("/deals/best", getBestDeals);

export default router;
