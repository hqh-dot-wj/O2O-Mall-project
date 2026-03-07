/**
 * 总部商品分类：≥10 个，偏百货 + 素质教育
 */
import { PrismaClient } from '@prisma/client';

export async function seedCategories(prisma: PrismaClient) {
  console.log('[01-HQ] 商品分类...');

  const data = [
    // 百货零售 (一级)
    { catId: 1, parentId: null, name: '百货零售', level: 1, icon: '🛒', sort: 1, bindType: 'REAL' as const },
    // 百货二级
    { catId: 101, parentId: 1, name: '家居用品', level: 2, icon: '🏠', sort: 1, bindType: 'REAL' as const },
    { catId: 102, parentId: 1, name: '美妆个护', level: 2, icon: '💄', sort: 2, bindType: 'REAL' as const },
    { catId: 103, parentId: 1, name: '母婴用品', level: 2, icon: '👶', sort: 3, bindType: 'REAL' as const },
    { catId: 104, parentId: 1, name: '数码配件', level: 2, icon: '📱', sort: 4, bindType: 'REAL' as const },
    { catId: 105, parentId: 1, name: '食品饮料', level: 2, icon: '🍎', sort: 5, bindType: 'REAL' as const },
    // 素质教育 (一级)
    { catId: 2, parentId: null, name: '素质教育', level: 1, icon: '📚', sort: 2, bindType: 'SERVICE' as const },
    // 素质教育二级
    { catId: 201, parentId: 2, name: '艺术培训', level: 2, icon: '🎨', sort: 1, bindType: 'SERVICE' as const },
    { catId: 202, parentId: 2, name: '体育培训', level: 2, icon: '⚽', sort: 2, bindType: 'SERVICE' as const },
    { catId: 203, parentId: 2, name: '语言培训', level: 2, icon: '🌐', sort: 3, bindType: 'SERVICE' as const },
    { catId: 204, parentId: 2, name: '科创培训', level: 2, icon: '🤖', sort: 4, bindType: 'SERVICE' as const },
    { catId: 205, parentId: 2, name: '思维培训', level: 2, icon: '🧩', sort: 5, bindType: 'SERVICE' as const },
  ];

  for (const row of data) {
    await prisma.pmsCategory.upsert({
      where: { catId: row.catId },
      update: { name: row.name, level: row.level, sort: row.sort, bindType: row.bindType, icon: row.icon, attrTemplateId: null },
      create: {
        ...row,
        attrTemplateId: null,
      } as Parameters<typeof prisma.pmsCategory.create>[0]['data'],
    });
  }
  console.log(`  ✓ ${data.length} 个分类`);
}
