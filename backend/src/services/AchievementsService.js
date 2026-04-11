const prisma = require("../prismaClient");

const ACHIEVEMENTS = {
    FIRST_COMPLETE: { id: "FIRST_COMPLETE", title: "First Blood", description: "Complete your first entry", icon: "Swords" },
    LIBRARIAN: { id: "LIBRARIAN", title: "Librarian", description: "Add 10 items to your library", icon: "Database" },
    CRITIC: { id: "CRITIC", title: "Harsh Critic", description: "Rate 5 different items", icon: "Star" },
    OTAKU: { id: "OTAKU", title: "Otaku", description: "Complete 5 Anime or Manga", icon: "Zap" },
    CINEPHILE: { id: "CINEPHILE", title: "Cinephile", description: "Complete 5 Movies", icon: "Rocket" },
    BOOKWORM: { id: "BOOKWORM", title: "Bookworm", description: "Complete 5 Books", icon: "Compass" }
};

class AchievementsService {
    async checkAchievements(userId) {
        try {
            const library = await prisma.userLibrary.findMany({
                where: { userId },
                include: { content: true }
            });

            const completed = library.filter(l => l.status === "COMPLETED");
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

            // BOOKWORM
            const booksCompleted = completed.filter(c => c.content.category === "Book").length;
            if (booksCompleted >= 5 && !unlocked.has("BOOKWORM")) toUnlock.push("BOOKWORM");

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
