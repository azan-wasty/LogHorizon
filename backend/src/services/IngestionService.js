const prisma = require("../prismaClient");

/**
 * Service to fetch metadata from external APIs and save to database.
 */
class IngestionService {
    /**
     * Fetch anime metadata from Jikan API (MyAnimeList)
     * URL: https://api.jikan.moe/v4/anime?q=[title]&limit=1
     */
    async ingestAnime(title) {
        try {
            const resp = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
            const json = await resp.json();
            const data = json.data?.[0];

            if (!data) return { ok: false, message: "No anime found with that title." };

            // Map Jikan genres/themes to our Tag model
            const genres = data.genres?.map(g => ({ name: g.name, type: "Genre" })) || [];
            const themes = data.themes?.map(t => ({ name: t.name, type: "Mood" })) || []; // Using Mood as a catch-all for themes for now
            const allTags = [...genres, ...themes];

            // Use transaction to ensure data integrity
            const content = await prisma.$transaction(async (tx) => {
                // Upsert tags
                const tagIds = [];
                for (const t of allTags) {
                    const tag = await tx.tag.upsert({
                        where: { name_type: { name: t.name, type: t.type } },
                        update: {},
                        create: { name: t.name, type: t.type },
                    });
                    tagIds.push(tag.id);
                }

                // Create content
                return tx.content.create({
                    data: {
                        title: data.title,
                        category: "Anime",
                        description: data.synopsis || "No description available.",
                        coverImage: data.images?.jpg?.large_image_url || data.images?.webp?.large_image_url,
                        externalId: String(data.mal_id),
                        source: "Jikan",
                        rating: data.score || 0,
                        tags: {
                            create: tagIds.map(tid => ({ tagId: tid }))
                        }
                    },
                    include: { tags: { include: { tag: true } } }
                });
            });

            return { ok: true, content };
        } catch (err) {
            console.error("ingestAnime error:", err);
            return { ok: false, message: err.message };
        }
    }

    /**
     * Fetch movie/TV metadata from TMDB API
     * Requires process.env.TMDB_API_KEY
     */
    async ingestMovie(title, isTV = false) {
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) {
            return { ok: false, message: "TMDB_API_KEY is missing in your .env file. Please add it to start scanning movies/TV." };
        }

        try {
            const query = encodeURIComponent(title);
            const type = isTV ? 'tv' : 'movie';
            const resp = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${query}&language=en-US&page=1`);
            const json = await resp.json();
            const data = json.results?.[0];

            if (!data) return { ok: false, message: `No ${type} found with that title.` };

            // Note: TMDB returns genre_ids, which requires a separate call to map to names.
            // For now, we'll label generic genres or skip tag mapping until key is verified.
            const content = await prisma.content.create({
                data: {
                    title: data.title || data.name,
                    category: isTV ? "TV" : "Movie",
                    description: data.overview || "No description available.",
                    coverImage: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
                    externalId: String(data.id),
                    source: "TMDB",
                    rating: data.vote_average || 0,
                },
                include: { tags: { include: { tag: true } } }
            });

            return { ok: true, content };
        } catch (err) {
            console.error("ingestMovie error:", err);
            return { ok: false, message: err.message };
        }
    }

    /**
     * Fetch book metadata from Google Books API
     * URL: https://www.googleapis.com/books/v1/volumes?q=[title]&maxResults=1
     */
    async ingestBook(title) {
        try {
            const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=1`);
            const json = await resp.json();
            const data = json.items?.[0]?.volumeInfo;

            if (!data) return { ok: false, message: "No book found with that title." };

            const category = "Book";
            const genres = data.categories?.map(c => ({ name: c, type: "Genre" })) || [];
            
            const content = await prisma.$transaction(async (tx) => {
                const tagIds = [];
                for (const t of genres) {
                    const tag = await tx.tag.upsert({
                        where: { name_type: { name: t.name, type: t.type } },
                        update: {},
                        create: { name: t.name, type: t.type },
                    });
                    tagIds.push(tag.id);
                }

                return tx.content.create({
                    data: {
                        title: data.title,
                        category,
                        description: data.description || "No description available.",
                        coverImage: data.imageLinks?.thumbnail?.replace('http:', 'https:'),
                        externalId: json.items[0].id,
                        source: "GoogleBooks",
                        rating: data.averageRating || 0,
                        tags: {
                            create: tagIds.map(tid => ({ tagId: tid }))
                        }
                    },
                    include: { tags: { include: { tag: true } } }
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
