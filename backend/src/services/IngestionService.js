const prisma = require("../prismaClient");

// ─────────────────────────────────────────────────────────────────────────────
// TAG NORMALISATION MAPS
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

    // ── Anime / Manga via Jikan ──
    async ingestAnime(title, category = "Anime") {
        try {
            const type = category === "Manga" ? "manga" : "anime";
            const resp = await fetch(
                `https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(title)}&limit=1`
            );
            
            if (!resp.ok) {
                return { ok: false, message: `Jikan API error (${resp.status}). They might be rate-limiting requests.` };
            }

            const json = await resp.json().catch(() => null);
            if (!json || !json.data || !json.data[0]) {
                return { ok: false, message: `No ${type} found matching: "${title}"` };
            }
            const data = json.data[0];

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
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            }, { timeout: 30000 });
            return { ok: true, content };
        } catch (err) {
            console.error("ingestAnime error:", err);
            return { ok: false, message: err.message };
        }
    }

    // ── Anime/Manga directly from Jikan data object (no second search) ──
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

            const externalId = String(data.id);
            const source = "TMDB";

            const existing = await prisma.content.findFirst({ where: { externalId, source } });
            if (existing) return { ok: true, content: existing, skipped: true };

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
                        externalId, source,
                        rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            }, { timeout: 30000 });
            return { ok: true, content };
        } catch (err) {
            console.error("ingestMovie error:", err);
            return { ok: false, message: err.message };
        }
    }

    // ── TMDB direct from data object (no second search) ──
    async ingestTmdbDirect(data, isTV = false) {
        try {
            const externalId = String(data.id);
            const source = "TMDB";
            const existing = await prisma.content.findFirst({ where: { externalId, source } });
            if (existing) return { ok: true, content: existing, skipped: true };

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
                        externalId, source,
                        rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            });
            return { ok: true, content };
        } catch (err) {
            console.error("ingestTmdbDirect error:", err);
            return { ok: false, message: err.message };
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // ADVANCED DISCOVERY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Discover and ingest content for a category.
     *
     * @param {string} category  - "Anime" | "Manga" | "Movie" | "TV"
     * @param {object} options
     * @param {string}  options.mode       - "popular" | "top_rated" | "trending" | "upcoming" | "search"
     * @param {number}  options.pages      - how many NEW pages to actually ingest (default 3)
     * @param {number}  options.startPage  - which API page to begin from (default 1).
     *                                       Pass the `nextPage` value returned by a previous run
     *                                       to continue where you left off.
     * @param {number}  options.maxPages   - hard ceiling on total pages fetched, including
     *                                       all-duplicate pages that are skipped over (default 20).
     * @param {string}  options.query      - search query (only for mode "search")
     *
     * @returns {{ ok, stats }}
     *   stats includes: total, ingested, skipped, failed, pagesScanned, nextPage
     *   → store `nextPage` and pass it as `startPage` on the next discovery run
     *     so you never re-scan the same pages.
     */
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
            nextPage: startPage,   // caller should persist this and pass it back next time
        };

        try {
            if (category === "Anime" || category === "Manga") {
                await this._discoverJikan(category, mode, pages, startPage, maxPages, query, stats);
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

    // ── Jikan multi-page discovery ──
    async _discoverJikan(category, mode, targetNewPages, startPage, maxPages, query, stats) {
        const type = category.toLowerCase(); // "anime" or "manga"

        let baseUrl;
        if (mode === "search" && query) {
            baseUrl = `https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(query)}&order_by=members&sort=desc`;
        } else if (mode === "top_rated") {
            baseUrl = `https://api.jikan.moe/v4/top/${type}?filter=score`;
        } else if (mode === "upcoming") {
            baseUrl = `https://api.jikan.moe/v4/top/${type}?filter=upcoming`;
        } else if (mode === "trending" && type === "anime") {
            baseUrl = `https://api.jikan.moe/v4/seasons/now`;
        } else {
            baseUrl = `https://api.jikan.moe/v4/top/${type}?filter=bypopularity`;
        }

        let newPagesIngested = 0;
        let page = startPage;
        const absoluteMax = startPage + maxPages - 1;

        while (newPagesIngested < targetNewPages && page <= absoluteMax) {
            try {
                const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}page=${page}&limit=25`;
                console.log(`[Jikan] Fetching ${category} ${mode} page ${page}: ${url}`);
                const resp = await fetch(url, {
                    headers: { 'User-Agent': 'LogHorizon/1.0.0 (Research Project)' }
                });

                // Jikan returns 404 / empty data past the last page
                if (!resp.ok) {
                    console.log(`[Jikan] Non-OK status ${resp.status} on page ${page} – stopping.`);
                    break;
                }

                const json = await resp.json().catch(() => null);
                if (!json) {
                    console.log(`[Jikan] Invalid JSON on page ${page} – stopping.`);
                    break;
                }
                const items = json.data || [];

                if (items.length === 0) {
                    console.log(`[Jikan] No items on page ${page} – end of results.`);
                    break;
                }

                stats.pagesScanned++;
                const pageIngestedBefore = stats.ingested;

                for (const item of items) {
                    stats.total++;
                    try {
                        const res = await this.ingestJikanDirect(item, category);
                        if (res?.ok) {
                            if (res.skipped) stats.skipped++;
                            else stats.ingested++;
                        } else {
                            stats.failed++;
                        }
                    } catch { stats.failed++; }
                    await sleep(400);
                }

                // Only count a page toward our target if it actually produced new content.
                // This means an all-duplicate page is "skipped over" automatically.
                if (stats.ingested > pageIngestedBefore) {
                    newPagesIngested++;
                } else {
                    console.log(`[Jikan] Page ${page} was all duplicates – advancing without counting toward target.`);
                }

                page++;
                stats.nextPage = page;

            } catch (err) {
                console.error(`[Jikan] Page ${page} error:`, err.message);
                page++;          // still advance so we don't loop forever on a bad page
                stats.nextPage = page;
            }

            await sleep(1500);
        }
    }

    // ── TMDB multi-page discovery ──
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
                    break;
                }

                const json = await resp.json().catch(() => null);
                if (!json) {
                    console.log(`[TMDB] Invalid JSON on page ${page} – stopping.`);
                    break;
                }
                const items = json.results || [];

                // TMDB returns an empty results array (not an error) past the last page
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

                // Same smart-skip logic: only credit the page if it yielded new items
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


    // ── Legacy method kept for backward compatibility ──
    async discoverAndIngestTop(category) {
        return this.discoverAndIngest(category, { mode: "popular", pages: 1 });
    }
}

module.exports = new IngestionService();