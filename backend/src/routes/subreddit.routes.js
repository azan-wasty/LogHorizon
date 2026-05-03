const express = require("express");
const router = express.Router();
const subredditController = require("../controllers/subreddit.controller");
const { authenticate, adminOnly } = require("../middleware/auth");

// Public (authenticated) user routes
router.post("/", authenticate, subredditController.createSubredditRecommendation);

// Admin routes
router.get("/admin", authenticate, adminOnly, subredditController.listSubredditRecommendations);
router.put("/admin/:id", authenticate, adminOnly, subredditController.updateSubredditRecommendationStatus);

module.exports = router;
