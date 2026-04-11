const prisma = require("../prismaClient");

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

        return res.json({ ok: true, entry: libraryEntry });
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

        await prisma.userLibrary.delete({
            where: {
                userId_contentId: { userId, contentId }
            }
        });

        return res.json({ ok: true, message: "Removed from library" });
    } catch (err) {
        console.error("removeFromLibrary error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = {
    getMyLibrary,
    updateLibrary,
    removeFromLibrary
};
