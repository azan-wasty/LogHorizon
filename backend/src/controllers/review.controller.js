const prisma = require("../prismaClient");
const activityService = require("../services/ActivityService");

/**
 * POST /api/reviews
 */
async function addReview(req, res) {
    try {
        const userId = req.user.id;
        const { contentId, rating, comment } = req.body;

        if (!contentId || !rating) {
            return res.status(400).json({ ok: false, message: "contentId and rating required" });
        }

        const existing = await prisma.review.findUnique({
        where: { userId_contentId: { userId, contentId } }
    });

    const review = await prisma.review.upsert({
        where: {
            userId_contentId: { userId, contentId }
        },
        update: { rating: parseInt(rating), comment },
        create: { userId, contentId, rating: parseInt(rating), comment }
    });

    // Only log a fresh REVIEWED activity for new reviews, not every edit.
    if (!existing) {
        await activityService.log(userId, "REVIEWED", contentId, parseInt(rating), comment);
    }

    return res.json({ ok: true, review });
    } catch (err) {
        console.error("addReview error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/reviews/content/:contentId
 */
async function getContentReviews(req, res) {
    try {
        const contentId = parseInt(req.params.contentId);
        const reviews = await prisma.review.findMany({
            where: { contentId },
            include: {
                user: {
                    select: { username: true, avatarUrl: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Calculate average
        const aggregate = await prisma.review.aggregate({
            where: { contentId },
            _avg: { rating: true },
            _count: { rating: true }
        });

        return res.json({
            ok: true,
            reviews,
            averageRating: aggregate._avg.rating || 0,
            reviewCount: aggregate._count.rating || 0
        });
    } catch (err) {
        console.error("getContentReviews error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = {
    addReview,
    getContentReviews
};
