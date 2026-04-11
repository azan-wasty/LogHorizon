const prisma = require("../prismaClient");

/**
 * Weighted scoring by preference type:
 *   Genre  → 3 pts
 *   Mood   → 2 pts
 *   Theme  → 1 pt
 *
 * Additional scoring signals:
 *   - Freshness bonus: newer content gets a small boost
 *   - Rating bonus: higher-rated content gets a tiebreaker bonus
 *   - Category diversity: spread recommendations across categories
 *   - Library awareness: exclude already-completed items, boost items similar to library
 */
const WEIGHTS = {
    Genre: 3,
    Mood: 2,
    Theme: 1,
};

/**
 * GET /api/recommendations
 * Returns content ranked by weighted tag overlap + library-aware scoring.
 * Query params:
 *   limit    (default 20, max 50)
 *   offset   (default 0)
 *   category (optional filter, e.g. "Anime")
 */
async function getRecommendations(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const limit = Math.min(Number(req.query.limit) || 20, 50);
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        const categoryFilter = req.query.category || null;

        // ── 1. Fetch user's preference options ──
        const userPrefs = await prisma.userPreference.findMany({
            where: { userId },
            include: { PreferenceOption: true },
        });

        // ── 2. Fetch user library (to exclude completed, boost similar) ──
        const userLibrary = await prisma.userLibrary.findMany({
            where: { userId },
            include: { content: { include: { tags: { include: { tag: true } } } } },
        });

        const completedIds = new Set(
            userLibrary.filter(l => l.status === "COMPLETED").map(l => l.contentId)
        );
        const libraryIds = new Set(userLibrary.map(l => l.contentId));

        // Build tag affinity from library (what the user has interacted with)
        const libraryTagCounts = {};
        for (const entry of userLibrary) {
            for (const ct of (entry.content?.tags || [])) {
                const tag = ct.tag;
                if (tag) {
                    const key = `${tag.type}::${tag.name}`;
                    libraryTagCounts[key] = (libraryTagCounts[key] || 0) + 1;
                }
            }
        }

        // Fallback: no preferences set → return latest content
        if (userPrefs.length === 0) {
            const where = {};
            if (categoryFilter) where.category = categoryFilter;

            const [fallback, total] = await Promise.all([
                prisma.content.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    take: limit,
                    skip: offset,
                    include: { tags: { include: { tag: true } } },
                }),
                prisma.content.count({ where }),
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

        // Build preference signals
        const prefSignals = userPrefs
            .filter(p => p.PreferenceOption)
            .map(p => ({
                type: p.PreferenceOption.type,
                value: p.PreferenceOption.value,
                weight: WEIGHTS[p.PreferenceOption.type] ?? 1,
            }));

        // ── 3. Fetch all content with their tags ──
        const where = {};
        if (categoryFilter) where.category = categoryFilter;
        const allContent = await prisma.content.findMany({
            where,
            include: { tags: { include: { tag: true } } },
        });

        const now = Date.now();

        // ── 4. Score each content item ──
        const scored = allContent.map(item => {
            let score = 0;
            const matchedTags = [];

            // Skip items the user already completed
            if (completedIds.has(item.id)) {
                return { ...formatContent(item), _score: -1, _matchedTags: [], _status: "completed" };
            }

            // Tag-preference matching
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

            // Library affinity bonus: if the user's library has items with similar tags
            for (const ct of item.tags) {
                const tag = ct.tag;
                if (!tag) continue;
                const key = `${tag.type}::${tag.name}`;
                if (libraryTagCounts[key]) {
                    score += Math.min(libraryTagCounts[key], 3) * 0.3;
                }
            }

            // Rating bonus (0 to 1 point) — high ratings get a slight edge
            if (item.rating) {
                score += (item.rating / 10) * 1.0;
            }

            // Freshness bonus: items added in the last 7 days get up to 0.5 extra
            const ageMs = now - new Date(item.createdAt).getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            if (ageDays < 7) {
                score += 0.5 * (1 - ageDays / 7);
            }

            // In-library proximity: mark items already in the user's watchlist
            const inLibrary = libraryIds.has(item.id);

            return {
                ...formatContent(item),
                _score: score,
                _matchedTags: matchedTags,
                _inLibrary: inLibrary,
            };
        });

        // ── 5. Sort: score desc, then rating desc as tiebreaker ──
        scored.sort((a, b) => {
            if (b._score !== a._score) return b._score - a._score;
            return (b.rating ?? 0) - (a.rating ?? 0);
        });

        const forYou = scored.filter(c => c._score > 0);

        // Explore: zero-score items NOT in the user's library, sorted by rating
        const explore = scored
            .filter(c => c._score === 0 && !c._inLibrary)
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
 */
async function getRecommendationStats(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const userPrefs = await prisma.userPreference.findMany({
            where: { userId },
            include: { PreferenceOption: true },
        });

        // Library stats
        const libraryEntries = await prisma.userLibrary.findMany({
            where: { userId },
        });
        const libraryStats = {
            total: libraryEntries.length,
            completed: libraryEntries.filter(l => l.status === "COMPLETED").length,
            planning: libraryEntries.filter(l => l.status === "PLANNING").length,
            current: libraryEntries.filter(l => l.status === "CURRENT").length,
        };

        if (userPrefs.length === 0) {
            return res.status(200).json({
                ok: true,
                stats: {},
                topGenres: [],
                matchRate: 0,
                hasPreferences: false,
                libraryStats,
            });
        }

        const prefSignals = userPrefs
            .filter(p => p.PreferenceOption)
            .map(p => ({ type: p.PreferenceOption.type, value: p.PreferenceOption.value }));

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
            .filter(p => p.PreferenceOption?.type === "Genre")
            .map(p => p.PreferenceOption.value);

        return res.status(200).json({
            ok: true,
            stats: categoryStats,
            topGenres,
            matchRate: totalItems
                ? Math.round((matchedItems / totalItems) * 100)
                : 0,
            hasPreferences: true,
            libraryStats,
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