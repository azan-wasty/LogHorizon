const activityService = require("../services/ActivityService");

/**
 * GET /api/activity/feed?limit=20&offset=0
 * Auth required. Own activity + activity from everyone the user follows.
 */
async function getFeed(req, res) {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
        const offset = parseInt(req.query.offset, 10) || 0;

        const { activities, total, hasMore } = await activityService.getFeed(userId, { limit, offset });
        return res.json({ ok: true, activities, total, hasMore });
    } catch (err) {
        console.error("getFeed error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = { getFeed };