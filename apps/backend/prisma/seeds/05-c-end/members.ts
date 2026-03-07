/**
 * C 端会员：随机生成，必须含 parentId 上下级关系（三级分销链）
 */
import { PrismaClient, MemberStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const PASSWORD_HASH = '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS';

const SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴', '郑', '孙', '马', '朱'];
const GIVEN_NAMES = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟'];
const AVATARS = ['https://picsum.photos/seed/a1/200/200', 'https://picsum.photos/seed/a2/200/200', 'https://picsum.photos/seed/a3/200/200'];

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const USED_MOBILES = new Set<string>();
function mobile(tenantId: string, i: number, runSalt: number): string {
  // 11位手机号：138 + 8位，保证全局唯一
  let n = (parseInt(tenantId, 10) * 100 + i) * 10000 + (runSalt % 10000);
  n = n % 100000000;
  let m = '138' + String(n).padStart(8, '0');
  while (USED_MOBILES.has(m)) {
    n = (n + 1) % 100000000;
    m = '138' + String(n).padStart(8, '0');
  }
  USED_MOBILES.add(m);
  return m;
}
function nickname(): string {
  return rnd(SURNAMES) + rnd(GIVEN_NAMES);
}

export async function seedMembers(prisma: PrismaClient) {
  console.log('[05-CEnd] 会员（含上下级）...');
  USED_MOBILES.clear();

  const tenantIds = ['100001', '100002', '100003'];
  const countPerTenant = 12;

  for (const tenantId of tenantIds) {
    const existingCount = await prisma.umsMember.count({ where: { tenantId } });
    if (existingCount >= countPerTenant) continue; // 已初始化过，跳过
    const memberIds: string[] = [];
    const members: Array<{
      memberId: string;
      tenantId: string;
      nickname: string;
      avatar: string;
      mobile: string;
      password: string;
      status: MemberStatus;
      levelId: number;
      balance: Decimal;
      frozenBalance: Decimal;
      points: number;
      parentId?: string | null;
    }> = [];

    const runSuffix = Date.now() % 10000;
    for (let i = 0; i < countPerTenant; i++) {
      const mid = `mem-${tenantId}-${String(i + 1).padStart(3, '0')}-${Date.now().toString().slice(-6)}`;
      memberIds.push(mid);

      let parentId: string | null = null;
      if (i >= 2) {
        parentId = memberIds[Math.floor(Math.random() * (i - 1))];
      }

      members.push({
        memberId: mid,
        tenantId,
        nickname: nickname(),
        avatar: rnd(AVATARS),
        mobile: mobile(tenantId, i, runSuffix),
        password: PASSWORD_HASH,
        status: MemberStatus.NORMAL,
        levelId: Math.floor(Math.random() * 3) + 1,
        balance: new Decimal((Math.random() * 500).toFixed(2)),
        frozenBalance: new Decimal(0),
        points: Math.floor(Math.random() * 500),
        parentId,
      });
    }

    for (const m of members) {
      const exists = await prisma.umsMember.findUnique({ where: { memberId: m.memberId } });
      if (exists) continue;
      await prisma.umsMember.create({
        data: {
          memberId: m.memberId,
          tenantId: m.tenantId,
          nickname: m.nickname,
          avatar: m.avatar,
          mobile: m.mobile,
          password: m.password,
          status: m.status,
          levelId: m.levelId,
          balance: m.balance,
          frozenBalance: m.frozenBalance,
          points: m.points,
          ...(m.parentId && { parent: { connect: { memberId: m.parentId } } }),
        },
      });
    }
  }
  console.log(`  ✓ ${tenantIds.length * countPerTenant} 会员（含上下级关系）`);
}
