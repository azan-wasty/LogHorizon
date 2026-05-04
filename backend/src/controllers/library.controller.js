const prisma = require("../prismaClient");
const achievementsService = require("../services/AchievementsService");

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
        const { contentId, status, rating } = req.body;

        if (!contentId || !status) {
            return res.status(400).json({ ok: false, message: "contentId and status required" });
        }

        const libraryEntry = await prisma.userLibrary.upsert({
            where: {
                userId_contentId: { userId, contentId }
            },
            update: { status, rating: rating ? parseInt(rating) : null },
            create: { userId, contentId, status, rating: rating ? parseInt(rating) : null },
            include: { content: true }
        });

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
        let contentIds = new Set();
        contentIds.add(item.id);

        if (item.children.length > 0) {
            item.children.forEach(c => contentIds.add(c.id));
        }

        if (item.parent) {
            contentIds.add(item.parent.id);
            item.parent.children.forEach(c => contentIds.add(c.id));
        }

        const idsArray = Array.from(contentIds);

        // 3. Perform bulk upsert (Prisma doesn't have bulk upsert, so we use a loop or delete and create)
        // But for library, it's safer to loop or use updateMany if we don't care about create.
        // Actually, many might not exist in library yet.
        
        await Promise.all(idsArray.map(cid => 
            prisma.userLibrary.upsert({
                where: { userId_contentId: { userId, contentId: cid } },
                update: { status: "COMPLETED" },
                create: { userId, contentId: cid, status: "COMPLETED" }
            })
        ));

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
