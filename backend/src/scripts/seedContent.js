/**
 * LogHorizon — Bulk Content Seed Script
 * ──────────────────────────────────────
 * Run from the /backend directory:
 *   node src/scripts/seedContent.js
 *
 * What it does:
 *   1. Seeds all PreferenceOptions (Genre / Mood / Theme) — idempotent
 *   2. Ingests a curated list of titles via IngestionService
 *   3. Skips duplicates automatically (checked by externalId + source)
 *   4. Applies a 1.2s delay between Jikan calls to respect their rate limit
 */

require("dotenv").config();
const prisma = require("../prismaClient");
const ingestionService = require("../services/IngestionService");

// ── Titles to ingest ──────────────────────────────────────────────────────────
// Spread across genres/moods so recommendation engine has enough variety to test
const SEED_LIST = [
    // Anime — covers Action, Adventure, Sci-Fi, Dark, Psychological, Hype, Emotional
    { title: "Attack on Titan", category: "Anime" },
    { title: "Fullmetal Alchemist Brotherhood", category: "Anime" },
    { title: "Death Note", category: "Anime" },
    { title: "Demon Slayer", category: "Anime" },
    { title: "Steins;Gate", category: "Anime" },
    { title: "Neon Genesis Evangelion", category: "Anime" },
    { title: "Hunter x Hunter", category: "Anime" },
    { title: "Spy x Family", category: "Anime" },
    { title: "Vinland Saga", category: "Anime" },
    { title: "Jujutsu Kaisen", category: "Anime" },
    { title: "Cowboy Bebop", category: "Anime" },
    { title: "Your Lie in April", category: "Anime" },

    // Manga — Action, Dark, Adventure, Drama
    { title: "Berserk", category: "Manga" },
    { title: "One Piece", category: "Manga" },
    { title: "Vagabond", category: "Manga" },
    { title: "Chainsaw Man", category: "Manga" },
    { title: "Blame!", category: "Manga" },

    // Movies — Sci-Fi, Drama, Thriller, Fantasy, Action
    { title: "Inception", category: "Movie" },
    { title: "Interstellar", category: "Movie" },
    { title: "Parasite", category: "Movie" },
    { title: "The Dark Knight", category: "Movie" },
    { title: "Spirited Away", category: "Movie" },
    { title: "Your Name", category: "Movie" },
    { title: "Blade Runner 2049", category: "Movie" },
    { title: "Everything Everywhere All at Once", category: "Movie" },

    // TV — Drama, Sci-Fi, Dark, Thriller
    { title: "Breaking Bad", category: "TV" },
    { title: "Chernobyl", category: "TV" },
    { title: "Dark", category: "TV" },
    { title: "Severance", category: "TV" },
    { title: "The Last of Us", category: "TV" },

    // Books — Sci-Fi, Fantasy, Adventure, Mystery, Dark
    { title: "Dune", category: "Book" },
    { title: "1984", category: "Book" },
    { title: "The Hitchhiker's Guide to the Galaxy", category: "Book" },
    { title: "Ender's Game", category: "Book" },
    { title: "Neuromancer", category: "Book" },
];

// ── Preference options to seed ────────────────────────────────────────────────
const PREFERENCE_OPTIONS = [
    { type: "Genre", value: "Action" },
    { type: "Genre", value: "Adventure" },
    { type: "Genre", value: "Comedy" },
    { type: "Genre", value: "Drama" },
    { type: "Genre", value: "Fantasy" },
    { type: "Genre", value: "Sci-Fi" },
    { type: "Theme", value: "Friendship" },
    { type: "Theme", value: "Coming of Age" },
    { type: "Theme", value: "Revenge" },
    { type: "Theme", value: "Mystery" },
    { type: "Mood", value: "Chill" },
    { type: "Mood", value: "Hype" },
    { type: "Mood", value: "Dark" },
    { type: "Mood", value: "Emotional" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAD = (n, total) => `[${String(n).padStart(String(total).length, "0")}/${total}]`;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   LogHorizon · Bulk Content Seed  (Sprint 2)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // ── 1. Seed preference options ──────────────────────────────────────────────
    console.log("🌱  Seeding preference options...");
    for (const opt of PREFERENCE_OPTIONS) {
        await prisma.preferenceOption.upsert({
            where: { type_value: { type: opt.type, value: opt.value } },
            update: {},
            create: opt,
        });
    }
    console.log(`  ${PREFERENCE_OPTIONS.length} preference options ready.\n`);

    // ── 2. Ingest content ───────────────────────────────────────────────────────
    console.log(`🚀  Ingesting ${SEED_LIST.length} titles...\n`);

    const results = { success: 0, skipped: 0, failed: [] };

    for (let i = 0; i < SEED_LIST.length; i++) {
        const { title, category } = SEED_LIST[i];
        const prefix = PAD(i + 1, SEED_LIST.length);

        process.stdout.write(`  ${prefix} [${category.padEnd(5)}] "${title}" ... `);

        try {
            let result;

            if (category === "Anime" || category === "Manga") {
                result = await ingestionService.ingestAnime(title, category);
                // Jikan rate limit: stay under 3 req/s
                await sleep(1200);
            } else if (category === "Movie") {
                result = await ingestionService.ingestMovie(title, false);
                await sleep(300);
            } else if (category === "TV") {
                result = await ingestionService.ingestMovie(title, true);
                await sleep(300);
            } else if (category === "Book") {
                result = await ingestionService.ingestBook(title);
                await sleep(300);
            } else if (category === "Game") {
                result = await ingestionService.ingestGame(title);
                await sleep(300);
            }

            if (!result) {
                console.log("  No result returned");
                results.failed.push({ title, category, reason: "no result" });
                continue;
            }

            if (result.skipped) {
                console.log("⏭️  already exists");
                results.skipped++;
                continue;
            }

            if (!result.ok) {
                console.log(`  ${result.message}`);
                results.failed.push({ title, category, reason: result.message });
                continue;
            }

            // Show which tags were assigned
            const tagNames = result.content?.tags?.map((ct) => ct.tag?.name || ct.name).filter(Boolean) || [];
            const tagStr = tagNames.length ? tagNames.join(", ") : "no tags";
            console.log(`  [${tagStr}]`);
            results.success++;

        } catch (err) {
            console.log(`  ${err.message}`);
            results.failed.push({ title, category, reason: err.message });
            // Still wait to avoid hammering APIs on retry
            await sleep(1000);
        }
    }

    // ── 3. Summary ──────────────────────────────────────────────────────────────
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("   SEED COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`    Ingested : ${results.success}`);
    console.log(`    Skipped  : ${results.skipped}`);
    console.log(`    Failed   : ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log("\n   Failed titles:");
        results.failed.forEach(({ title, category, reason }) => {
            console.log(`     • [${category}] "${title}" — ${reason}`);
        });
        console.log("\n   Tip: Re-run the script to retry failed titles.");
        console.log("   Already-ingested titles will be skipped automatically.");
    }

    console.log("");
}

main()
    .catch((err) => {
        console.error("\n  Fatal error:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());