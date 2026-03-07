/**
 * 总部品牌（百货商品用）
 */
import { PrismaClient } from '@prisma/client';

export async function seedBrands(prisma: PrismaClient) {
  console.log('[01-HQ] 品牌...');

  const data = [
    { brandId: 1, name: '洁霸', logo: 'https://via.placeholder.com/100x100?text=JieBa' },
    { brandId: 2, name: '威猛先生', logo: 'https://via.placeholder.com/100x100?text=WeiMeng' },
    { brandId: 3, name: '得力', logo: 'https://via.placeholder.com/100x100?text=Deli' },
    { brandId: 4, name: '晨光', logo: 'https://via.placeholder.com/100x100?text=M&G' },
    { brandId: 5, name: '无印良品', logo: 'https://via.placeholder.com/100x100?text=MUJI' },
  ];

  for (const row of data) {
    await prisma.pmsBrand.upsert({
      where: { brandId: row.brandId },
      update: { name: row.name, logo: row.logo },
      create: row,
    });
  }
  console.log(`  ✓ ${data.length} 个品牌`);
}
