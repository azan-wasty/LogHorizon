const prisma = require("../prismaClient");

/**
 * GET /api/preferences/options
 */
async function getPreferenceOptions(req, res) {
    try {
        const options = await prisma.preferenceOption.findMany({
            orderBy: [{ type: "asc" }, { value: "asc" }],
        });

        const grouped = options.reduce((acc, opt) => {
            if (!acc[opt.type]) acc[opt.type] = [];
            acc[opt.type].push(opt);
            return acc;
        }, {});

        return res.status(200).json({ ok: true, options: grouped });
    } catch (err) {
        console.error("getPreferenceOptions error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * GET /api/preferences/me
 * Requires JWT (req.user.id).
 */
async function getMyPreferences(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const rows = await prisma.userPreference.findMany({
            where: { userId: Number(userId) },
            include: { option: true },
            orderBy: { createdAt: "asc" },
        });

        const preferenceOptionIds = rows.map((r) => r.preferenceOptionId);

        const grouped = rows.reduce((acc, r) => {
            const opt = r.option;
            if (!opt) return acc;
            if (!acc[opt.type]) acc[opt.type] = [];
            acc[opt.type].push(opt);
            return acc;
        }, {});

        return res.status(200).json({
            ok: true,
            preferenceOptionIds,
            preferences: grouped,
        });
    } catch (err) {
        console.error("getMyPreferences error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/preferences
 * Body: { preferenceOptionIds: number[] }
 * Replaces all preferences for the user.
 */
async function setMyPreferences(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, message: "unauthorized" });

        const { preferenceOptionIds } = req.body || {};
        if (!Array.isArray(preferenceOptionIds)) {
            return res.status(400).json({ ok: false, message: "preferenceOptionIds must be an array" });
        }

        const ids = [...new Set(preferenceOptionIds)]
            .map((x) => Number(x))
            .filter((n) => Number.isInteger(n) && n > 0);

        // Allow clearing all
        if (ids.length === 0) {
            await prisma.userPreference.deleteMany({ where: { userId: Number(userId) } });
            return res.status(200).json({
                ok: true,
                message: "preferences cleared",
                preferenceOptionIds: [],
            });
        }

        // Validate the ids exist
        const existing = await prisma.preferenceOption.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });
        const existingIds = new Set(existing.map((o) => o.id));
        const missing = ids.filter((id) => !existingIds.has(id));
        if (missing.length > 0) {
            return res.status(400).json({
                ok: false,
                message: "some preferenceOptionIds do not exist",
                missing,
            });
        }

        await prisma.$transaction([
            prisma.userPreference.deleteMany({ where: { userId: Number(userId) } }),
            prisma.userPreference.createMany({
                data: ids.map((optionId) => ({
                    userId: Number(userId),
                    preferenceOptionId: optionId,
                })),
            }),
        ]);

        return res.status(200).json({
            ok: true,
            message: "preferences saved",
            preferenceOptionIds: ids,
        });
    } catch (err) {
        console.error("setMyPreferences error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

/**
 * POST /api/preferences/seed
 */
async function seedPreferenceOptions(req, res) {
    try {
        const seed = [
            // Genre
            { type: "Genre", value: "Action" },
            { type: "Genre", value: "Adventure" },
            { type: "Genre", value: "Comedy" },
            { type: "Genre", value: "Drama" },
            { type: "Genre", value: "Fantasy" },
            { type: "Genre", value: "Sci-Fi" },

            // Theme
            { type: "Theme", value: "Friendship" },
            { type: "Theme", value: "Coming of Age" },
            { type: "Theme", value: "Revenge" },
            { type: "Theme", value: "Mystery" },

            // Mood
            { type: "Mood", value: "Chill" },
            { type: "Mood", value: "Hype" },
            { type: "Mood", value: "Dark" },
            { type: "Mood", value: "Emotional" },
        ];

        for (const row of seed) {
            await prisma.preferenceOption.upsert({
                where: {
                    type_value: {
                        type: row.type,
                        value: row.value,
                    },
                },
                update: {},
                create: row,
            });
        }

        return res.status(201).json({
            ok: true,
            message: "seeded preference options (idempotent)",
        });
    } catch (err) {
        console.error("seedPreferenceOptions error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
}

module.exports = {
    getPreferenceOptions,
    getMyPreferences,
    setMyPreferences,
    seedPreferenceOptions,
};