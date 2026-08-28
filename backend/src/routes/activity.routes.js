const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
    getFeed,
    reactToActivity,
    getActivityComments,
    addActivityComment,
    deleteActivityComment,
} = require("../controllers/activity.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/feed", getFeed);
router.post("/:id/react", reactToActivity);
router.get("/:id/comments", getActivityComments);
router.post("/:id/comments", addActivityComment);
router.delete("/comments/:commentId", deleteActivityComment);

module.exports = router;