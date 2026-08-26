const prisma = require("../prismaClient");

const USER_SELECT = {
    id: true,
    username: true,
    avatarUrl: true,
    bio: true,
    role: true,
};

/**
 * GET /api/friends
 * Auth required. List of people the current user follows.
 */
async function getMyFriends(req, res) {
    try {
        const userId = req.user.id;
        const rows = await prisma.friendship.findMany({
            where: { followerId: userId },
            include: { following: { select: USER_SELECT } },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ ok: true, friends: rows.map(r => r.following) });
    } catch (err) {
        console.error("getMyFriends error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/friends/:userId
 * Auth required. Add someone as a friend (simple one-directional follow).
 */
async function addFriend(req, res) {
    try {
        const userId = req.user.id;
        const targetId = Number(req.params.userId);

        if (!Number.isInteger(targetId) || targetId <= 0) {
            return res.status(400).json({ ok: false, message: "invalid userId" });
        }
        if (targetId === userId) {
            return res.status(400).json({ ok: false, message: "cannot add yourself" });
        }

        const target = await prisma.user.findUnique({ where: { id: targetId } });
        if (!target) return res.status(404).json({ ok: false, message: "user not found" });

        const existing = await prisma.friendship.findUnique({
            where: { followerId_followingId: { followerId: userId, followingId: targetId } },
        });
        if (existing) return res.status(409).json({ ok: false, message: "already added" });

        await prisma.friendship.create({
            data: { followerId: userId, followingId: targetId },
        });

        return res.status(201).json({ ok: true, message: "friend added" });
    } catch (err) {
        console.error("addFriend error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * DELETE /api/friends/:userId
 * Auth required. Remove a friend.
 */
async function removeFriend(req, res) {
    try {
        const userId = req.user.id;
        const targetId = Number(req.params.userId);
        if (!Number.isInteger(targetId) || targetId <= 0) {
            return res.status(400).json({ ok: false, message: "invalid userId" });
        }

        await prisma.friendship.deleteMany({
            where: { followerId: userId, followingId: targetId },
        });

        return res.json({ ok: true, message: "friend removed" });
    } catch (err) {
        console.error("removeFriend error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = { getMyFriends, addFriend, removeFriend };