const prisma = require("../prismaClient");
const achievementsService = require("../services/AchievementsService");
const activityService = require("../services/ActivityService");

const ACTIVITY_TYPE_BY_STATUS = {
    CURRENT: "WATCHING",
    COMPLETED: "COMPLETED",
    PLANNING: "PLANNING",
    DROPPED: "DROPPED",
};

/**
 * GET /api/library
 * Fetch the user's library with content details.
 */
async function getMyLibrary(req, res) {
    try {
        const userId = req.user.id;
        const library = await prisma.userLibrary.findMany({
            where: { userId },
            include: { content: true }
        });
        return res.json({ ok: true, library });
    } catch (err) {
        console.error("getMyLibrary error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/library/update
 * Body: { contentId, status, rating }
 * status can be "PLANNING", "COMPLETED", "CURRENT", "DROPPED"
 */
async function updateLibrary(req, res) {
    try {
        const userId = req.user.id;
        const { contentId, status, rating, progress } = req.body;

        if (!contentId || !status) {
            return res.status(400).json({ ok: false, message: "contentId and status required" });
        }

        const cid = parseInt(contentId, 10);
        let parsedProgress = progress !== undefined && progress !== null ? parseInt(progress, 10) : undefined;
        if (parsedProgress !== undefined && (isNaN(parsedProgress) || parsedProgress < 0)) {
            parsedProgress = 0;
        }

        // Fetch the previous entry (to detect real transitions) and the content
        // (to auto-fill progress to "all episodes/chapters watched" on completion).
        const [existingEntry, contentItem] = await Promise.all([
            prisma.userLibrary.findUnique({ where: { userId_contentId: { userId, contentId: cid } } }),
            prisma.content.findUnique({ where: { id: cid }, select: { category: true, totalEpisodes: true, totalChapters: true } }),
        ]);

        // Marking something COMPLETED implies every episode/chapter has been watched/read,
        // so fill progress up to the total unless the caller explicitly sent a higher value.
        if (status === "COMPLETED" && contentItem) {
            const total = contentItem.category === "Manga" || contentItem.category === "LightNovel"
                ? contentItem.totalChapters
                : contentItem.totalEpisodes;
            if (total && (parsedProgress === undefined || parsedProgress < total)) {
                parsedProgress = total;
            }
        }

        const updateData = {
            status,
            rating: rating !== undefined && rating !== null ? parseInt(rating, 10) : null
        };
        if (parsedProgress !== undefined) {
            updateData.progress = parsedProgress;
        }

        const createData = {
            userId,
            contentId: cid,
            status,
            rating: rating !== undefined && rating !== null ? parseInt(rating, 10) : null,
            progress: parsedProgress !== undefined ? parsedProgress : 0
        };

        const libraryEntry = await prisma.userLibrary.upsert({
            where: {
                userId_contentId: { userId, contentId: cid }
            },
            update: updateData,
            create: createData,
            include: { content: true }
        });

        // Log activity only on real transitions, not on every +1 progress tick.
        if (!existingEntry || existingEntry.status !== status) {
            const activityType = ACTIVITY_TYPE_BY_STATUS[status];
            if (activityType) await activityService.log(userId, activityType, cid);
        }
        const newRating = updateData.rating;
        if (newRating !== null && newRating !== undefined && (!existingEntry || existingEntry.rating !== newRating)) {
            await activityService.log(userId, "RATED", cid, newRating);
        }

        // Check and assign any newly unlocked achievements
        const newUnlocks = await achievementsService.checkAchievements(userId);

        return res.json({ ok: true, entry: libraryEntry, newUnlocks });
    } catch (err) {
        console.error("updateLibrary error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * DELETE /api/library/:contentId
 * Remove an item from the library.
 */
async function removeFromLibrary(req, res) {
    try {
        const userId = req.user.id;
        const contentId = parseInt(req.params.contentId);

        await prisma.userLibrary.deleteMany({
            where: { userId, contentId }
        });

        return res.json({ ok: true, message: "Removed from library" });
    } catch (err) {
        console.error("removeFromLibrary error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/library/mark-all-completed
 * Body: { contentId }
 */
async function markAllCompleted(req, res) {
    try {
        const userId = req.user.id;
        const { contentId } = req.body;

        if (!contentId) {
            return res.status(400).json({ ok: false, message: "contentId required" });
        }

        // 1. Get the content item
        const item = await prisma.content.findUnique({
            where: { id: contentId },
            include: { children: true, parent: { include: { children: true } } }
        });

        if (!item) return res.status(404).json({ ok: false, message: "content not found" });

        // 2. Determine all related content to mark completed
        // If it has children, mark all children + self.
        // If it has a parent, mark the parent + all its children.
        let contentMap = new Map();
        contentMap.set(item.id, item);

        if (item.children.length > 0) {
            item.children.forEach(c => contentMap.set(c.id, c));
        }

        if (item.parent) {
            contentMap.set(item.parent.id, item.parent);
            item.parent.children.forEach(c => contentMap.set(c.id, c));
        }

        const idsArray = Array.from(contentMap.keys());

        // Every episode/chapter counts as watched when a series is marked completed, so
        // fill progress to the content's total instead of leaving it at 0.
        await Promise.all(idsArray.map(cid => {
            const c = contentMap.get(cid);
            const total = c.category === "Manga" || c.category === "LightNovel" ? c.totalChapters : c.totalEpisodes;
            const progress = total || 0;
            return prisma.userLibrary.upsert({
                where: { userId_contentId: { userId, contentId: cid } },
                update: { status: "COMPLETED", progress },
                create: { userId, contentId: cid, status: "COMPLETED", progress }
            });
        }));

        // Log a single activity entry for the item the user actually acted on.
        await activityService.log(userId, "COMPLETED", item.id);

        // 4. Trigger achievements check
        const newUnlocks = await achievementsService.checkAchievements(userId);

        return res.json({ ok: true, message: `Marked ${idsArray.length} items as completed`, newUnlocks });
    } catch (err) {
        console.error("markAllCompleted error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = {
    getMyLibrary,
    updateLibrary,
    removeFromLibrary,
    markAllCompleted
};
