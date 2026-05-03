const prisma = require("../prismaClient");
const achievementsService = require("../services/AchievementsService");

/**
 * GET /api/favourites
 * Auth required. Returns the current user's favourites with content details.
 */
async function getMyFavourites(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const favourites = await prisma.favourite.findMany({
            where: { userId },
            include: {
                content: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        coverImage: true,
                        rating: true,
                        description: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ ok: true, favourites });
    } catch (err) {
        console.error("getMyFavourites error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/favourites
 * Auth required. Body: { contentId }
 */
async function addFavourite(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const { contentId } = req.body || {};
        if (!contentId) return res.status(400).json({ ok: false, message: "contentId is required" });

        // Check if content exists
        const content = await prisma.content.findUnique({ where: { id: contentId } });
        if (!content) return res.status(404).json({ ok: false, message: "content not found" });

        // Check if already favourited
        const existing = await prisma.favourite.findUnique({
            where: { userId_contentId: { userId, contentId } },
        });
        if (existing) return res.status(409).json({ ok: false, message: "already in favourites" });

        const favourite = await prisma.favourite.create({
            data: { userId, contentId },
            include: {
                content: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        coverImage: true,
                        rating: true,
                        description: true,
                    },
                },
            },
        });

        // Check DEDICATED_FAN achievement (5 favourites)
        const count = await prisma.favourite.count({ where: { userId } });
        if (count >= 5) {
            await achievementsService.checkSingleAchievement(userId, "DEDICATED_FAN");
        }

        return res.status(201).json({ ok: true, favourite });
    } catch (err) {
        console.error("addFavourite error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * DELETE /api/favourites/:contentId
 * Auth required. Remove from favourites.
 */
async function removeFavourite(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const contentId = Number(req.params.contentId);
        if (!Number.isInteger(contentId) || contentId <= 0) {
            return res.status(400).json({ ok: false, message: "invalid contentId" });
        }

        await prisma.favourite.delete({
            where: { userId_contentId: { userId, contentId } },
        });

        return res.status(200).json({ ok: true, message: "removed from favourites" });
    } catch (err) {
        console.error("removeFavourite error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/users/:id/favourites
 * Public - get a user's favourites for profile view.
 */
async function getUserFavourites(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const favourites = await prisma.favourite.findMany({
            where: { userId: id },
            include: {
                content: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        coverImage: true,
                        rating: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 12,
        });

        return res.status(200).json({ ok: true, favourites });
    } catch (err) {
        console.error("getUserFavourites error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = { getMyFavourites, addFavourite, removeFavourite, getUserFavourites };
