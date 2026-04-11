const prisma = require("../prismaClient");

/**
 * Weighted scoring by preference type:
 *   Genre  → 3 pts
 *   Mood   → 2 pts
 *   Theme  → 1 pt
 *
 * Bridge logic:
 *   UserPreference → PreferenceOption (type + value)
 *   Content        → ContentTag → Tag (type + name)
 *   Match when: preferenceOption.type === tag.type AND preferenceOption.value === tag.name
 */
const WEIGHTS = {
    Genre: 3,
    Mood: 2,
    Theme: 1,
};

/**
 * GET /api/recommendations
 * Returns content ranked by weighted tag overlap with the user's preference options.
 * Query params:
 *   limit  (default 20, max 50)
 *   offset (default 0)
 */
async function getRecommendations(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        // ── 1. Fetch user's preference options ──
        const userPrefs = await prisma.userPreference.findMany({
            where: { userId },
            include: { option: true },
        });

        // Fallback: no preferences set → return latest content
        if (userPrefs.length === 0) {
            const [fallback, total] = await Promise.all([
                prisma.content.findMany({
                    orderBy: { createdAt: "desc" },
                    take: limit,
                    skip: offset,
                    include: { tags: { include: { tag: true } } },
                }),
                prisma.content.count(),
            ]);
            return res.status(200).json({
                ok: true,
                recommendations: fallback.map(formatContent),
                explore: [],
                total,
                hasPreferences: false,
                message: "No preferences set — showing latest content",
            });
        }

        // Build a list of (type, value, weight) signals from the user's preferences
        const prefSignals = userPrefs
            .filter(p => p.option)
            .map(p => ({
                type: p.option.type,
                value: p.option.value,
                weight: WEIGHTS[p.option.type] ?? 1,
            }));

        // ── 2. Fetch all content with their tags ──
        const allContent = await prisma.content.findMany({
            include: { tags: { include: { tag: true } } },
        });

        // ── 3. Score each content item ──
        const scored = allContent.map(item => {
            let score = 0;
            const matchedTags = [];

            for (const ct of item.tags) {
                const tag = ct.tag;
                if (!tag) continue;

                const signal = prefSignals.find(
                    s => s.type === tag.type && s.value === tag.name
                );

                if (signal) {
                    score += signal.weight;
                    matchedTags.push({ ...tag, weight: signal.weight });
                }
            }

            return {
                ...formatContent(item),
                _score: score,
                _matchedTags: matchedTags,
            };
        });

        // ── 4. Sort: score desc, then rating desc as tiebreaker ──
        scored.sort((a, b) => {
            if (b._score !== a._score) return b._score - a._score;
            return (b.rating ?? 0) - (a.rating ?? 0);
        });

        const forYou = scored.filter(c => c._score > 0);
        const explore = scored
            .filter(c => c._score === 0)
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            .slice(0, 10);

        const total = forYou.length;
        const paginated = forYou.slice(offset, offset + limit);

        return res.status(200).json({
            ok: true,
            recommendations: paginated,
            explore,
            total,
            hasPreferences: true,
            preferenceCount: userPrefs.length,
        });
    } catch (err) {
        console.error("getRecommendations error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/recommendations/stats
 * Returns match counts by category for the dashboard overview widgets.
 */
async function getRecommendationStats(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const userPrefs = await prisma.userPreference.findMany({
            where: { userId },
            include: { option: true },
        });

        if (userPrefs.length === 0) {
            return res.status(200).json({
                ok: true,
                stats: {},
                topGenres: [],
                matchRate: 0,
                hasPreferences: false,
            });
        }

        const prefSignals = userPrefs
            .filter(p => p.option)
            .map(p => ({ type: p.option.type, value: p.option.value }));

        const contentWithTags = await prisma.content.findMany({
            include: { tags: { include: { tag: true } } },
        });

        const categoryStats = {};
        let totalItems = 0;
        let matchedItems = 0;

        for (const item of contentWithTags) {
            totalItems++;
            const hasMatch = item.tags.some(ct =>
                ct.tag &&
                prefSignals.some(s => s.type === ct.tag.type && s.value === ct.tag.name)
            );
            if (hasMatch) {
                matchedItems++;
                categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
            }
        }

        const topGenres = userPrefs
            .filter(p => p.option?.type === "Genre")
            .map(p => p.option.value);

        return res.status(200).json({
            ok: true,
            stats: categoryStats,
            topGenres,
            matchRate: totalItems
                ? Math.round((matchedItems / totalItems) * 100)
                : 0,
            hasPreferences: true,
        });
    } catch (err) {
        console.error("getRecommendationStats error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

function formatContent(item) {
    return {
        ...item,
        tags: item.tags?.map(ct => ct.tag).filter(Boolean) || [],
    };
}

module.exports = { getRecommendations, getRecommendationStats };