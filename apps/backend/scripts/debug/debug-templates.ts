import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.playTemplate.count();
    console.log('--- PlayTemplate Count:', count);
    const items = await prisma.playTemplate.findMany();
    console.log('--- PlayTemplate Items:', JSON.stringify(items, null, 2));
}
main().finally(() => prisma.$disconnect());
