const express = require("express");
const prisma = require("../prismaClient");
const { makeCacheKey, getOrSet } = require("../services/responseCache");
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
        res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
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

        const cacheKey = makeCacheKey("content:list", {
            category,
            tagId,
            tagIds,
            hasDiscord,
            hasReddit,
            hasSocial,
            q,
            sort,
            limit: parsedLimit,
            offset: parsedOffset,
        });
        const payload = await getOrSet({
            key: cacheKey,
            ttlMs: 60_000,
            producer: async () => {
                const [content, total] = await Promise.all([
                    prisma.content.findMany(queryArgs),
                    usePagination ? prisma.content.count({ where }) : Promise.resolve(null)
                ]);

                const formatted = content.map(formatContent);
                if (!usePagination) {
                    return { ok: true, content: formatted };
                }

                return {
                    ok: true,
                    content: formatted,
                    total,
                    limit: parsedLimit,
                    offset: parsedOffset,
                    hasMore: parsedOffset + formatted.length < total
                };
            }
        });

        return res.status(200).json(payload);
    } catch (err) {
        console.error("listContent public error:", err);
        return res.status(500).json({ ok: false, message: "internal server error" });
    }
});

const { AniListService } = require("../services/AniListService");

// GET /api/content/:id  — public single item
router.get("/:id", async (req, res) => {
    try {
        res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        let item = await prisma.content.findUnique({
            where: { id },
            include: { 
                tags: { include: { tag: true } },
                children: {
                    select: { id: true, title: true, coverImage: true, category: true, status: true, totalEpisodes: true }
                },
                parent: {
                    select: { id: true, title: true }
                }
            },
        });

        if (!item) return res.status(404).json({ ok: false, message: "content not found" });

        // On-demand enrichment for Anime / Manga missing episodes or banner
        if ((item.category === "Anime" && !item.totalEpisodes) || (item.category === "Manga" && !item.totalChapters) || !item.bannerImage) {
            try {
                let media = null;
                if (item.source === "AniList" && item.externalId) {
                    media = await AniListService.getMediaById(item.externalId, item.category);
                } else if ((item.source === "Jikan" || item.source === "MAL") && item.externalId) {
                    media = await AniListService.getMediaByMalId(item.externalId, item.category);
                }
                if (!media && (item.category === "Anime" || item.category === "Manga")) {
                    media = await AniListService.searchMedia(item.title, item.category);
                }

                if (media) {
                    const updateData = {};
                    if (!item.totalEpisodes && media.episodes) updateData.totalEpisodes = media.episodes;
                    if (!item.totalChapters && media.chapters) updateData.totalChapters = media.chapters;
                    if (!item.bannerImage && media.bannerImage) updateData.bannerImage = media.bannerImage;

                    if (Object.keys(updateData).length > 0) {
                        item = await prisma.content.update({
                            where: { id },
                            data: updateData,
                            include: { 
                                tags: { include: { tag: true } },
                                children: {
                                    select: { id: true, title: true, coverImage: true, category: true, status: true, totalEpisodes: true }
                                },
                                parent: {
                                    select: { id: true, title: true }
                                }
                            },
                        });
                    }
                }
            } catch (enrichErr) {
                console.warn(`[Enrichment] Failed to auto-enrich content ${id}:`, enrichErr.message);
            }
        }

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

// GET /api/content/:id/episodes — fetch episode details and list
router.get("/:id/episodes", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ ok: false, message: "invalid id" });
        }

        const item = await prisma.content.findUnique({ where: { id } });
        if (!item) return res.status(404).json({ ok: false, message: "content not found" });

        const isAnime = item.category === "Anime";
        const isTV = item.category === "TV";
        const isManga = item.category === "Manga";

        if (isManga) {
            // For manga, return chapters count
            const chaptersCount = item.totalChapters || 1;
            const chapters = [];
            for (let i = 1; i <= chaptersCount; i++) {
                chapters.push({
                    episodeNumber: i,
                    title: `Chapter ${i}`,
                    thumbnail: item.coverImage || null,
                });
            }
            return res.json({
                ok: true,
                totalEpisodes: chaptersCount,
                type: "chapter",
                episodes: chapters,
            });
        }

        let episodes = [];
        let totalEpisodes = item.totalEpisodes || null;

        // 1. If Anime: try AniList
        if (isAnime) {
            try {
                let media = null;
                if (item.source === "AniList" && item.externalId) {
                    media = await AniListService.getMediaById(item.externalId, "Anime");
                } else if ((item.source === "Jikan" || item.source === "MAL") && item.externalId) {
                    media = await AniListService.getMediaByMalId(item.externalId, "Anime");
                }
                if (!media) {
                    media = await AniListService.searchMedia(item.title, "Anime");
                }

                if (media) {
                    totalEpisodes = media.episodes || totalEpisodes;
                    const streaming = media.streamingEpisodes || [];
                    const count = totalEpisodes || streaming.length || 0;

                    for (let i = 1; i <= count; i++) {
                        const stream = streaming[i - 1];
                        episodes.push({
                            episodeNumber: i,
                            title: stream?.title || `Episode ${i}`,
                            thumbnail: stream?.thumbnail || item.coverImage || null,
                            url: stream?.url || null,
                            site: stream?.site || null,
                        });
                    }

                    if (media.episodes && !item.totalEpisodes) {
                        await prisma.content.update({
                            where: { id: item.id },
                            data: { totalEpisodes: media.episodes }
                        }).catch(() => {});
                    }
                }
            } catch (err) {
                console.warn(`[Episodes] AniList episode fetch error for #${id}:`, err.message);
            }
        }

        // 2. If TV from TMDB
        if (isTV && item.source === "TMDB" && item.externalId && process.env.TMDB_API_KEY) {
            try {
                const resp = await fetch(
                    `https://api.themoviedb.org/3/tv/${item.externalId}/season/1?api_key=${process.env.TMDB_API_KEY}&language=en-US`
                );
                if (resp.ok) {
                    const tmdbData = await resp.json();
                    if (tmdbData.episodes && Array.isArray(tmdbData.episodes)) {
                        episodes = tmdbData.episodes.map(ep => ({
                            episodeNumber: ep.episode_number,
                            title: ep.name ? `Ep ${ep.episode_number}: ${ep.name}` : `Episode ${ep.episode_number}`,
                            overview: ep.overview || null,
                            thumbnail: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : item.coverImage || null,
                            airDate: ep.air_date || null,
                            rating: ep.vote_average || null,
                        }));
                        totalEpisodes = episodes.length;
                    }
                }
            } catch (err) {
                console.warn(`[Episodes] TMDB episode fetch error for #${id}:`, err.message);
            }
        }

        // 3. Fallback: generate default episodes if none found but totalEpisodes exists
        if (episodes.length === 0 && totalEpisodes && totalEpisodes > 0) {
            for (let i = 1; i <= totalEpisodes; i++) {
                episodes.push({
                    episodeNumber: i,
                    title: `Episode ${i}`,
                    thumbnail: item.coverImage || null,
                });
            }
        } else if (episodes.length === 0) {
            // Default 12 episodes if unknown
            for (let i = 1; i <= 12; i++) {
                episodes.push({
                    episodeNumber: i,
                    title: `Episode ${i}`,
                    thumbnail: item.coverImage || null,
                });
            }
        }

        return res.json({
            ok: true,
            totalEpisodes: totalEpisodes || episodes.length,
            type: "episode",
            episodes,
        });
    } catch (err) {
        console.error("getContentEpisodes error:", err);
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