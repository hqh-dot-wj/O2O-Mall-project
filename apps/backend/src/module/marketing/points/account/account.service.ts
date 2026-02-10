import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionStatus } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { Result } from 'src/common/response/result';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { FormatDateFields } from 'src/common/utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsRuleService } from '../rule/rule.service';
import { PointsAccountRepository } from './account.repository';
import { PointsTransactionRepository } from './transaction.repository';
import { AddPointsDto } from './dto/add-points.dto';
import { DeductPointsDto } from './dto/deduct-points.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

/**
 * 积分账户服务
 *
 * @description 提供积分账户的管理、积分增减、查询等功能
 */
@Injectable()
export class PointsAccountService {
  private readonly logger = new Logger(PointsAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountRepo: PointsAccountRepository,
    private readonly transactionRepo: PointsTransactionRepository,
    private readonly ruleService: PointsRuleService,
  ) {}

  /**
   * 获取或创建积分账户
   *
   * @param memberId 用户ID
   * @returns 积分账户
   */
  async getOrCreateAccount(memberId: string) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    let account = await this.accountRepo.findByMemberId(memberId);

    if (!account) {
      account = await this.accountRepo.create({
        tenantId,
        memberId,
        totalPoints: 0,
        availablePoints: 0,
        frozenPoints: 0,
        usedPoints: 0,
        expiredPoints: 0,
        version: 0,
      } as any);

      this.logger.log(`创建积分账户: memberId=${memberId}`);
    }

    return Result.ok(FormatDateFields(account));
  }

  /**
   * 查询积分余额
   *
   * @param memberId 用户ID
   * @returns 积分余额
   */
  async getBalance(memberId: string) {
    const account = await this.accountRepo.findByMemberId(memberId);

    if (!account) {
      return Result.ok({
        availablePoints: 0,
        frozenPoints: 0,
        expiringPoints: 0,
      });
    }

    // 查询即将过期的积分（30天内）
    const expiringPoints = await this.transactionRepo.getExpiringPoints(memberId, 30);

    return Result.ok({
      availablePoints: account.availablePoints,
      frozenPoints: account.frozenPoints,
      expiringPoints,
    });
  }

  /**
   * 增加积分
   *
   * @param dto 增加积分数据
   * @returns 交易记录
   */
  async addPoints(dto: AddPointsDto) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;

    // 获取或创建账户
    let account = await this.accountRepo.findByMemberId(dto.memberId);
    if (!account) {
      const result = await this.getOrCreateAccount(dto.memberId);
      account = result.data as any;
    }

    const balanceBefore = account.availablePoints;
    const balanceAfter = balanceBefore + dto.amount;

    // 更新账户余额
    await this.accountRepo.update(account.id, {
      totalPoints: { increment: dto.amount },
      availablePoints: { increment: dto.amount },
    } as any);

    // 创建交易记录
    const transaction = await this.transactionRepo.create({
      tenantId,
      accountId: account.id,
      memberId: dto.memberId,
      type: dto.type,
      amount: dto.amount,
      balanceBefore,
      balanceAfter,
      status: PointsTransactionStatus.COMPLETED,
      relatedId: dto.relatedId,
      remark: dto.remark,
      expireTime: dto.expireTime,
    } as any);

    this.logger.log(`增加积分: memberId=${dto.memberId}, amount=${dto.amount}, type=${dto.type}`);

    return Result.ok(FormatDateFields(transaction));
  }

  /**
   * 扣减积分（使用乐观锁）
   *
   * @param dto 扣减积分数据
   * @returns 交易记录
   */
  async deductPoints(dto: DeductPointsDto) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 获取账户
        const account = await this.accountRepo.findByMemberId(dto.memberId);
        if (!account) {
          BusinessException.throw(400, '积分账户不存在');
        }

        // 检查余额
        if (account.availablePoints < dto.amount) {
          BusinessException.throw(400, '积分余额不足');
        }

        const balanceBefore = account.availablePoints;
        const balanceAfter = balanceBefore - dto.amount;

        // 使用乐观锁更新账户余额
        const updated = await this.accountRepo.updateWithOptimisticLock(account.id, account.version, {
          availablePoints: balanceAfter,
          usedPoints: account.usedPoints + dto.amount,
        });

        if (!updated) {
          // 乐观锁冲突，重试
          this.logger.warn(`积分扣减乐观锁冲突，重试 ${attempt + 1}/${maxRetries}`);
          continue;
        }

        // 创建交易记录
        const transaction = await this.transactionRepo.create({
          tenantId,
          accountId: account.id,
          memberId: dto.memberId,
          type: dto.type,
          amount: -dto.amount,
          balanceBefore,
          balanceAfter,
          status: PointsTransactionStatus.COMPLETED,
          relatedId: dto.relatedId,
          remark: dto.remark,
          expireTime: null,
        } as any);

        this.logger.log(`扣减积分: memberId=${dto.memberId}, amount=${dto.amount}, type=${dto.type}`);

        return Result.ok(FormatDateFields(transaction));
      } catch (error) {
        if (error instanceof BusinessException) {
          throw error;
        }
        if (attempt === maxRetries - 1) {
          throw error;
        }
      }
    }

    BusinessException.throw(500, '积分扣减失败，请稍后重试');
  }

  /**
   * 冻结积分
   *
   * @param memberId 用户ID
   * @param amount 积分数量
   * @param relatedId 关联ID
   * @returns 交易记录
   */
  async freezePoints(memberId: string, amount: number, relatedId: string) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;

    // 获取账户
    const account = await this.accountRepo.findByMemberId(memberId);
    if (!account) {
      BusinessException.throw(400, '积分账户不存在');
    }

    // 检查余额
    if (account.availablePoints < amount) {
      BusinessException.throw(400, '积分余额不足');
    }

    const balanceBefore = account.availablePoints;
    const balanceAfter = balanceBefore - amount;

    // 更新账户余额
    await this.accountRepo.update(account.id, {
      availablePoints: { decrement: amount },
      frozenPoints: { increment: amount },
    } as any);

    // 创建交易记录
    const transaction = await this.transactionRepo.create({
      tenantId,
      accountId: account.id,
      memberId,
      type: 'FREEZE',
      amount: -amount,
      balanceBefore,
      balanceAfter,
      status: PointsTransactionStatus.COMPLETED,
      relatedId,
      remark: '冻结积分',
      expireTime: null,
    } as any);

    this.logger.log(`冻结积分: memberId=${memberId}, amount=${amount}`);

    return Result.ok(FormatDateFields(transaction));
  }

  /**
   * 解冻积分
   *
   * @param memberId 用户ID
   * @param amount 积分数量
   * @param relatedId 关联ID
   * @returns 交易记录
   */
  async unfreezePoints(memberId: string, amount: number, relatedId: string) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;

    // 获取账户
    const account = await this.accountRepo.findByMemberId(memberId);
    if (!account) {
      BusinessException.throw(400, '积分账户不存在');
    }

    // 检查冻结余额
    if (account.frozenPoints < amount) {
      BusinessException.throw(400, '冻结积分不足');
    }

    const balanceBefore = account.availablePoints;
    const balanceAfter = balanceBefore + amount;

    // 更新账户余额
    await this.accountRepo.update(account.id, {
      availablePoints: { increment: amount },
      frozenPoints: { decrement: amount },
    } as any);

    // 创建交易记录
    const transaction = await this.transactionRepo.create({
      tenantId,
      accountId: account.id,
      memberId,
      type: 'UNFREEZE',
      amount,
      balanceBefore,
      balanceAfter,
      status: PointsTransactionStatus.COMPLETED,
      relatedId,
      remark: '解冻积分',
      expireTime: null,
    } as any);

    this.logger.log(`解冻积分: memberId=${memberId}, amount=${amount}`);

    return Result.ok(FormatDateFields(transaction));
  }

  /**
   * 查询积分明细
   *
   * @param memberId 用户ID
   * @param query 查询参数
   * @returns 分页结果
   */
  async getTransactions(memberId: string, query: TransactionQueryDto) {
    const { rows, total } = await this.transactionRepo.findUserTransactions(memberId, query);

    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 查询即将过期的积分
   *
   * @param memberId 用户ID
   * @param days 天数
   * @returns 即将过期的积分信息
   */
  async getExpiringPoints(memberId: string, days: number = 30) {
    const expiringPoints = await this.transactionRepo.getExpiringPoints(memberId, days);

    return Result.ok({
      expiringPoints,
      days,
    });
  }

  /**
   * 管理端：分页查询积分账户列表
   */
  async getAccountsForAdmin(query: { pageNum?: number; pageSize?: number; memberId?: string }) {
    const where: any = {};
    if (query.memberId) where.memberId = query.memberId;
    const { rows, total } = await this.accountRepo.findPage({
      where,
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
      orderBy: 'createTime',
      order: 'desc',
    });
    const memberIds = [...new Set((rows as any[]).map((r) => r.memberId))];
    const members =
      memberIds.length > 0
        ? await this.prisma.umsMember.findMany({
            where: { memberId: { in: memberIds } },
            select: { memberId: true, nickname: true, mobile: true, avatar: true },
          })
        : [];
    const memberMap = new Map(members.map((m) => [m.memberId, m]));
    const rowsWithMember = (rows as any[]).map((r) => ({
      ...FormatDateFields(r),
      member: memberMap.get(r.memberId) || null,
    }));
    return Result.page(rowsWithMember, total);
  }

  /**
   * 管理端：分页查询积分交易记录
   */
  async getTransactionsForAdmin(query: {
    memberId?: string;
    type?: any;
    startTime?: Date;
    endTime?: Date;
    pageNum?: number;
    pageSize?: number;
  }) {
    const { rows, total } = await this.transactionRepo.findTransactionsAdmin({
      memberId: query.memberId,
      type: query.type,
      startTime: query.startTime,
      endTime: query.endTime,
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
    });
    return Result.page(FormatDateFields(rows), total);
  }
}
