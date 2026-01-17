import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const menus = await prisma.sysMenu.findMany({
        where: { delFlag: 'NORMAL' },
        select: { menuId: true, menuName: true }
    });
    console.log(JSON.stringify(menus, null, 2));
}
main().finally(() => prisma.$disconnect());
