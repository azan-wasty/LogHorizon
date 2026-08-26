const prisma = require("../prismaClient");
const { AniListService, mapAniListTags, mapAniListStatus, cleanHtml } = require("./AniListService");

// ─────────────────────────────────────────────────────────────────────────────
// TAG NORMALISATION MAPS (LEGACY JIKAN + TMDB)
// ─────────────────────────────────────────────────────────────────────────────

const JIKAN_GENRE_MAP = {
    "Action": { type: "Genre", name: "Action" },
    "Adventure": { type: "Genre", name: "Adventure" },
    "Comedy": { type: "Genre", name: "Comedy" },
    "Drama": { type: "Genre", name: "Drama" },
    "Fantasy": { type: "Genre", name: "Fantasy" },
    "Sci-Fi": { type: "Genre", name: "Sci-Fi" },
    "Science Fiction": { type: "Genre", name: "Sci-Fi" },
    "Mystery": { type: "Genre", name: "Mystery" },
    "Horror": { type: "Mood", name: "Dark" },
    "Psychological": { type: "Mood", name: "Dark" },
    "Thriller": { type: "Mood", name: "Dark" },
    "Slice of Life": { type: "Mood", name: "Chill" },
    "Romance": { type: "Mood", name: "Emotional" },
    "Tragedy": { type: "Mood", name: "Emotional" },
    "Sports": { type: "Mood", name: "Hype" },
    "Shounen": { type: "Mood", name: "Hype" },
    "Supernatural": { type: "Genre", name: "Fantasy" },
    "Music": { type: "Mood", name: "Chill" },
    "Ecchi": { type: "Mood", name: "Chill" },
};

const JIKAN_THEME_MAP = {
    "School": { type: "Theme", name: "Coming of Age" },
    "Coming of Age": { type: "Theme", name: "Coming of Age" },
    "Revenge": { type: "Theme", name: "Revenge" },
    "Friendship": { type: "Theme", name: "Friendship" },
    "Mystery": { type: "Theme", name: "Mystery" },
    "Military": { type: "Genre", name: "Action" },
    "Survival": { type: "Mood", name: "Dark" },
    "Psychological": { type: "Mood", name: "Dark" },
    "Time Travel": { type: "Genre", name: "Sci-Fi" },
    "Mecha": { type: "Genre", name: "Sci-Fi" },
    "Isekai": { type: "Genre", name: "Fantasy" },
    "Super Power": { type: "Mood", name: "Hype" },
    "Samurai": { type: "Genre", name: "Action" },
    "Historical": { type: "Genre", name: "Drama" },
    "Workplace": { type: "Mood", name: "Chill" },
    "Family": { type: "Theme", name: "Friendship" },
    "Vampire": { type: "Mood", name: "Dark" },
    "Demons": { type: "Genre", name: "Fantasy" },
    "Magic": { type: "Genre", name: "Fantasy" },
};

const TMDB_GENRE_MAP = {
    28: { type: "Genre", name: "Action" },
    12: { type: "Genre", name: "Adventure" },
    16: { type: "Genre", name: "Fantasy" },
    35: { type: "Genre", name: "Comedy" },
    80: { type: "Mood", name: "Dark" },
    99: { type: "Genre", name: "Drama" },
    18: { type: "Genre", name: "Drama" },
    10751: { type: "Theme", name: "Friendship" },
    14: { type: "Genre", name: "Fantasy" },
    36: { type: "Genre", name: "Drama" },
    27: { type: "Mood", name: "Dark" },
    10402: { type: "Mood", name: "Chill" },
    9648: { type: "Theme", name: "Mystery" },
    10749: { type: "Mood", name: "Emotional" },
    878: { type: "Genre", name: "Sci-Fi" },
    10770: { type: "Genre", name: "Drama" },
    53: { type: "Mood", name: "Dark" },
    10752: { type: "Genre", name: "Action" },
    37: { type: "Genre", name: "Adventure" },
    10759: { type: "Genre", name: "Action" },
    10762: { type: "Theme", name: "Coming of Age" },
    10763: { type: "Genre", name: "Drama" },
    10764: { type: "Mood", name: "Hype" },
    10765: { type: "Genre", name: "Sci-Fi" },
    10766: { type: "Genre", name: "Drama" },
    10767: { type: "Mood", name: "Chill" },
    10768: { type: "Genre", name: "Action" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function upsertTags(tx, rawTags) {
    const seen = new Set();
    const unique = [];
    for (const t of rawTags) {
        const key = `${t.type}::${t.name}`;
        if (!seen.has(key)) { seen.add(key); unique.push(t); }
    }
    const tagIds = [];
    for (const t of unique) {
        const tag = await tx.tag.upsert({
            where: { type_name: { name: t.name, type: t.type } },
            update: {},
            create: { name: t.name, type: t.type },
        });
        tagIds.push(tag.id);
    }
    return tagIds;
}

async function syncTagsToPreferenceOptions(tx, rawTags) {
    for (const t of rawTags) {
        await tx.preferenceOption.upsert({
            where: { type_value: { type: t.type, value: t.name } },
            update: {},
            create: { type: t.type, value: t.name },
        });
    }
}

function mapJikanTags(genres = [], themes = []) {
    const tags = [];
    for (const g of genres) {
        const mapped = JIKAN_GENRE_MAP[g.name];
        if (mapped) tags.push(mapped);
    }
    for (const t of themes) {
        const mapped = JIKAN_THEME_MAP[t.name];
        if (mapped) tags.push(mapped);
    }
    return tags;
}

function mapTmdbTags(genreIds = []) {
    const tags = [];
    for (const id of genreIds) {
        const mapped = TMDB_GENRE_MAP[id];
        if (mapped) tags.push(mapped);
    }
    return tags;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// INGESTION METHODS
// ─────────────────────────────────────────────────────────────────────────────

class IngestionService {

    // ── Anime / Manga via AniList Wrapper (with fallback & legacy support) ──
    async ingestAnime(title, category = "Anime") {
        try {
            if (category !== "Anime" && category !== "Manga") {
                return { ok: false, message: `Anime/Manga ingestion does not support category: ${category}` };
            }

            const data = await AniListService.searchMedia(title, category);
            if (!data) {
                return { ok: false, message: `No ${category.toLowerCase()} found matching: "${title}"` };
            }

            return await this.ingestAniListDirect(data, category);
        } catch (err) {
            console.error("ingestAnime (AniList) error:", err);
            return { ok: false, message: err.message };
        }
    }

    async ingestAniListDirect(data, category = "Anime") {
        try {
            const externalId = String(data.id);
            const malId = data.idMal ? String(data.idMal) : null;

            // Check if already in database (either as AniList or legacy Jikan/MAL)
            const existing = await prisma.content.findFirst({
                where: {
                    OR: [
                        { externalId, source: "AniList" },
                        ...(malId ? [
                            { externalId: malId, source: "Jikan" },
                            { externalId: malId, source: "MAL" },
                        ] : []),
                        { title: data.title?.english || data.title?.romaji || data.title?.native, category }
                    ]
                },
            });

            if (existing) {
                // Enrich existing item if missing totalEpisodes or bannerImage
                const needsUpdate = (!existing.totalEpisodes && data.episodes) ||
                                    (!existing.totalChapters && data.chapters) ||
                                    (!existing.bannerImage && data.bannerImage);
                if (needsUpdate) {
                    await prisma.content.update({
                        where: { id: existing.id },
                        data: {
                            totalEpisodes: existing.totalEpisodes || data.episodes || null,
                            totalChapters: existing.totalChapters || data.chapters || null,
                            bannerImage: existing.bannerImage || data.bannerImage || null,
                        }
                    });
                }
                return { ok: true, content: existing, skipped: true };
            }

            const rawTags = mapAniListTags(data.genres || [], data.tags || []);
            const cleanDesc = cleanHtml(data.description || "No description available.");
            const titleDisplay = data.title?.english || data.title?.romaji || data.title?.native || "Untitled";

            const content = await prisma.$transaction(async (tx) => {
                const tagIds = await upsertTags(tx, rawTags);
                await syncTagsToPreferenceOptions(tx, rawTags);
                return tx.content.create({
                    data: {
                        title: titleDisplay,
                        category,
                        description: cleanDesc.substring(0, 1000),
                        coverImage: (data.coverImage?.extraLarge || data.coverImage?.large || "").substring(0, 1000) || null,
                        bannerImage: (data.bannerImage || "").substring(0, 1000) || null,
                        externalId,
                        externalUrl: data.siteUrl || null,
                        source: "AniList",
                        rating: data.averageScore ? Math.round(data.averageScore / 10 * 10) / 10 : null,
                        status: mapAniListStatus(data.status),
                        totalEpisodes: data.episodes || null,
                        totalChapters: data.chapters || null,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            }, { timeout: 30000 });

            return { ok: true, content };
        } catch (err) {
            console.error("ingestAniListDirect error:", err);
            return { ok: false, message: err.message };
        }
    }

    // Legacy Jikan ingestion helper (for backward compatibility)
    async ingestJikanDirect(data, category = "Anime") {
        try {
            const existing = await prisma.content.findFirst({
                where: { externalId: String(data.mal_id), source: "Jikan" },
            });
            if (existing) return { ok: true, content: existing, skipped: true };

            const rawTags = mapJikanTags(data.genres || [], data.themes || []);

            const content = await prisma.$transaction(async (tx) => {
                const tagIds = await upsertTags(tx, rawTags);
                await syncTagsToPreferenceOptions(tx, rawTags);
                return tx.content.create({
                    data: {
                        title: data.title_english || data.title,
                        category,
                        description: (data.synopsis || "No description available.").substring(0, 1000),
                        coverImage: data.images?.jpg?.large_image_url?.substring(0, 1000) || data.images?.webp?.large_image_url?.substring(0, 1000) || null,
                        externalId: String(data.mal_id),
                        source: "Jikan",
                        rating: data.score || null,
                        status: data.status || null,
                        totalEpisodes: data.episodes || null,
                        totalChapters: data.chapters || null,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            }, { timeout: 30000 });
            return { ok: true, content };
        } catch (err) {
            console.error("ingestJikanDirect error:", err);
            return { ok: false, message: err.message };
        }
    }

    // ── Movies / TV via TMDB ──
    async ingestMovie(title, isTV = false) {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) return { ok: false, message: "TMDB_API_KEY missing from .env" };

        try {
            const type = isTV ? "tv" : "movie";
            const resp = await fetch(
                `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=en-US&page=1`
            );

            if (!resp.ok) {
                return { ok: false, message: `TMDB API error (${resp.status}). Check your API key or connection.` };
            }

            const json = await resp.json().catch(() => null);
            if (!json || !json.results || !json.results[0]) {
                return { ok: false, message: `No ${type} found matching: "${title}"` };
            }
            const data = json.results[0];

            return await this.ingestTmdbDirect(data, isTV);
        } catch (err) {
            console.error("ingestMovie error:", err);
            return { ok: false, message: err.message };
        }
    }

    async ingestTmdbDirect(data, isTV = false) {
        try {
            const externalId = String(data.id);
            const source = "TMDB";
            const existing = await prisma.content.findFirst({ where: { externalId, source } });
            if (existing) return { ok: true, content: existing, skipped: true };

            let totalEpisodes = null;
            if (isTV && process.env.TMDB_API_KEY) {
                try {
                    const tvResp = await fetch(`https://api.themoviedb.org/3/tv/${externalId}?api_key=${process.env.TMDB_API_KEY}`);
                    if (tvResp.ok) {
                        const tvData = await tvResp.json();
                        totalEpisodes = tvData.number_of_episodes || null;
                    }
                } catch {
                    // non-fatal
                }
            }

            const rawTags = mapTmdbTags(data.genre_ids || []);

            const content = await prisma.$transaction(async (tx) => {
                const tagIds = await upsertTags(tx, rawTags);
                await syncTagsToPreferenceOptions(tx, rawTags);
                return tx.content.create({
                    data: {
                        title: data.title || data.name,
                        category: isTV ? "TV" : "Movie",
                        description: (data.overview || "No description available.").substring(0, 1000),
                        coverImage: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}`.substring(0, 1000) : null,
                        bannerImage: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`.substring(0, 1000) : null,
                        externalId, source,
                        rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
                        totalEpisodes,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            }, { timeout: 30000 });
            return { ok: true, content };
        } catch (err) {
            console.error("ingestTmdbDirect error:", err);
            return { ok: false, message: err.message };
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // ADVANCED DISCOVERY
    // ─────────────────────────────────────────────────────────────────────────

    async discoverAndIngest(category, options = {}) {
        const {
            mode = "popular",
            pages = 3,
            startPage = 1,
            maxPages = 20,
            query = "",
        } = options;

        const stats = {
            total: 0,
            ingested: 0,
            skipped: 0,
            failed: 0,
            pagesScanned: 0,
            nextPage: startPage,
        };

        try {
            if (category === "Anime" || category === "Manga") {
                await this._discoverAniList(category, mode, pages, startPage, maxPages, query, stats);
            } else if (category === "Movie" || category === "TV") {
                await this._discoverTmdb(category, mode, pages, startPage, maxPages, query, stats);
            } else {
                return { ok: false, message: `Discovery not supported for "${category}"` };
            }
            return { ok: true, stats };
        } catch (err) {
            console.error("discoverAndIngest error:", err);
            return { ok: false, message: err.message, stats };
        }
    }

    async _discoverAniList(category, mode, targetNewPages, startPage, maxPages, query, stats) {
        let newPagesIngested = 0;
        let page = startPage;
        const absoluteMax = startPage + maxPages - 1;

        while (newPagesIngested < targetNewPages && page <= absoluteMax) {
            try {
                console.log(`[AniList] Fetching ${category} ${mode} page ${page}`);
                const { items, pageInfo } = await AniListService.discoverMedia({
                    category,
                    mode,
                    page,
                    perPage: 25,
                    query,
                });

                if (!items || items.length === 0) {
                    console.log(`[AniList] No items on page ${page} – end of results.`);
                    break;
                }

                stats.pagesScanned++;
                const pageIngestedBefore = stats.ingested;

                for (const item of items) {
                    stats.total++;
                    try {
                        const res = await this.ingestAniListDirect(item, category);
                        if (res?.ok) {
                            if (res.skipped) stats.skipped++;
                            else stats.ingested++;
                        } else {
                            stats.failed++;
                        }
                    } catch {
                        stats.failed++;
                    }
                    await sleep(50);
                }

                if (stats.ingested > pageIngestedBefore) {
                    newPagesIngested++;
                } else {
                    console.log(`[AniList] Page ${page} was mostly duplicates – advancing.`);
                }

                page++;
                stats.nextPage = page;

                if (!pageInfo.hasNextPage) break;
            } catch (err) {
                console.error(`[AniList] Page ${page} error:`, err.message);
                page++;
                stats.nextPage = page;
            }

            await sleep(200);
        }
    }

    async _discoverTmdb(category, mode, targetNewPages, startPage, maxPages, query, stats) {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) throw new Error("TMDB_API_KEY missing");
        const isTV = category === "TV";
        const type = isTV ? "tv" : "movie";

        let newPagesIngested = 0;
        let page = startPage;
        const absoluteMax = startPage + maxPages - 1;

        while (newPagesIngested < targetNewPages && page <= absoluteMax) {
            try {
                let url;
                if (mode === "search" && query) {
                    url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=${page}`;
                } else if (mode === "top_rated") {
                    url = `https://api.themoviedb.org/3/${type}/top_rated?api_key=${apiKey}&language=en-US&page=${page}`;
                } else if (mode === "trending") {
                    url = `https://api.themoviedb.org/3/trending/${type}/week?api_key=${apiKey}&page=${page}`;
                } else if (mode === "upcoming" && !isTV) {
                    url = `https://api.themoviedb.org/3/movie/upcoming?api_key=${apiKey}&language=en-US&page=${page}`;
                } else {
                    url = `https://api.themoviedb.org/3/${type}/popular?api_key=${apiKey}&language=en-US&page=${page}`;
                }

                console.log(`[TMDB] Fetching ${category} ${mode} page ${page}: ${url}`);
                const resp = await fetch(url);

                if (!resp.ok) {
                    console.log(`[TMDB] Non-OK status ${resp.status} on page ${page} – stopping.`);
                    if (stats.total === 0) throw new Error(`TMDB API error ${resp.status}.`);
                    break;
                }

                const json = await resp.json().catch(() => null);
                if (!json) {
                    console.log(`[TMDB] Invalid JSON on page ${page} – stopping.`);
                    if (stats.total === 0) throw new Error(`TMDB API returned invalid JSON.`);
                    break;
                }
                const items = json.results || [];

                if (items.length === 0) {
                    console.log(`[TMDB] No items on page ${page} – end of results.`);
                    break;
                }

                stats.pagesScanned++;
                const pageIngestedBefore = stats.ingested;

                for (const item of items) {
                    stats.total++;
                    try {
                        const res = await this.ingestTmdbDirect(item, isTV);
                        if (res?.ok) {
                            if (res.skipped) stats.skipped++;
                            else stats.ingested++;
                        } else {
                            stats.failed++;
                        }
                    } catch { stats.failed++; }
                    await sleep(100);
                }

                if (stats.ingested > pageIngestedBefore) {
                    newPagesIngested++;
                } else {
                    console.log(`[TMDB] Page ${page} was all duplicates – advancing without counting toward target.`);
                }

                page++;
                stats.nextPage = page;

            } catch (err) {
                console.error(`[TMDB] Page ${page} error:`, err.message);
                page++;
                stats.nextPage = page;
            }

            await sleep(500);
        }
    }

    async discoverAndIngestTop(category) {
        return this.discoverAndIngest(category, { mode: "popular", pages: 1 });
    }
}

module.exports = new IngestionService();