const activityService = require("../services/ActivityService");

/**
 * GET /api/activity/feed?scope=all&type=ALL&limit=20&offset=0
 * Auth required. Returns activity feed with reactions and comments summary.
 */
async function getFeed(req, res) {
    try {
        const userId = req.user.id;
        const scope = (req.query.scope || "all").toLowerCase();
        const type = req.query.type || null;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
        const offset = parseInt(req.query.offset, 10) || 0;

        const result = await activityService.getFeed(userId, { scope, type, limit, offset });
        return res.json({ ok: true, ...result });
    } catch (err) {
        console.error("getFeed error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/activity/:id/react
 * Auth required. Body: { emoji }
 */
async function reactToActivity(req, res) {
    try {
        const userId = req.user.id;
        const activityId = Number(req.params.id);
        const { emoji } = req.body || {};

        if (!Number.isInteger(activityId) || activityId <= 0) {
            return res.status(400).json({ ok: false, message: "invalid activityId" });
        }

        const result = await activityService.toggleReaction(activityId, userId, emoji || "❤️");
        return res.json({ ok: true, ...result });
    } catch (err) {
        console.error("reactToActivity error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/activity/:id/comments
 * Auth required. Fetch all comments for an activity.
 */
async function getActivityComments(req, res) {
    try {
        const activityId = Number(req.params.id);
        if (!Number.isInteger(activityId) || activityId <= 0) {
            return res.status(400).json({ ok: false, message: "invalid activityId" });
        }

        const comments = await activityService.getComments(activityId);
        return res.json({ ok: true, comments });
    } catch (err) {
        console.error("getActivityComments error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/activity/:id/comments
 * Auth required. Body: { text }
 */
async function addActivityComment(req, res) {
    try {
        const userId = req.user.id;
        const activityId = Number(req.params.id);
        const { text } = req.body || {};

        if (!Number.isInteger(activityId) || activityId <= 0) {
            return res.status(400).json({ ok: false, message: "invalid activityId" });
        }
        if (!text || typeof text !== "string" || !text.trim()) {
            return res.status(400).json({ ok: false, message: "comment text is required" });
        }

        const result = await activityService.addComment(activityId, userId, text);
        return res.status(201).json({ ok: true, ...result });
    } catch (err) {
        console.error("addActivityComment error:", err);
        return res.status(500).json({ ok: false, message: err.message || "internal server error" });
    }
}

/**
 * DELETE /api/activity/comments/:commentId
 * Auth required. Delete a comment (by owner or admin).
 */
async function deleteActivityComment(req, res) {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role?.toUpperCase() === "ADMIN";
        const commentId = Number(req.params.commentId);

        if (!Number.isInteger(commentId) || commentId <= 0) {
            return res.status(400).json({ ok: false, message: "invalid commentId" });
        }

        const result = await activityService.deleteComment(commentId, userId, isAdmin);
        return res.json({ ok: true, ...result });
    } catch (err) {
        console.error("deleteActivityComment error:", err);
        return res.status(err.message === "Unauthorized to delete this comment" ? 403 : 500).json({
            ok: false,
            message: err.message || "internal server error"
        });
    }
}

module.exports = {
    getFeed,
    reactToActivity,
    getActivityComments,
    addActivityComment,
    deleteActivityComment,
};