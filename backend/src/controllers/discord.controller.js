const prisma = require("../prismaClient");

/**
 * POST /api/discord-recommendations
 * User recommends a discord server for a specific content.
 * Body: { contentId, inviteLink }
 */
async function createDiscordRecommendation(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const { contentId, inviteLink } = req.body || {};

        if (!contentId || !Number.isInteger(Number(contentId))) {
            return res.status(400).json({ ok: false, message: "invalid contentId" });
        }
        if (!inviteLink || typeof inviteLink !== "string" || inviteLink.trim() === "") {
            return res.status(400).json({ ok: false, message: "invalid inviteLink" });
        }

        // Ensure user hasn't already submitted a recommendation for this content
        const existing = await prisma.discordRecommendation.findUnique({
            where: {
                userId_contentId: {
                    userId,
                    contentId: Number(contentId),
                },
            },
        });

        if (existing) {
            return res.status(409).json({ ok: false, message: "You have already recommended a link for this show." });
        }

        // Ensure content exists
        const content = await prisma.content.findUnique({ where: { id: Number(contentId) } });
        if (!content) {
            return res.status(404).json({ ok: false, message: "content not found" });
        }

        const recommendation = await prisma.discordRecommendation.create({
            data: {
                userId,
                contentId: Number(contentId),
                inviteLink: inviteLink.trim(),
                status: "PENDING",
            },
        });

        return res.status(201).json({ ok: true, recommendation });
    } catch (err) {
        console.error("createDiscordRecommendation error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/admin/discord-recommendations
 * Admin lists all pending discord recommendations.
 * Optional query: ?status=PENDING
 */
async function listDiscordRecommendations(req, res) {
    try {
        const { status } = req.query;
        const where = {};
        if (status) {
            where.status = status;
        }

        const recommendations = await prisma.discordRecommendation.findMany({
            where,
            include: {
                user: { select: { id: true, username: true, email: true } },
                content: { select: { id: true, title: true, category: true, coverImage: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ ok: true, recommendations });
    } catch (err) {
        console.error("listDiscordRecommendations error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * PUT /api/admin/discord-recommendations/:id
 * Admin approves or rejects a discord recommendation.
 * Body: { status: "APPROVED" | "REJECTED" }
 */
async function updateDiscordRecommendationStatus(req, res) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body || {};

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        if (status !== "APPROVED" && status !== "REJECTED") {
            return res.status(400).json({ ok: false, message: "status must be APPROVED or REJECTED" });
        }

        const existing = await prisma.discordRecommendation.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ ok: false, message: "recommendation not found" });
        }

        if (existing.status !== "PENDING") {
            return res.status(400).json({ ok: false, message: "only pending recommendations can be updated" });
        }

        // Transaction to update recommendation and content (if approved)
        let updatedRecommendation;
        
        if (status === "APPROVED") {
            await prisma.$transaction(async (tx) => {
                updatedRecommendation = await tx.discordRecommendation.update({
                    where: { id },
                    data: { status },
                });

                await tx.content.update({
                    where: { id: existing.contentId },
                    data: { discordLink: existing.inviteLink },
                });
            });
        } else {
            updatedRecommendation = await prisma.discordRecommendation.update({
                where: { id },
                data: { status },
            });
        }

        return res.status(200).json({ ok: true, recommendation: updatedRecommendation });
    } catch (err) {
        console.error("updateDiscordRecommendationStatus error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = {
    createDiscordRecommendation,
    listDiscordRecommendations,
    updateDiscordRecommendationStatus,
};
