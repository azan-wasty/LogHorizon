const prisma = require("../prismaClient");

const CONTENT_SELECT = {
    id: true,
    title: true,
    category: true,
    coverImage: true,
    bannerImage: true,
    rating: true,
    description: true,
    status: true,
    totalEpisodes: true,
    totalChapters: true,
};

const USER_SELECT = {
    id: true,
    username: true,
    avatarUrl: true,
    role: true,
    bio: true,
};

/**
 * Record an activity entry. Fire-and-forget from callers' perspective.
 */
async function log(userId, type, contentId = null, rating = null, comment = null) {
    try {
        return await prisma.activity.create({
            data: {
                userId,
                type,
                contentId: contentId ? Number(contentId) : null,
                rating: rating !== null && rating !== undefined ? Number(rating) : null,
                comment: comment || null,
            },
        });
    } catch (err) {
        console.error("ActivityService.log error:", err);
        return null;
    }
}

/**
 * Backfill initial activities from userLibrary, favourites, and reviews if the Activity table is empty.
 */
async function ensureSampleActivities() {
    try {
        const count = await prisma.activity.count();
        if (count === 0) {
            console.log("Backfilling sample activities from existing database records...");

            // Pull reviews first (with comments)
            const reviews = await prisma.review.findMany({ take: 20, orderBy: { createdAt: "desc" } });
            for (const rev of reviews) {
                await prisma.activity.create({
                    data: {
                        userId: rev.userId,
                        contentId: rev.contentId,
                        type: "REVIEWED",
                        rating: rev.rating,
                        comment: rev.comment,
                        createdAt: rev.createdAt,
                    }
                });
            }

            // Pull library items
            const libraryItems = await prisma.userLibrary.findMany({
                take: 30,
                orderBy: { updatedAt: "desc" },
            });
            for (const item of libraryItems) {
                const actType = item.status === "COMPLETED" ? "COMPLETED" : item.status === "CURRENT" ? "WATCHING" : "PLANNING";
                await prisma.activity.create({
                    data: {
                        userId: item.userId,
                        contentId: item.contentId,
                        type: actType,
                        rating: item.rating,
                        createdAt: item.updatedAt || item.createdAt,
                    }
                });
            }

            // Pull favourites
            const favs = await prisma.favourite.findMany({ take: 20, orderBy: { createdAt: "desc" } });
            for (const fav of favs) {
                await prisma.activity.create({
                    data: {
                        userId: fav.userId,
                        contentId: fav.contentId,
                        type: "FAVOURITED",
                        createdAt: fav.createdAt,
                    }
                });
            }
        }

        // Independently backfill RATED activities from existing ratings. This runs even when
        // general activities already exist, since older seed/backfill data predates the
        // Ratings feed filter and never created a distinct RATED-type activity row.
        const ratedActivityCount = await prisma.activity.count({ where: { type: "RATED" } });
        if (ratedActivityCount === 0) {
            const ratedItems = await prisma.userLibrary.findMany({
                where: { rating: { not: null } },
                take: 50,
                orderBy: { updatedAt: "desc" },
            });
            for (const item of ratedItems) {
                await prisma.activity.create({
                    data: {
                        userId: item.userId,
                        contentId: item.contentId,
                        type: "RATED",
                        rating: item.rating,
                        createdAt: item.updatedAt || item.createdAt,
                    }
                });
            }
        }
    } catch (err) {
        console.error("ensureSampleActivities error:", err);
    }
}

/**
 * Helper to format activity with reaction summary and comment counts
 */
function formatActivity(item, currentUserId) {
    const reactionCounts = {};
    const userReactions = [];

    (item.reactions || []).forEach(r => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        if (r.userId === currentUserId && !userReactions.includes(r.emoji)) {
            userReactions.push(r.emoji);
        }
    });

    return {
        id: item.id,
        userId: item.userId,
        contentId: item.contentId,
        type: item.type,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt,
        user: item.user,
        content: item.content,
        reactionCounts,
        userReactions,
        reactions: (item.reactions || []).map(r => ({
            id: r.id,
            emoji: r.emoji,
            userId: r.userId,
            username: r.user?.username,
        })),
        commentsCount: item._count?.comments ?? (item.comments ? item.comments.length : 0),
        recentComments: (item.comments || []).slice(0, 3).map(c => ({
            id: c.id,
            text: c.text,
            userId: c.userId,
            user: c.user,
            createdAt: c.createdAt,
        })),
    };
}

/**
 * Get feed with filtering (scope: 'all' | 'friends' | 'me', type: string)
 */
async function getFeed(userId, { scope = 'all', type = null, limit = 20, offset = 0 } = {}) {
    await ensureSampleActivities();

    let whereClause = {};

    if (scope === 'friends') {
        const following = await prisma.friendship.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const userIds = [userId, ...following.map(f => f.followingId)];
        whereClause.userId = { in: userIds };
    } else if (scope === 'me') {
        whereClause.userId = userId;
    }

    if (type && type !== 'ALL') {
        whereClause.type = type.toUpperCase();
    }

    const [activities, total] = await Promise.all([
        prisma.activity.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            skip: offset,
            take: limit,
            include: {
                user: { select: USER_SELECT },
                content: { select: CONTENT_SELECT },
                reactions: {
                    include: { user: { select: { id: true, username: true } } }
                },
                comments: {
                    take: 3,
                    orderBy: { createdAt: "desc" },
                    include: { user: { select: USER_SELECT } }
                },
                _count: {
                    select: { comments: true, reactions: true }
                }
            },
        }),
        prisma.activity.count({ where: whereClause }),
    ]);

    // Backfill review comments on any REVIEWED activity where activity.comment is missing
    const formattedActivities = await Promise.all(activities.map(async (a) => {
        if (a.type === 'REVIEWED' && !a.comment && a.contentId) {
            const rev = await prisma.review.findUnique({
                where: { userId_contentId: { userId: a.userId, contentId: a.contentId } }
            });
            if (rev && rev.comment) {
                a.comment = rev.comment;
            }
        }
        return formatActivity(a, userId);
    }));

    return {
        activities: formattedActivities,
        total,
        hasMore: offset + activities.length < total,
    };
}

/**
 * Toggle a reaction (like, love, fire, etc.) on an activity
 */
async function toggleReaction(activityId, userId, emoji) {
    const aid = Number(activityId);
    const uid = Number(userId);
    const cleanEmoji = (emoji || "❤️").trim();

    const existing = await prisma.activityReaction.findUnique({
        where: {
            activityId_userId_emoji: {
                activityId: aid,
                userId: uid,
                emoji: cleanEmoji,
            }
        }
    });

    let reacted = false;
    if (existing) {
        await prisma.activityReaction.delete({
            where: { id: existing.id }
        });
        reacted = false;
    } else {
        await prisma.activityReaction.create({
            data: {
                activityId: aid,
                userId: uid,
                emoji: cleanEmoji,
            }
        });
        reacted = true;
    }

    // Return updated reactions for this activity
    const reactions = await prisma.activityReaction.findMany({
        where: { activityId: aid },
        include: { user: { select: { id: true, username: true } } }
    });

    const reactionCounts = {};
    const userReactions = [];
    reactions.forEach(r => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        if (r.userId === uid && !userReactions.includes(r.emoji)) {
            userReactions.push(r.emoji);
        }
    });

    return {
        activityId: aid,
        reacted,
        emoji: cleanEmoji,
        reactionCounts,
        userReactions,
        reactions: reactions.map(r => ({ id: r.id, emoji: r.emoji, userId: r.userId, username: r.user?.username })),
    };
}

/**
 * Get all comments for an activity
 */
async function getComments(activityId) {
    const aid = Number(activityId);
    const comments = await prisma.activityComment.findMany({
        where: { activityId: aid },
        orderBy: { createdAt: "asc" },
        include: {
            user: { select: USER_SELECT }
        }
    });
    return comments;
}

/**
 * Add a comment to an activity
 */
async function addComment(activityId, userId, text) {
    const aid = Number(activityId);
    const uid = Number(userId);
    const trimmed = (text || "").trim();

    if (!trimmed) {
        throw new Error("Comment text cannot be empty");
    }

    const comment = await prisma.activityComment.create({
        data: {
            activityId: aid,
            userId: uid,
            text: trimmed,
        },
        include: {
            user: { select: USER_SELECT }
        }
    });

    const count = await prisma.activityComment.count({ where: { activityId: aid } });

    return { comment, totalComments: count };
}

/**
 * Delete a comment
 */
async function deleteComment(commentId, userId, isAdmin = false) {
    const cid = Number(commentId);
    const comment = await prisma.activityComment.findUnique({ where: { id: cid } });
    if (!comment) {
        return { deleted: false, message: "Comment not found" };
    }

    if (comment.userId !== userId && !isAdmin) {
        throw new Error("Unauthorized to delete this comment");
    }

    await prisma.activityComment.delete({ where: { id: cid } });
    return { deleted: true, activityId: comment.activityId };
}

module.exports = {
    log,
    getFeed,
    toggleReaction,
    getComments,
    addComment,
    deleteComment,
    ensureSampleActivities,
};