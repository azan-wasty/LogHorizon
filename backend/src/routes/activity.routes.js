const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
    getFeed,
    getTrendingFeed,
    reactToActivity,
    getActivityComments,
    addActivityComment,
    deleteActivityComment,
} = require("../controllers/activity.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/feed", getFeed);
router.get("/trending", getTrendingFeed);
router.post("/:id/react", reactToActivity);
router.get("/:id/comments", getActivityComments);
router.post("/:id/comments", addActivityComment);
router.delete("/comments/:commentId", deleteActivityComment);

module.exports = router;