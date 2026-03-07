import { PrismaClient } from '@prisma/client';
import { seedDistConfig } from './dist-config';

export async function seedSystemConfig(prisma: PrismaClient) {
  await seedDistConfig(prisma);
}
