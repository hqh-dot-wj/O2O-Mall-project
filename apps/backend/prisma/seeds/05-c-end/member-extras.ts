/**
 * 会员扩展：地址、钱包、积分账户（参数完全填充）
 */
import { PrismaClient, WalletStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function seedMemberExtras(prisma: PrismaClient) {
  console.log('[05-CEnd] 会员地址/钱包/积分账户...');

  const members = await prisma.umsMember.findMany({ select: { memberId: true, tenantId: true } });

  for (const m of members) {
    const hasAddr = await prisma.umsAddress.findFirst({ where: { memberId: m.memberId } });
    if (!hasAddr) {
      await prisma.umsAddress.create({
        data: {
          memberId: m.memberId,
          name: '收件人',
          phone: '13800000000',
          province: '湖南省',
          city: '长沙市',
          district: '天心区',
          detail: '某某小区1栋101',
          latitude: 28.2282,
          longitude: 112.9388,
          isDefault: true,
          tag: '家',
        },
      });
    }

    const hasWallet = await prisma.finWallet.findFirst({ where: { memberId: m.memberId } });
    if (!hasWallet) {
      await prisma.finWallet.create({
        data: {
          tenantId: m.tenantId,
          memberId: m.memberId,
          balance: new Decimal(Number(m.memberId.slice(-3) || 0) % 100),
          frozen: new Decimal(0),
          totalIncome: new Decimal(0),
          pendingRecovery: new Decimal(0),
          status: WalletStatus.NORMAL,
          frozenReason: null,
          frozenAt: null,
          frozenBy: null,
          payPassword: null,
          version: 0,
        },
      });
    }

    const hasPoints = await prisma.mktPointsAccount.findFirst({ where: { tenantId: m.tenantId, memberId: m.memberId } });
    if (!hasPoints) {
      const pts = Math.floor(Math.random() * 200);
      const available = Math.floor(Math.random() * 150);
      await prisma.mktPointsAccount.create({
        data: {
          tenantId: m.tenantId,
          memberId: m.memberId,
          totalPoints: pts,
          availablePoints: available,
          frozenPoints: 0,
          usedPoints: Math.max(0, pts - available),
          expiredPoints: 0,
          version: 0,
        },
      });
    }
  }
  console.log('  ✓ 地址/钱包/积分账户');
}
