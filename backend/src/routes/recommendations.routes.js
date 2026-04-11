const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { getRecommendations, getRecommendationStats } = require("../controllers/recommendations.controller");

const router = express.Router();

// Both routes require a valid JWT
router.get("/", requireAuth, getRecommendations);
router.get("/stats", requireAuth, getRecommendationStats);

module.exports = router;