const prisma = require("../prismaClient");

/**
 * POST /api/subreddit-recommendations
 * User recommends a subreddit for a specific content.
 * Body: { contentId, subreddit }
 */
async function createSubredditRecommendation(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const { contentId, subreddit } = req.body || {};

        if (!contentId || !Number.isInteger(Number(contentId))) {
            return res.status(400).json({ ok: false, message: "invalid contentId" });
        }
        if (!subreddit || typeof subreddit !== "string" || subreddit.trim() === "") {
            return res.status(400).json({ ok: false, message: "invalid subreddit" });
        }

        // Ensure user hasn't already submitted a recommendation for this content
        const existing = await prisma.subredditRecommendation.findUnique({
            where: {
                userId_contentId: {
                    userId,
                    contentId: Number(contentId),
                },
            },
        });

        if (existing) {
            return res.status(409).json({ ok: false, message: "You have already recommended a subreddit for this show." });
        }

        // Ensure content exists
        const content = await prisma.content.findUnique({ where: { id: Number(contentId) } });
        if (!content) {
            return res.status(404).json({ ok: false, message: "content not found" });
        }

        const recommendation = await prisma.subredditRecommendation.create({
            data: {
                userId,
                contentId: Number(contentId),
                subreddit: subreddit.trim().replace(/^r\//, ""), // Remove r/ if present
                status: "PENDING",
            },
        });

        return res.status(201).json({ ok: true, recommendation });
    } catch (err) {
        console.error("createSubredditRecommendation error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/admin/subreddit-recommendations
 * Admin lists all pending subreddit recommendations.
 */
async function listSubredditRecommendations(req, res) {
    try {
        const { status } = req.query;
        const where = {};
        if (status) {
            where.status = status;
        }

        const recommendations = await prisma.subredditRecommendation.findMany({
            where,
            include: {
                user: { select: { id: true, username: true, email: true } },
                content: { select: { id: true, title: true, category: true, coverImage: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ ok: true, recommendations });
    } catch (err) {
        console.error("listSubredditRecommendations error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * PUT /api/admin/subreddit-recommendations/:id
 * Admin approves or rejects a subreddit recommendation.
 * Body: { status: "APPROVED" | "REJECTED" }
 */
async function updateSubredditRecommendationStatus(req, res) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        if (status !== "APPROVED" && status !== "REJECTED") {
            return res.status(400).json({ ok: false, message: "status must be APPROVED or REJECTED" });
        }

        const existing = await prisma.subredditRecommendation.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ ok: false, message: "recommendation not found" });
        }

        if (existing.status !== "PENDING") {
            return res.status(400).json({ ok: false, message: "only pending recommendations can be updated" });
        }

        let updatedRecommendation;
        
        if (status === "APPROVED") {
            await prisma.$transaction(async (tx) => {
                updatedRecommendation = await tx.subredditRecommendation.update({
                    where: { id },
                    data: { status },
                });

                // Format the link properly
                const redditUrl = existing.subreddit.startsWith("http") 
                    ? existing.subreddit 
                    : `https://reddit.com/r/${existing.subreddit}`;

                await tx.content.update({
                    where: { id: existing.contentId },
                    data: { redditLink: redditUrl },
                });
            });
        } else {
            updatedRecommendation = await prisma.subredditRecommendation.update({
                where: { id },
                data: { status },
            });
        }

        return res.status(200).json({ ok: true, recommendation: updatedRecommendation });
    } catch (err) {
        console.error("updateSubredditRecommendationStatus error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = {
    createSubredditRecommendation,
    listSubredditRecommendations,
    updateSubredditRecommendationStatus,
};
