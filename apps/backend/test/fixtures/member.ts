/**
 * 会员 Fixture 工厂，用于单元/集成/E2E 测试。
 * 返回符合 Prisma UmsMember 结构的对象，可通过 opts 覆盖默认值。
 */
import { Decimal } from '@prisma/client/runtime/library';
import { MemberStatus } from '@prisma/client';

export interface MemberFixtureOpts {
  memberId?: string;
  tenantId?: string;
  nickname?: string;
  mobile?: string | null;
  parentId?: string | null;
  levelId?: number;
  points?: number;
  [key: string]: unknown;
}

const now = new Date();

export const createMemberFixture = (opts: MemberFixtureOpts = {}) => ({
  memberId: opts.memberId ?? `member-${Date.now()}`,
  tenantId: opts.tenantId ?? '00000',
  nickname: opts.nickname ?? '测试用户',
  avatar: null,
  mobile: opts.mobile ?? null,
  password: null,
  status: MemberStatus.NORMAL,
  levelId: opts.levelId ?? 0,
  balance: new Decimal(0),
  frozenBalance: new Decimal(0),
  points: opts.points ?? 0,
  parentId: opts.parentId ?? null,
  indirectParentId: opts.indirectParentId ?? null,
  referralCode: opts.referralCode ?? null,
  upgradedAt: null,
  upgradeOrderId: null,
  createTime: now,
  updateTime: now,
  ...opts,
});
