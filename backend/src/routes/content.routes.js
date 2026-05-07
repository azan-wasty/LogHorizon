const express = require("express");
const prisma = require("../prismaClient");
const router = express.Router();

function formatContent(item) {
    return {
        ...item,
        tags: item.tags.map((ct) => ct.tag),
    };
}

// GET /api/content  — public list with optional ?category=, ?tagId=, ?hasDiscord= filters
router.get("/", async (req, res) => {
    try {
        const {
            category,
            tagId,
            tagIds,
            hasDiscord,
            hasReddit,
            hasSocial,
            q,
            sort,
            limit,
            offset
        } = req.query;

        const where = {};
        if (category) where.category = category;
        const parsedTagIds = [];
        if (tagId) {
            const tid = Number(tagId);
            if (Number.isInteger(tid) && tid > 0) {
                parsedTagIds.push(tid);
            }
        }
        if (tagIds) {
            String(tagIds)
                .split(",")
                .map((v) => Number(v.trim()))
                .filter((v) => Number.isInteger(v) && v > 0)
                .forEach((v) => parsedTagIds.push(v));
        }
        if (parsedTagIds.length > 0) {
            where.AND = parsedTagIds.map((tid) => ({ tags: { some: { tagId: tid } } }));
        }

        if (hasDiscord === "true") {
            where.discordLink = { not: null };
        }
        if (hasReddit === "true") {
            where.redditLink = { not: null };
        }
        if (hasSocial === "true") {
            where.OR = [
                { discordLink: { not: null } },
                { redditLink: { not: null } }
            ];
        }
        if (q && String(q).trim()) {
            const query = String(q).trim();
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { title: { contains: query, mode: "insensitive" } },
                        { description: { contains: query, mode: "insensitive" } }
                    ]
                }
            ];
        }

        const parsedLimit = Number(limit);
        const parsedOffset = Number(offset);
        const usePagination =
            Number.isInteger(parsedLimit) &&
            parsedLimit > 0 &&
            Number.isInteger(parsedOffset) &&
            parsedOffset >= 0;

        let orderBy = { createdAt: "desc" };
        if (sort === "rating") orderBy = { rating: "desc" };
        if (sort === "title") orderBy = { title: "asc" };

        const queryArgs = {
            where,
            orderBy,
            include: { tags: { include: { tag: true } } },
        };
        if (usePagination) {
            queryArgs.take = parsedLimit;
            queryArgs.skip = parsedOffset;
        }

        const [content, total] = await Promise.all([
            prisma.content.findMany(queryArgs),
            usePagination ? prisma.content.count({ where }) : Promise.resolve(null)
        ]);

        const formatted = content.map(formatContent);

        if (!usePagination) {
            return res.status(200).json({ ok: true, content: formatted });
        }

        return res.status(200).json({
            ok: true,
            content: formatted,
            total,
            limit: parsedLimit,
            offset: parsedOffset,
            hasMore: parsedOffset + formatted.length < total
        });
    } catch (err) {
        console.error("listContent public error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
});

// GET /api/content/:id  — public single item
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const item = await prisma.content.findUnique({
            where: { id },
            include: { 
                tags: { include: { tag: true } },
                children: {
                    select: { id: true, title: true, coverImage: true, category: true, status: true }
                },
                parent: {
                    select: { id: true, title: true }
                }
            },
        });

        if (!item) return res.status(404).json({ ok: false, message: "content not found" });

        // Calculate platform average rating
        const aggregate = await prisma.review.aggregate({
            where: { contentId: id },
            _avg: { rating: true },
            _count: { rating: true }
        });

        const formatted = formatContent(item);
        formatted.platformAverage = aggregate._avg.rating || 0;
        formatted.platformReviewCount = aggregate._count.rating || 0;

        return res.status(200).json({ ok: true, content: formatted });
    } catch (err) {
        console.error("getContent public error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
});

// GET /api/content/:id/sources — TMDB sources
router.get("/:id/sources", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const item = await prisma.content.findUnique({ where: { id } });
        
        if (!item) return res.status(404).json({ ok: false, message: "not found" });
        
        // Handle Anime/Manga direct links if they exist in externalUrl
        if (item.category === "Anime" || item.category === "Manga") {
            return res.json({ ok: true, sources: item.externalUrl });
        }

        if (!item.externalId || !process.env.TMDB_API_KEY) {
            return res.json({ ok: true, sources: item.externalUrl || null });
        }

        const tmdbType = item.category === "Movie" ? "movie" : "tv";
        const url = `https://api.themoviedb.org/3/${tmdbType}/${item.externalId}/watch/providers?api_key=${process.env.TMDB_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const results = data.results || {};
        const us = results["US"] || results["GB"] || Object.values(results)[0];

        return res.json({ ok: true, sources: us ? us.link : item.externalUrl });
    } catch (err) {
        console.error("getSources error:", err);
        return res.json({ ok: false, message: "failed to fetch sources" });
    }
});

module.exports = router;