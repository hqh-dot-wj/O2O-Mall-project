import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { Result } from 'src/common/response/result';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsAccountService } from '../account/account.service';
import { PointsRuleService } from '../rule/rule.service';

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
    const tenantId = this.cls.get('tenantId');

    // 获取积分规则
    const rulesResult = await this.ruleService.getRules();
    const rules = rulesResult.data;

    if (!rules.signinPointsEnabled || !rules.systemEnabled) {
      BusinessException.throw(400, '签到功能未启用');
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
      BusinessException.throw(400, '今日已签到');
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
    const tenantId = this.cls.get('tenantId');

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
    const tenantId = this.cls.get('tenantId');
    let continuousDays = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // 从今天开始往前查，直到找到没有签到的日期
    while (true) {
      const nextDay = new Date(checkDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const signin = await this.prisma.mktPointsTransaction.findFirst({
        where: {
          tenantId,
          memberId,
          type: PointsTransactionType.EARN_SIGNIN,
          createTime: {
            gte: checkDate,
            lt: nextDay,
          },
        },
      });

      if (!signin) {
        break;
      }

      continuousDays++;
      checkDate.setDate(checkDate.getDate() - 1);

      // 最多查询100天，防止无限循环
      if (continuousDays >= 100) {
        break;
      }
    }

    return continuousDays;
  }
}
