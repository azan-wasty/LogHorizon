const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Public: Get reviews for a title
router.get("/content/:contentId", reviewController.getContentReviews);

// Private: Add/Update a review
router.post("/", authMiddleware, reviewController.addReview);

module.exports = router;
