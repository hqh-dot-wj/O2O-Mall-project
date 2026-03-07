import { PrismaClient } from '@prisma/client';
import { seedTenants } from './tenants';

export async function seedTenantsPhase(prisma: PrismaClient) {
  await seedTenants(prisma);
}
