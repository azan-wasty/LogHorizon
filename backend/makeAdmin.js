const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: node makeAdmin.js your@email.com');
        process.exit(1);
    }

    const user = await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' },
        select: { id: true, username: true, email: true, role: true }
    });

    console.log('Done!', user);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());