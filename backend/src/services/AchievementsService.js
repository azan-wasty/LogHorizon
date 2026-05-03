const prisma = require("../prismaClient");

const ACHIEVEMENTS = {
    FIRST_COMPLETE: { id: "FIRST_COMPLETE", title: "First Blood", description: "Complete your first entry", icon: "Swords" },
    LIBRARIAN: { id: "LIBRARIAN", title: "Librarian", description: "Add 10 items to your library", icon: "Database" },
    CRITIC: { id: "CRITIC", title: "Harsh Critic", description: "Rate 5 different items", icon: "Star" },
    OTAKU: { id: "OTAKU", title: "Otaku", description: "Complete 5 Anime or Manga", icon: "Zap" },
    CINEPHILE: { id: "CINEPHILE", title: "Cinephile", description: "Complete 5 Movies", icon: "Rocket" },
    BINGE_WATCHER: { id: "BINGE_WATCHER", title: "Binge Watcher", description: "Watch 3 titles simultaneously", icon: "Play" },
    COLLECTOR: { id: "COLLECTOR", title: "Collector", description: "Add 25 items to your library", icon: "Archive" },
    TV_ADDICT: { id: "TV_ADDICT", title: "TV Addict", description: "Complete 5 TV shows", icon: "Monitor" },
    MANGA_MASTER: { id: "MANGA_MASTER", title: "Manga Master", description: "Complete 5 Manga", icon: "BookOpen" },
    EXPLORER: { id: "EXPLORER", title: "Explorer", description: "Have items from all 4 categories", icon: "Compass" },
    PERFECTIONIST: { id: "PERFECTIONIST", title: "Perfectionist", description: "Rate 10 items with a 10/10", icon: "Crown" },
    SOCIAL_BUTTERFLY: { id: "SOCIAL_BUTTERFLY", title: "Social Butterfly", description: "Create your first community event", icon: "Users" },
    DEDICATED_FAN: { id: "DEDICATED_FAN", title: "Dedicated Fan", description: "Add 5 favourites", icon: "Heart" },
    VETERAN: { id: "VETERAN", title: "Veteran", description: "Complete 25 entries", icon: "Shield" },
    ELITE: { id: "ELITE", title: "Elite", description: "Complete 50 entries", icon: "Award" },
};

class AchievementsService {
    async checkAchievements(userId) {
        try {
            const library = await prisma.userLibrary.findMany({
                where: { userId },
                include: { content: true }
            });

            const completed = library.filter(l => l.status === "COMPLETED");
            const current = library.filter(l => l.status === "CURRENT");
            const rated = library.filter(l => l.rating !== null);

            const unlocked = new Set(
                (await prisma.userAchievement.findMany({ where: { userId } })).map(a => a.key)
            );

            const toUnlock = [];

            // FIRST_COMPLETE
            if (completed.length >= 1 && !unlocked.has("FIRST_COMPLETE")) toUnlock.push("FIRST_COMPLETE");

            // LIBRARIAN
            if (library.length >= 10 && !unlocked.has("LIBRARIAN")) toUnlock.push("LIBRARIAN");

            // CRITIC
            if (rated.length >= 5 && !unlocked.has("CRITIC")) toUnlock.push("CRITIC");

            // OTAKU
            const animeMangaCompleted = completed.filter(c => ["Anime", "Manga"].includes(c.content.category)).length;
            if (animeMangaCompleted >= 5 && !unlocked.has("OTAKU")) toUnlock.push("OTAKU");

            // CINEPHILE
            const moviesCompleted = completed.filter(c => c.content.category === "Movie").length;
            if (moviesCompleted >= 5 && !unlocked.has("CINEPHILE")) toUnlock.push("CINEPHILE");

            // BINGE_WATCHER — 3 titles currently being watched
            if (current.length >= 3 && !unlocked.has("BINGE_WATCHER")) toUnlock.push("BINGE_WATCHER");

            // COLLECTOR — 25 items in library
            if (library.length >= 25 && !unlocked.has("COLLECTOR")) toUnlock.push("COLLECTOR");

            // TV_ADDICT — 5 TV shows completed
            const tvCompleted = completed.filter(c => c.content.category === "TV").length;
            if (tvCompleted >= 5 && !unlocked.has("TV_ADDICT")) toUnlock.push("TV_ADDICT");

            // MANGA_MASTER — 5 Manga completed
            const mangaCompleted = completed.filter(c => c.content.category === "Manga").length;
            if (mangaCompleted >= 5 && !unlocked.has("MANGA_MASTER")) toUnlock.push("MANGA_MASTER");

            // EXPLORER — at least one item from each category
            const categories = new Set(library.map(l => l.content?.category).filter(Boolean));
            if (categories.size >= 4 && !unlocked.has("EXPLORER")) toUnlock.push("EXPLORER");

            // PERFECTIONIST — 10 items rated at max (10)
            const perfectRated = rated.filter(l => l.rating === 10).length;
            if (perfectRated >= 10 && !unlocked.has("PERFECTIONIST")) toUnlock.push("PERFECTIONIST");

            // VETERAN — 25 completed
            if (completed.length >= 25 && !unlocked.has("VETERAN")) toUnlock.push("VETERAN");

            // ELITE — 50 completed
            if (completed.length >= 50 && !unlocked.has("ELITE")) toUnlock.push("ELITE");

            // SOCIAL_BUTTERFLY — checked externally when creating an event
            // DEDICATED_FAN — checked externally when adding favourites

            if (toUnlock.length > 0) {
                await prisma.userAchievement.createMany({
                    data: toUnlock.map(key => ({ userId, key }))
                });
            }

            return toUnlock.map(k => ACHIEVEMENTS[k]);
        } catch (error) {
            console.error("checkAchievements error:", error);
            return [];
        }
    }

    /**
     * Check a specific single achievement by key
     */
    async checkSingleAchievement(userId, key) {
        try {
            const existing = await prisma.userAchievement.findUnique({
                where: { userId_key: { userId, key } }
            });
            if (existing) return null;

            await prisma.userAchievement.create({
                data: { userId, key }
            });
            return ACHIEVEMENTS[key] || null;
        } catch (error) {
            console.error("checkSingleAchievement error:", error);
            return null;
        }
    }

    async getUserAchievements(userId) {
        const userAch = await prisma.userAchievement.findMany({
            where: { userId },
            orderBy: { unlockedAt: "desc" }
        });
        return userAch.map(a => ({
            ...ACHIEVEMENTS[a.key],
            unlockedAt: a.unlockedAt
        })).filter(a => a.title); 
    }

    getAllAchievements() {
        return Object.values(ACHIEVEMENTS);
    }
}

module.exports = new AchievementsService();
