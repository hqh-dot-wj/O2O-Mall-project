import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { Result } from 'src/common/response/result';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsAccountService } from '../account/account.service';
import { PointsRuleService } from '../rule/rule.service';
import { PointsErrorCode, PointsErrorMessages } from '../constants/error-codes';

/**
 * 积分签到服务
 * 
 * @description 提供用户签到和签到状态查询功能
 */
@Injectable()
export class PointsSigninService {
  private readonly logger = new Logger(PointsSigninService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly accountService: PointsAccountService,
    private readonly ruleService: PointsRuleService,
  ) {}

  /**
   * 用户签到
   * 
   * @param memberId 用户ID
   * @returns 签到结果
   */
  async signin(memberId: string) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;

    // 获取积分规则
    const rulesResult = await this.ruleService.getRules();
    const rules = rulesResult.data;

    if (!rules.signinPointsEnabled || !rules.systemEnabled) {
      BusinessException.throw(400, PointsErrorMessages[PointsErrorCode.SIGNIN_DISABLED]);
    }

    // 检查今天是否已签到
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingSignin = await this.prisma.mktPointsTransaction.findFirst({
      where: {
        tenantId,
        memberId,
        type: PointsTransactionType.EARN_SIGNIN,
        createTime: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingSignin) {
      BusinessException.throw(400, PointsErrorMessages[PointsErrorCode.ALREADY_SIGNED_TODAY]);
    }

    // 发放签到积分
    const result = await this.accountService.addPoints({
      memberId,
      amount: rules.signinPointsAmount,
      type: PointsTransactionType.EARN_SIGNIN,
      remark: '每日签到',
    });

    this.logger.log(
      `用户签到成功: memberId=${memberId}, points=${rules.signinPointsAmount}`,
    );

    return Result.ok({
      points: rules.signinPointsAmount,
      transaction: result.data,
    });
  }

  /**
   * 检查签到状态
   * 
   * @param memberId 用户ID
   * @returns 签到状态
   */
  async checkSigninStatus(memberId: string) {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;

    // 检查今天是否已签到
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySignin = await this.prisma.mktPointsTransaction.findFirst({
      where: {
        tenantId,
        memberId,
        type: PointsTransactionType.EARN_SIGNIN,
        createTime: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // 统计连续签到天数
    const continuousDays = await this.calculateContinuousDays(memberId);

    // 统计本月签到天数
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthSignins = await this.prisma.mktPointsTransaction.count({
      where: {
        tenantId,
        memberId,
        type: PointsTransactionType.EARN_SIGNIN,
        createTime: {
          gte: monthStart,
        },
      },
    });

    return Result.ok({
      hasSignedToday: !!todaySignin,
      continuousDays,
      monthSignins,
      lastSigninTime: todaySignin?.createTime || null,
    });
  }

  /**
   * 计算连续签到天数
   * 
   * @param memberId 用户ID
   * @returns 连续签到天数
   */
  private async calculateContinuousDays(memberId: string): Promise<number> {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    const maxDays = 100;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - (maxDays - 1));

    const signins = await this.prisma.mktPointsTransaction.findMany({
      where: {
        tenantId,
        memberId,
        type: PointsTransactionType.EARN_SIGNIN,
        createTime: {
          gte: windowStart,
          lt: tomorrow,
        },
      },
      select: {
        createTime: true,
      },
    });

    const signedDaySet = new Set(signins.map((item) => this.toDateKey(item.createTime)));
    const cursor = new Date(today);
    let continuousDays = 0;

    for (let i = 0; i < maxDays; i++) {
      if (!signedDaySet.has(this.toDateKey(cursor))) {
        break;
      }
      continuousDays++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return continuousDays;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
