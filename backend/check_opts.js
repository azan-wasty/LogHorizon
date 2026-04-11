const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const opts = await prisma.preferenceOption.findMany();
  console.log(JSON.stringify(opts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
