import { PrismaClient } from '@prisma/client';
import { seedCategories } from './categories';
import { seedBrands } from './brands';
import { seedAttrTemplates } from './attr-templates';
import { seedProducts } from './products';
import { seedPlayTemplates } from './play-templates';

export async function seedHqFoundation(prisma: PrismaClient) {
  await seedCategories(prisma);
  await seedBrands(prisma);
  await seedAttrTemplates(prisma);
  await seedProducts(prisma);
  await seedPlayTemplates(prisma);
}
