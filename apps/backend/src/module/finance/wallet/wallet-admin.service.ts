import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { FormatDateFields } from 'src/common/utils';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { FinanceEventEmitter } from '../events/finance-event.emitter';

/**
 * 钱包状态枚举
 * 注意：等 Prisma migration 完成后，可改为从 @prisma/client 导入
 */
const WalletStatus = {
  NORMAL: 'NORMAL',
  FROZEN: 'FROZEN',
  DISABLED: 'DISABLED',
} as const;

type WalletStatusType = (typeof WalletStatus)[keyof typeof WalletStatus];

/**
 * 钱包管理服务（Admin端）
 * 
 * @description
 * W-T7: 钱包统计功能
 * W-T8: 异常钱包监控
 * W-T9: 钱包冻结功能
 * W-T10: 批量查询优化
 */
@Injectable()
export class WalletAdminService {
  private readonly logger = new Logger(WalletAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: FinanceEventEmitter,
  ) {}

  // ========== W-T7: 钱包统计功能 ==========

  /**
   * 获取钱包统计数据
   * 
   * @description
   * R-FLOW-WALLET-STATS-01: 统计钱包总览数据
   */
  async getWalletStats() {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const baseWhere = isSuper ? {} : { tenantId };

    const [totalStats, statusStats, pendingRecoveryStats] = await Promise.all([
      // 总体统计
      this.prisma.finWallet.aggregate({
        where: baseWhere,
        _count: true,
        _sum: {
          balance: true,
          frozen: true,
          totalIncome: true,
          pendingRecovery: true,
        },
      }),
      // 按状态统计
      this.prisma.finWallet.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
      // 有待回收余额的钱包数
      this.prisma.finWallet.count({
        where: {
          ...baseWhere,
          pendingRecovery: { gt: 0 },
        },
      }),
    ]);

    const statusMap = new Map(statusStats.map((s) => [s.status, s._count]));

    return Result.ok({
      totalWallets: totalStats._count,
      totalBalance: Number(totalStats._sum.balance ?? 0),
      totalFrozen: Number(totalStats._sum.frozen ?? 0),
      totalIncome: Number(totalStats._sum.totalIncome ?? 0),
      totalPendingRecovery: Number(totalStats._sum.pendingRecovery ?? 0),
      normalWallets: statusMap.get(WalletStatus.NORMAL) ?? 0,
      frozenWallets: statusMap.get(WalletStatus.FROZEN) ?? 0,
      disabledWallets: statusMap.get(WalletStatus.DISABLED) ?? 0,
      pendingRecoveryWallets: pendingRecoveryStats,
    });
  }

  // ========== W-T8: 异常钱包监控 ==========

  /**
   * 获取异常钱包列表
   * 
   * @description
   * R-FLOW-WALLET-MONITOR-01: 监控异常钱包
   * 异常定义：
   * - 有待回收余额
   * - 余额为负（理论上不应该发生）
   * - 被冻结的钱包
   */
  async getAbnormalWallets(page: number = 1, size: number = 20) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const baseWhere = isSuper ? {} : { tenantId };

    const where: Prisma.FinWalletWhereInput = {
      ...baseWhere,
      OR: [
        { pendingRecovery: { gt: 0 } },
        { balance: { lt: 0 } },
        { status: { not: WalletStatus.NORMAL } },
      ],
    };

    const [list, total] = await Promise.all([
      this.prisma.finWallet.findMany({
        where,
        include: {
          member: {
            select: {
              memberId: true,
              nickname: true,
              mobile: true,
              avatar: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.finWallet.count({ where }),
    ]);

    const formattedList = list.map((wallet) => ({
      id: wallet.id,
      memberId: wallet.memberId,
      memberName: wallet.member?.nickname ?? '未知',
      memberMobile: wallet.member?.mobile ?? '',
      memberAvatar: wallet.member?.avatar ?? '',
      balance: Number(wallet.balance),
      frozen: Number(wallet.frozen),
      totalIncome: Number(wallet.totalIncome),
      pendingRecovery: Number(wallet.pendingRecovery),
      status: wallet.status,
      frozenReason: wallet.frozenReason,
      frozenAt: wallet.frozenAt,
      frozenBy: wallet.frozenBy,
      abnormalReasons: this.getAbnormalReasons(wallet),
      updatedAt: wallet.updatedAt,
    }));

    return Result.page(FormatDateFields(formattedList), total);
  }

  /**
   * 获取异常原因列表
   */
  private getAbnormalReasons(wallet: {
    pendingRecovery: Decimal;
    balance: Decimal;
    status: string;
  }): string[] {
    const reasons: string[] = [];
    if (wallet.pendingRecovery.gt(0)) {
      reasons.push(`待回收余额 ${wallet.pendingRecovery} 元`);
    }
    if (wallet.balance.lt(0)) {
      reasons.push(`余额为负 ${wallet.balance} 元`);
    }
    if (wallet.status === WalletStatus.FROZEN) {
      reasons.push('钱包已冻结');
    }
    if (wallet.status === WalletStatus.DISABLED) {
      reasons.push('钱包已禁用');
    }
    return reasons;
  }

  // ========== W-T9: 钱包冻结功能 ==========

  /**
   * 冻结钱包
   * 
   * @description
   * R-FLOW-WALLET-FREEZE-01: 冻结异常用户钱包
   */
  async freezeWallet(walletId: string, reason: string, operatorId: string) {
    const wallet = await this.prisma.finWallet.findUnique({
      where: { id: walletId },
    });

    BusinessException.throwIfNull(wallet, '钱包不存在');
    BusinessException.throwIf(
      wallet.status === WalletStatus.FROZEN,
      '钱包已处于冻结状态',
    );

    const updated = await this.prisma.finWallet.update({
      where: { id: walletId },
      data: {
        status: WalletStatus.FROZEN,
        frozenReason: reason,
        frozenAt: new Date(),
        frozenBy: operatorId,
        version: { increment: 1 },
      },
    });

    this.logger.warn(`[钱包冻结] 钱包 ${walletId} 被 ${operatorId} 冻结，原因: ${reason}`);

    // 发送钱包冻结事件
    await this.eventEmitter.emit({
      type: 'wallet.frozen' as never,
      tenantId: wallet.tenantId,
      memberId: wallet.memberId,
      payload: { walletId, reason, operatorId },
      timestamp: new Date(),
    });

    return Result.ok(FormatDateFields(updated), '钱包已冻结');
  }

  /**
   * 解冻钱包
   * 
   * @description
   * R-FLOW-WALLET-UNFREEZE-01: 解冻钱包
   */
  async unfreezeWallet(walletId: string, operatorId: string) {
    const wallet = await this.prisma.finWallet.findUnique({
      where: { id: walletId },
    });

    BusinessException.throwIfNull(wallet, '钱包不存在');
    BusinessException.throwIf(
      wallet.status !== WalletStatus.FROZEN,
      '钱包未处于冻结状态',
    );

    const updated = await this.prisma.finWallet.update({
      where: { id: walletId },
      data: {
        status: WalletStatus.NORMAL,
        frozenReason: null,
        frozenAt: null,
        frozenBy: null,
        version: { increment: 1 },
      },
    });

    this.logger.log(`[钱包解冻] 钱包 ${walletId} 被 ${operatorId} 解冻`);

    return Result.ok(FormatDateFields(updated), '钱包已解冻');
  }

  // ========== W-T10: 批量查询优化 ==========

  /**
   * 批量获取钱包信息
   * 
   * @description
   * R-FLOW-WALLET-BATCH-01: 批量查询钱包，避免 N+1
   */
  async getWalletsByMemberIds(memberIds: string[]) {
    BusinessException.throwIf(memberIds.length > 100, '单次最多查询 100 个钱包');

    const wallets = await this.prisma.finWallet.findMany({
      where: { memberId: { in: memberIds } },
      include: {
        member: {
          select: {
            memberId: true,
            nickname: true,
            mobile: true,
          },
        },
      },
    });

    // 转换为 Map 方便调用方使用
    const walletMap = new Map(wallets.map((w) => [w.memberId, w]));

    return Result.ok({
      wallets: FormatDateFields(wallets),
      walletMap: Object.fromEntries(walletMap),
    });
  }

  /**
   * 钱包列表查询（分页）
   */
  async getWalletList(query: {
    pageNum?: number;
    pageSize?: number;
    status?: WalletStatusType;
    keyword?: string;
    minBalance?: number;
    maxBalance?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    const page = query.pageNum ?? 1;
    const size = query.pageSize ?? 20;

    const where: Prisma.FinWalletWhereInput = {
      ...(isSuper ? {} : { tenantId }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.minBalance !== undefined ? { balance: { gte: query.minBalance } } : {}),
      ...(query.maxBalance !== undefined ? { balance: { lte: query.maxBalance } } : {}),
    };

    if (query.keyword) {
      where.member = {
        OR: [
          { nickname: { contains: query.keyword } },
          { mobile: { contains: query.keyword } },
        ],
      };
    }

    const [list, total] = await Promise.all([
      this.prisma.finWallet.findMany({
        where,
        include: {
          member: {
            select: {
              memberId: true,
              nickname: true,
              mobile: true,
              avatar: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.finWallet.count({ where }),
    ]);

    const formattedList = list.map((wallet) => ({
      id: wallet.id,
      memberId: wallet.memberId,
      memberName: wallet.member?.nickname ?? '未知',
      memberMobile: wallet.member?.mobile ?? '',
      memberAvatar: wallet.member?.avatar ?? '',
      balance: Number(wallet.balance),
      frozen: Number(wallet.frozen),
      totalIncome: Number(wallet.totalIncome),
      pendingRecovery: Number(wallet.pendingRecovery),
      status: wallet.status,
      frozenReason: wallet.frozenReason,
      updatedAt: wallet.updatedAt,
    }));

    return Result.page(FormatDateFields(formattedList), total);
  }
}
