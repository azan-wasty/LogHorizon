const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prefs = await prisma.userPreference.findMany({
    include: { option: true, user: { select: { email: true } } }
  });
  console.log(JSON.stringify(prefs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
