const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt.js");

const prisma = new PrismaClient();

async function main() {
    // Seed preference options (type: Genre/Theme/Mood)
    const preferenceOptions = [
        { type: "Genre", value: "Action" },
        { type: "Genre", value: "Romance" },
        { type: "Genre", value: "Fantasy" },
        { type: "Theme", value: "Adventure" },
        { type: "Theme", value: "Mystery" },
        { type: "Mood", value: "Chill" },
        { type: "Mood", value: "Dark" },
    ];

    for (const opt of preferenceOptions) {
        await prisma.preferenceOption.upsert({
            where: { type_value: { type: opt.type, value: opt.value } },
            update: {},
            create: opt,
        });
    }

    // Seed admin user
    const adminEmail = "admin@loghorizon.local";
    const adminUsername = "admin";
    const adminPassword = "admin123"; // change later

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            username: adminUsername,
            passwordHash,
            role: "Admin",
        },
    });

    console.log("Seed complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });