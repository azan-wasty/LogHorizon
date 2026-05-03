const express = require("express");
const router = express.Router();
const subredditController = require("../controllers/subreddit.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

// Public (authenticated) user routes
router.post("/", requireAuth, subredditController.createSubredditRecommendation);

// Admin routes
router.get("/admin", requireAuth, requireAdmin, subredditController.listSubredditRecommendations);
router.put("/admin/:id", requireAuth, requireAdmin, subredditController.updateSubredditRecommendationStatus);

module.exports = router;
