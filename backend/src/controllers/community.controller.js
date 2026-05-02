const prisma = require("../prismaClient");

/**
 * GET /api/users/search?q=username
 * Public user search — no auth required.
 */
async function searchUsers(req, res) {
    try {
        const q = (req.query.q || "").trim();

        if (!q) {
            // Empty query → return top contributors sorted by completed count
            const users = await prisma.user.findMany({
                take: 6,
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    bio: true,
                    role: true,
                    library: {
                        select: { status: true },
                    },
                },
            });

            const formatted = users
                .map(formatUser)
                .sort((a, b) => b.stats.completed - a.stats.completed)
                .slice(0, 6);

            return res.status(200).json({ ok: true, users: formatted, isTopContributors: true });
        }

        const users = await prisma.user.findMany({
            where: {
                username: { contains: q },
            },
            take: 20,
            select: {
                id: true,
                username: true,
                avatarUrl: true,
                bio: true,
                role: true,
                library: {
                    select: { status: true },
                },
            },
        });

        return res.status(200).json({ ok: true, users: users.map(formatUser), isTopContributors: false });
    } catch (err) {
        console.error("searchUsers error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/users/:id/profile
 * Public profile view — no auth required.
 */
async function getUserProfile(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
                bio: true,
                role: true,
                library: {
                    select: {
                        status: true,
                        rating: true,
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
                },
            },
        });

        if (!user) return res.status(404).json({ ok: false, message: "user not found" });

        const completed = user.library.filter(e => e.status === "COMPLETED");
        const current = user.library.filter(e => e.status === "CURRENT");

        return res.status(200).json({
            ok: true,
            user: {
                id: user.id,
                username: user.username,
                avatarUrl: user.avatarUrl,
                bio: user.bio,
                role: user.role,
                stats: {
                    completed: completed.length,
                    total: user.library.length,
                    current: current.length,
                },
                completed: completed.map(e => e.content),
                current: current.map(e => e.content),
            },
        });
    } catch (err) {
        console.error("getUserProfile error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

// ─── helpers ────────────────────────────────────────────────────
function formatUser(user) {
    const completed = user.library.filter(e => e.status === "COMPLETED").length;
    const current = user.library.filter(e => e.status === "CURRENT").length;
    return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        stats: { completed, current, total: user.library.length },
    };
}

module.exports = { searchUsers, getUserProfile };