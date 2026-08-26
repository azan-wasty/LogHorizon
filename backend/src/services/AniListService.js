// AniList GraphQL Wrapper Service for Anime & Manga
const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const ANILIST_GENRE_MAP = {
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
    "Supernatural": { type: "Genre", name: "Fantasy" },
    "Sports": { type: "Mood", name: "Hype" },
    "Music": { type: "Mood", name: "Chill" },
    "Ecchi": { type: "Mood", name: "Chill" },
    "Mecha": { type: "Genre", name: "Sci-Fi" },
    "Mahou Shoujo": { type: "Genre", name: "Fantasy" },
};

const ANILIST_TAG_MAP = {
    "Coming of Age": { type: "Theme", name: "Coming of Age" },
    "School": { type: "Theme", name: "Coming of Age" },
    "School Club": { type: "Theme", name: "Coming of Age" },
    "Revenge": { type: "Theme", name: "Revenge" },
    "Friendship": { type: "Theme", name: "Friendship" },
    "Family Life": { type: "Theme", name: "Friendship" },
    "Tragedy": { type: "Mood", name: "Emotional" },
    "Cyberpunk": { type: "Genre", name: "Sci-Fi" },
    "Time Travel": { type: "Genre", name: "Sci-Fi" },
    "Space": { type: "Genre", name: "Sci-Fi" },
    "Isekai": { type: "Genre", name: "Fantasy" },
    "Super Power": { type: "Mood", name: "Hype" },
    "Military": { type: "Genre", name: "Action" },
    "Survival": { type: "Mood", name: "Dark" },
    "Historical": { type: "Genre", name: "Drama" },
    "Demons": { type: "Genre", name: "Fantasy" },
    "Magic": { type: "Genre", name: "Fantasy" },
    "Vampire": { type: "Mood", name: "Dark" },
    "Martial Arts": { type: "Genre", name: "Action" },
    "Gore": { type: "Mood", name: "Dark" },
    "Steampunk": { type: "Genre", name: "Sci-Fi" },
    "Battle Royale": { type: "Mood", name: "Hype" },
    "Workplace": { type: "Mood", name: "Chill" },
    "Samurai": { type: "Genre", name: "Action" },
};

function cleanHtml(html) {
    if (!html) return "";
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
}

function mapAniListTags(genres = [], tags = []) {
    const rawTags = [];
    for (const g of genres) {
        const mapped = ANILIST_GENRE_MAP[g];
        if (mapped) rawTags.push(mapped);
    }
    for (const t of tags) {
        const tagName = typeof t === "string" ? t : t?.name;
        if (!tagName) continue;
        const mapped = ANILIST_TAG_MAP[tagName];
        if (mapped) rawTags.push(mapped);
    }
    return rawTags;
}

function mapAniListStatus(status) {
    switch (status) {
        case "RELEASING":
            return "Airing";
        case "FINISHED":
            return "Finished";
        case "NOT_YET_RELEASED":
            return "Upcoming";
        case "CANCELLED":
            return "Cancelled";
        case "HIATUS":
            return "Hiatus";
        default:
            return status || null;
    }
}

class AniListService {
    async query(graphqlQuery, variables = {}) {
        const res = await fetch(ANILIST_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "LogHorizon/1.0.0 (Research Project)"
            },
            body: JSON.stringify({ query: graphqlQuery, variables }),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`AniList API returned ${res.status}: ${text || res.statusText}`);
        }

        const json = await res.json();
        if (json.errors && json.errors.length > 0) {
            throw new Error(json.errors[0].message || "AniList GraphQL error");
        }
        return json.data;
    }

    /**
     * Search a single Anime or Manga by title
     */
    async searchMedia(title, category = "Anime") {
        const isManga = category.toLowerCase() === "manga";
        const type = isManga ? "MANGA" : "ANIME";

        const query = `
            query ($search: String, $type: MediaType) {
                Media(search: $search, type: $type) {
                    id
                    idMal
                    title {
                        english
                        romaji
                        native
                    }
                    type
                    format
                    status
                    description
                    episodes
                    chapters
                    volumes
                    averageScore
                    coverImage {
                        extraLarge
                        large
                    }
                    bannerImage
                    genres
                    tags {
                        name
                        rank
                    }
                    siteUrl
                    streamingEpisodes {
                        title
                        thumbnail
                        url
                        site
                    }
                }
            }
        `;

        const data = await this.query(query, { search: title, type });
        return data?.Media || null;
    }

    /**
     * Fetch media by AniList ID
     */
    async getMediaById(id, category = "Anime") {
        const isManga = category.toLowerCase() === "manga";
        const type = isManga ? "MANGA" : "ANIME";

        const query = `
            query ($id: Int, $type: MediaType) {
                Media(id: $id, type: $type) {
                    id
                    idMal
                    title {
                        english
                        romaji
                        native
                    }
                    type
                    format
                    status
                    description
                    episodes
                    chapters
                    volumes
                    averageScore
                    coverImage {
                        extraLarge
                        large
                    }
                    bannerImage
                    genres
                    tags {
                        name
                        rank
                    }
                    siteUrl
                    streamingEpisodes {
                        title
                        thumbnail
                        url
                        site
                    }
                }
            }
        `;

        const data = await this.query(query, { id: Number(id), type });
        return data?.Media || null;
    }

    /**
     * Fetch media by MAL ID
     */
    async getMediaByMalId(idMal, category = "Anime") {
        const isManga = category.toLowerCase() === "manga";
        const type = isManga ? "MANGA" : "ANIME";

        const query = `
            query ($idMal: Int, $type: MediaType) {
                Media(idMal: $idMal, type: $type) {
                    id
                    idMal
                    title {
                        english
                        romaji
                        native
                    }
                    type
                    format
                    status
                    description
                    episodes
                    chapters
                    volumes
                    averageScore
                    coverImage {
                        extraLarge
                        large
                    }
                    bannerImage
                    genres
                    tags {
                        name
                        rank
                    }
                    siteUrl
                    streamingEpisodes {
                        title
                        thumbnail
                        url
                        site
                    }
                }
            }
        `;

        const data = await this.query(query, { idMal: Number(idMal), type });
        return data?.Media || null;
    }

    /**
     * Discover media page with sorting and filters
     */
    async discoverMedia({ category = "Anime", mode = "popular", page = 1, perPage = 25, query: searchQuery = "" }) {
        const isManga = category.toLowerCase() === "manga";
        const type = isManga ? "MANGA" : "ANIME";

        let sort = ["POPULARITY_DESC"];
        let status = undefined;

        if (mode === "top_rated") {
            sort = ["SCORE_DESC"];
        } else if (mode === "trending") {
            sort = ["TRENDING_DESC"];
        } else if (mode === "upcoming") {
            sort = ["POPULARITY_DESC"];
            status = "NOT_YET_RELEASED";
        } else if (mode === "search" && searchQuery) {
            sort = ["SEARCH_MATCH", "POPULARITY_DESC"];
        }

        const graphqlQuery = `
            query ($page: Int, $perPage: Int, $type: MediaType, $sort: [MediaSort], $search: String, $status: MediaStatus) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                    }
                    media(type: $type, sort: $sort, search: $search, status: $status) {
                        id
                        idMal
                        title {
                            english
                            romaji
                            native
                        }
                        type
                        format
                        status
                        description
                        episodes
                        chapters
                        volumes
                        averageScore
                        coverImage {
                            extraLarge
                            large
                        }
                        bannerImage
                        genres
                        tags {
                            name
                            rank
                        }
                        siteUrl
                    }
                }
            }
        `;

        const variables = {
            page: Number(page),
            perPage: Number(perPage),
            type,
            sort,
            search: searchQuery || undefined,
            status,
        };

        const data = await this.query(graphqlQuery, variables);
        return {
            pageInfo: data?.Page?.pageInfo || {},
            items: data?.Page?.media || [],
        };
    }

    /**
     * Fetch episodes details for an anime
     */
    async getEpisodes(mediaId) {
        const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    idMal
                    episodes
                    status
                    streamingEpisodes {
                        title
                        thumbnail
                        url
                        site
                    }
                }
            }
        `;
        const data = await this.query(query, { id: Number(mediaId) });
        const media = data?.Media;
        if (!media) return null;

        const totalEpisodes = media.episodes || media.streamingEpisodes?.length || null;
        const streaming = media.streamingEpisodes || [];

        // Build list of episodes
        const episodesList = [];
        const count = totalEpisodes || streaming.length || 0;

        for (let i = 1; i <= count; i++) {
            const streamInfo = streaming[i - 1];
            episodesList.push({
                episodeNumber: i,
                title: streamInfo?.title || `Episode ${i}`,
                thumbnail: streamInfo?.thumbnail || null,
                url: streamInfo?.url || null,
                site: streamInfo?.site || null,
            });
        }

        return {
            totalEpisodes,
            episodes: episodesList,
        };
    }
}

module.exports = {
    AniListService: new AniListService(),
    mapAniListTags,
    mapAniListStatus,
    cleanHtml,
};
