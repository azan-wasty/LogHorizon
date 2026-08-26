const prisma = require("../prismaClient");

const CONTENT_SELECT = {
    id: true,
    title: true,
    category: true,
    coverImage: true,
    rating: true,
};

const USER_SELECT = {
    id: true,
    username: true,
    avatarUrl: true,
};

/**
 * Record an activity entry. Fire-and-forget from callers' perspective —
 * failures here should never break the primary action (library update, etc).
 */
async function log(userId, type, contentId = null, rating = null) {
    try {
        return await prisma.activity.create({
            data: { userId, type, contentId: contentId || null, rating: rating ?? null },
        });
    } catch (err) {
        console.error("ActivityService.log error:", err);
        return null;
    }
}

/**
 * Feed = the user's own activity + activity from everyone they follow.
 */
async function getFeed(userId, { limit = 20, offset = 0 } = {}) {
    const following = await prisma.friendship.findMany({
        where: { followerId: userId },
        select: { followingId: true },
    });
    const userIds = [userId, ...following.map(f => f.followingId)];

    const [activities, total] = await Promise.all([
        prisma.activity.findMany({
            where: { userId: { in: userIds } },
            orderBy: { createdAt: "desc" },
            skip: offset,
            take: limit,
            include: {
                user: { select: USER_SELECT },
                content: { select: CONTENT_SELECT },
            },
        }),
        prisma.activity.count({ where: { userId: { in: userIds } } }),
    ]);

    return { activities, total, hasMore: offset + activities.length < total };
}

async function getUserActivity(userId, { limit = 20, offset = 0 } = {}) {
    const [activities, total] = await Promise.all([
        prisma.activity.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            skip: offset,
            take: limit,
            include: {
                user: { select: USER_SELECT },
                content: { select: CONTENT_SELECT },
            },
        }),
        prisma.activity.count({ where: { userId } }),
    ]);

    return { activities, total, hasMore: offset + activities.length < total };
}

module.exports = { log, getFeed, getUserActivity }