import { PrismaClient } from '@prisma/client';
import { seedTenantProducts } from './tenant-products';
import { seedTenantMarketing } from './tenant-marketing';

export async function seedTenantSelection(prisma: PrismaClient) {
  await seedTenantProducts(prisma);
  await seedTenantMarketing(prisma);
}
