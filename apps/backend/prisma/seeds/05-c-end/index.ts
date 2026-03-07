import { PrismaClient } from '@prisma/client';
import { seedMembers } from './members';
import { seedMemberExtras } from './member-extras';
import { seedCouponsIssued } from './coupons-issued';

export async function seedCEnd(prisma: PrismaClient) {
  await seedMembers(prisma);
  await seedMemberExtras(prisma);
  await seedCouponsIssued(prisma);
}
