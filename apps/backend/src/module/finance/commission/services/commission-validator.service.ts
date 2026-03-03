import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { MemberQueryPort } from '../../ports/member-query.port';

/**
 * 佣金校验服务
 *
 * @description
 * 自购检测、黑名单校验、限额校验、循环推荐检测
 *
 * @architecture A-T2: 循环推荐检测通过 MemberQueryPort 实现
 */
@Injectable()
export class CommissionValidatorService {
  private readonly logger = new Logger(CommissionValidatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memberQueryPort: MemberQueryPort,
  ) {}

  /**
   * 检查是否自购 (不返佣)
   */
  checkSelfPurchase(memberId: string, shareUserId: string | null, parentId: string | null): boolean {
    // 情况1: 订单会员 === 分享人
    if (shareUserId && memberId === shareUserId) {
      return true;
    }
    // 情况2: 订单会员 === 上级 (绑定关系)
    if (parentId && memberId === parentId) {
      return true;
    }
    return false;
  }

  /**
   * 检查用户是否在黑名单中
   */
  async isUserBlacklisted(tenantId: string, userId: string): Promise<boolean> {
    const entry = await this.prisma.sysDistBlacklist.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });
    return !!entry;
  }

  /**
   * 检查跨店日限额
   *
   * @description
   * 使用专门的计数器表(fin_user_daily_quota)防止并发超限
   * 
   * 改进点：
   * - 使用 upsert + increment 原子操作，避免 SELECT SUM FOR UPDATE 的首笔并发漏洞
   * - 锁定具体用户配额行，而非聚合结果
   * - 支持回滚（超限时不更新）
   *
   * @param tenantId - 租户ID
   * @param beneficiaryId - 受益人ID
   * @param amount - 本次佣金金额
   * @param limit - 日限额
   * @returns 是否在限额内
   *
   * @concurrency 使用 Prisma upsert 的原子性保证并发安全
   * @performance 锁定范围仅限单个用户单日配额记录
   */
  async checkDailyLimit(
    tenantId: string,
    beneficiaryId: string,
    amount: Decimal,
    limit: Decimal,
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // 使用 upsert + increment 原子性更新配额
      const quota = await this.prisma.finUserDailyQuota.upsert({
        where: {
          tenantId_beneficiaryId_quotaDate: {
            tenantId,
            beneficiaryId,
            quotaDate: today,
          },
        },
        create: {
          tenantId,
          beneficiaryId,
          quotaDate: today,
          usedAmount: amount,
          limitAmount: limit,
        },
        update: {
          usedAmount: {
            increment: amount,
          },
        },
      });

      const isWithinLimit = quota.usedAmount.lte(limit);

      this.logger.debug(
        `[DailyLimit] tenant=${tenantId}, user=${beneficiaryId}, ` +
          `used=${quota.usedAmount.toFixed(2)}, limit=${limit.toFixed(2)}, ` +
          `pass=${isWithinLimit}`,
      );

      // 如果超限，回滚本次增量
      if (!isWithinLimit) {
        await this.prisma.finUserDailyQuota.update({
          where: {
            tenantId_beneficiaryId_quotaDate: {
              tenantId,
              beneficiaryId,
              quotaDate: today,
            },
          },
          data: {
            usedAmount: {
              decrement: amount,
            },
          },
        });

        this.logger.warn(
          `[DailyLimit] Quota exceeded and rolled back: ` +
            `tenant=${tenantId}, user=${beneficiaryId}, ` +
            `attempted=${amount.toFixed(2)}, limit=${limit.toFixed(2)}`,
        );
      }

      return isWithinLimit;
    } catch (error) {
      this.logger.error(
        `[DailyLimit] Error checking limit: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 发生错误时，为安全起见，拒绝通过
      return false;
    }
  }

  /**
   * 检查循环推荐（绑定推荐人时调用）
   *
   * @description
   * 通过 MemberQueryPort 实现，解耦对 umsMember 的直接访问
   *
   * @architecture A-T2
   */
  async checkCircularReferral(memberId: string, parentId: string): Promise<boolean> {
    return this.memberQueryPort.checkCircularReferral(memberId, parentId);
  }
}
