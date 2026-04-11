const prisma = require("../prismaClient");

// ─────────────────────────────────────────────────────────────────────────────
// TAG NORMALISATION MAPS
//
// All tag names must exactly match a PreferenceOption.value so the
// recommendation engine can bridge them.
//
// PreferenceOptions seeded:
//   Genre : Action, Adventure, Comedy, Drama, Fantasy, Sci-Fi
//   Theme : Friendship, Coming of Age, Revenge, Mystery
//   Mood  : Chill, Hype, Dark, Emotional
// ─────────────────────────────────────────────────────────────────────────────

// Jikan (MAL) genre/theme name → { type, name } in our system
// Only entries listed here will create tags; everything else is dropped.
const JIKAN_GENRE_MAP = {
    "Action": { type: "Genre", name: "Action" },
    "Adventure": { type: "Genre", name: "Adventure" },
    "Comedy": { type: "Genre", name: "Comedy" },
    "Drama": { type: "Genre", name: "Drama" },
    "Fantasy": { type: "Genre", name: "Fantasy" },
    "Sci-Fi": { type: "Genre", name: "Sci-Fi" },
    "Science Fiction": { type: "Genre", name: "Sci-Fi" }, // alias
    "Mystery": { type: "Genre", name: "Mystery" },
    "Horror": { type: "Mood", name: "Dark" },
    "Psychological": { type: "Mood", name: "Dark" },
    "Thriller": { type: "Mood", name: "Dark" },
    "Slice of Life": { type: "Mood", name: "Chill" },
    "Romance": { type: "Mood", name: "Emotional" },
    "Tragedy": { type: "Mood", name: "Emotional" },
    "Sports": { type: "Mood", name: "Hype" },
    "Shounen": { type: "Mood", name: "Hype" },
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
};

// TMDB genre_id → { type, name } in our system
// Full TMDB genre list: https://developer.themoviedb.org/reference/genre-movie-list
const TMDB_GENRE_MAP = {
    28: { type: "Genre", name: "Action" },
    12: { type: "Genre", name: "Adventure" },
    16: { type: "Genre", name: "Fantasy" }, // Animation — map to Fantasy
    35: { type: "Genre", name: "Comedy" },
    80: { type: "Mood", name: "Dark" }, // Crime
    99: { type: "Genre", name: "Drama" }, // Documentary
    18: { type: "Genre", name: "Drama" },
    10751: { type: "Theme", name: "Friendship" }, // Family
    14: { type: "Genre", name: "Fantasy" },
    36: { type: "Genre", name: "Drama" }, // History
    27: { type: "Mood", name: "Dark" }, // Horror
    10402: { type: "Mood", name: "Chill" }, // Music
    9648: { type: "Theme", name: "Mystery" },
    10749: { type: "Mood", name: "Emotional" }, // Romance
    878: { type: "Genre", name: "Sci-Fi" },
    10770: { type: "Genre", name: "Drama" }, // TV Movie
    53: { type: "Mood", name: "Dark" }, // Thriller
    10752: { type: "Genre", name: "Action" }, // War
    37: { type: "Genre", name: "Adventure" }, // Western
    // TV-specific genres
    10759: { type: "Genre", name: "Action" }, // Action & Adventure
    10762: { type: "Theme", name: "Coming of Age" }, // Kids
    10763: { type: "Genre", name: "Drama" }, // News
    10764: { type: "Mood", name: "Hype" }, // Reality
    10765: { type: "Genre", name: "Sci-Fi" }, // Sci-Fi & Fantasy (TV)
    10766: { type: "Genre", name: "Drama" }, // Soap
    10767: { type: "Mood", name: "Chill" }, // Talk
    10768: { type: "Genre", name: "Action" }, // War & Politics
};

// Google Books category string fragments → { type, name }
// Google returns strings like "Fiction / Science Fiction" or "Juvenile Fiction"
const BOOKS_CATEGORY_MAP = [
    { match: /science.fiction|sci.fi/i, tag: { type: "Genre", name: "Sci-Fi" } },
    { match: /fantasy/i, tag: { type: "Genre", name: "Fantasy" } },
    { match: /adventure/i, tag: { type: "Genre", name: "Adventure" } },
    { match: /action/i, tag: { type: "Genre", name: "Action" } },
    { match: /comedy|humor|humour/i, tag: { type: "Genre", name: "Comedy" } },
    { match: /drama/i, tag: { type: "Genre", name: "Drama" } },
    { match: /mystery|detective|crime/i, tag: { type: "Theme", name: "Mystery" } },
    { match: /horror|dark|dystop/i, tag: { type: "Mood", name: "Dark" } },
    { match: /romance|love/i, tag: { type: "Mood", name: "Emotional" } },
    { match: /juvenile|young adult|teen/i, tag: { type: "Theme", name: "Coming of Age" } },
    { match: /friendship|family/i, tag: { type: "Theme", name: "Friendship" } },
    { match: /thriller|suspense/i, tag: { type: "Mood", name: "Dark" } },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert tags into the DB and return their IDs.
 * Deduplicates by (type, name) before hitting the DB.
 */
async function upsertTags(tx, rawTags) {
    // Deduplicate — same type+name pair should only create one tag
    const seen = new Set();
    const unique = [];
    for (const t of rawTags) {
        const key = `${t.type}::${t.name}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(t);
        }
    }

    const tagIds = [];
    for (const t of unique) {
        const tag = await tx.tag.upsert({
            where: { name_type: { name: t.name, type: t.type } },
            update: {},
            create: { name: t.name, type: t.type },
        });
        tagIds.push(tag.id);
    }
    return tagIds;
}

/**
 * Map Jikan genres + themes arrays to our internal tag list.
 */
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

/**
 * Map TMDB genre_ids array to our internal tag list.
 */
function mapTmdbTags(genreIds = []) {
    const tags = [];
    for (const id of genreIds) {
        const mapped = TMDB_GENRE_MAP[id];
        if (mapped) tags.push(mapped);
    }
    return tags;
}

/**
 * Map Google Books categories array to our internal tag list.
 * Categories are strings like "Fiction / Science Fiction".
 */
function mapBooksTags(categories = []) {
    const tags = [];
    // Join all category strings and test each pattern against the full text
    const combined = categories.join(" / ").toLowerCase();
    for (const { match, tag } of BOOKS_CATEGORY_MAP) {
        if (match.test(combined)) tags.push(tag);
    }
    return tags;
}

// ─────────────────────────────────────────────────────────────────────────────
// INGESTION METHODS
// ─────────────────────────────────────────────────────────────────────────────

class IngestionService {
    /**
     * Anime / Manga via Jikan (MyAnimeList)
     * GET https://api.jikan.moe/v4/anime?q=<title>&limit=1
     */
    async ingestAnime(title, category = "Anime") {
        try {
            const type = category === "Manga" ? "manga" : "anime";
            const resp = await fetch(
                `https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(title)}&limit=1`
            );
            const json = await resp.json();
            const data = json.data?.[0];

            if (!data) return { ok: false, message: `No ${type} found: "${title}"` };

            // Check for duplicate before inserting
            const existing = await prisma.content.findFirst({
                where: { externalId: String(data.mal_id), source: "Jikan" },
            });
            if (existing) return { ok: true, content: existing, skipped: true };

            const rawTags = mapJikanTags(data.genres || [], data.themes || []);

            const content = await prisma.$transaction(async (tx) => {
                const tagIds = await upsertTags(tx, rawTags);
                return tx.content.create({
                    data: {
                        title: data.title_english || data.title,
                        category,
                        description: data.synopsis || "No description available.",
                        coverImage: data.images?.jpg?.large_image_url || data.images?.webp?.large_image_url || null,
                        externalId: String(data.mal_id),
                        source: "Jikan",
                        rating: data.score || null,
                        status: data.status || null,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            });

            return { ok: true, content };
        } catch (err) {
            console.error("ingestAnime error:", err);
            return { ok: false, message: err.message };
        }
    }

    /**
     * Movies / TV via TMDB
     * GET https://api.themoviedb.org/3/search/<movie|tv>?api_key=<key>&query=<title>
     */
    async ingestMovie(title, isTV = false) {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) {
            return {
                ok: false,
                message: "TMDB_API_KEY missing from .env — add it to ingest movies/TV.",
            };
        }

        try {
            const type = isTV ? "tv" : "movie";
            const resp = await fetch(
                `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=en-US&page=1`
            );
            const json = await resp.json();
            const data = json.results?.[0];

            if (!data) return { ok: false, message: `No ${type} found: "${title}"` };

            const externalId = String(data.id);
            const source = "TMDB";

            const existing = await prisma.content.findFirst({
                where: { externalId, source },
            });
            if (existing) return { ok: true, content: existing, skipped: true };

            // Map genre_ids → our tags
            const rawTags = mapTmdbTags(data.genre_ids || []);

            const content = await prisma.$transaction(async (tx) => {
                const tagIds = await upsertTags(tx, rawTags);
                return tx.content.create({
                    data: {
                        title: data.title || data.name,
                        category: isTV ? "TV" : "Movie",
                        description: data.overview || "No description available.",
                        coverImage: data.poster_path
                            ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
                            : null,
                        externalId,
                        source,
                        rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            });

            return { ok: true, content };
        } catch (err) {
            console.error("ingestMovie error:", err);
            return { ok: false, message: err.message };
        }
    }

    /**
     * Books via Google Books API
     * GET https://www.googleapis.com/books/v1/volumes?q=<title>&maxResults=1
     */
    async ingestBook(title) {
        try {
            const resp = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=1`
            );
            const json = await resp.json();
            const item = json.items?.[0];
            const data = item?.volumeInfo;

            if (!data) return { ok: false, message: `No book found: "${title}"` };

            const externalId = item.id;
            const source = "GoogleBooks";

            const existing = await prisma.content.findFirst({
                where: { externalId, source },
            });
            if (existing) return { ok: true, content: existing, skipped: true };

            const rawTags = mapBooksTags(data.categories || []);

            const content = await prisma.$transaction(async (tx) => {
                const tagIds = await upsertTags(tx, rawTags);
                return tx.content.create({
                    data: {
                        title: data.title,
                        category: "Book",
                        description: data.description || "No description available.",
                        coverImage: data.imageLinks?.thumbnail?.replace("http:", "https:") || null,
                        externalId,
                        source,
                        rating: data.averageRating || null,
                        tags: { create: tagIds.map(tid => ({ tagId: tid })) },
                    },
                    include: { tags: { include: { tag: true } } },
                });
            });

            return { ok: true, content };
        } catch (err) {
            console.error("ingestBook error:", err);
            return { ok: false, message: err.message };
        }
    }
}

module.exports = new IngestionService();