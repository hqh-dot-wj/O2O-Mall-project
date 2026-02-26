import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpgradeCondition } from '../dto/create-level.dto';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 等级条件检查服务
 */
@Injectable()
export class LevelConditionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 检查升级条件
   */
  async checkCondition(
    tenantId: string,
    memberId: string,
    condition: UpgradeCondition,
  ): Promise<{ passed: boolean; results: Array<{ field: string; required: number; actual: number; passed: boolean }> }> {
    const results = await Promise.all(
      condition.rules.map((rule) => this.checkRule(tenantId, memberId, rule)),
    );

    const passed = condition.type === 'AND' ? results.every((r) => r.passed) : results.some((r) => r.passed);

    return { passed, results };
  }

  /**
   * 检查单个规则
   */
  private async checkRule(
    tenantId: string,
    memberId: string,
    rule: UpgradeCondition['rules'][0],
  ): Promise<{ field: string; required: number; actual: number; passed: boolean }> {
    const actualValue = await this.getFieldValue(tenantId, memberId, rule.field, rule.days);

    let passed = false;
    switch (rule.operator) {
      case '>=':
        passed = actualValue >= rule.value;
        break;
      case '>':
        passed = actualValue > rule.value;
        break;
      case '=':
        passed = actualValue === rule.value;
        break;
      case '<':
        passed = actualValue < rule.value;
        break;
      case '<=':
        passed = actualValue <= rule.value;
        break;
    }

    return {
      field: rule.field,
      required: rule.value,
      actual: actualValue,
      passed,
    };
  }

  /**
   * 获取字段值
   */
  private async getFieldValue(
    tenantId: string,
    memberId: string,
    field: UpgradeCondition['rules'][0]['field'],
    days?: number,
  ): Promise<number> {
    switch (field) {
      case 'totalCommission':
        return this.getTotalCommission(tenantId, memberId);
      case 'recentCommission':
        return this.getRecentCommission(tenantId, memberId, days || 30);
      case 'totalOrders':
        return this.getTotalOrders(tenantId, memberId);
      case 'recentOrders':
        return this.getRecentOrders(tenantId, memberId, days || 30);
      case 'directReferrals':
        return this.getDirectReferrals(tenantId, memberId);
      case 'teamSize':
        return this.getTeamSize(tenantId, memberId);
      default:
        return 0;
    }
  }

  /**
   * 获取累计佣金
   */
  private async getTotalCommission(tenantId: string, memberId: string): Promise<number> {
    const result = await this.prisma.finCommission.aggregate({
      where: {
        tenantId,
        memberId,
        status: 'SETTLED', // 只统计已结算的佣金
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? new Decimal(result._sum.amount).toNumber() : 0;
  }

  /**
   * 获取近期佣金
   */
  private async getRecentCommission(tenantId: string, memberId: string, days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.finCommission.aggregate({
      where: {
        tenantId,
        memberId,
        status: 'SETTLED',
        settleTime: {
          gte: startDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? new Decimal(result._sum.amount).toNumber() : 0;
  }

  /**
   * 获取累计订单数
   */
  private async getTotalOrders(tenantId: string, memberId: string): Promise<number> {
    // 统计该会员作为推荐人的订单数
    const count = await this.prisma.omsOrder.count({
      where: {
        tenantId,
        OR: [
          { distributorId: memberId }, // 直接推荐人
          { indirectDistributorId: memberId }, // 间接推荐人
        ],
        status: {
          in: ['PAID', 'SHIPPED', 'COMPLETED'], // 只统计已支付及之后的订单
        },
      },
    });

    return count;
  }

  /**
   * 获取近期订单数
   */
  private async getRecentOrders(tenantId: string, memberId: string, days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const count = await this.prisma.omsOrder.count({
      where: {
        tenantId,
        OR: [{ distributorId: memberId }, { indirectDistributorId: memberId }],
        status: {
          in: ['PAID', 'SHIPPED', 'COMPLETED'],
        },
        createTime: {
          gte: startDate,
        },
      },
    });

    return count;
  }

  /**
   * 获取直推人数
   */
  private async getDirectReferrals(tenantId: string, memberId: string): Promise<number> {
    const count = await this.prisma.umsMember.count({
      where: {
        tenantId,
        parentId: memberId,
        levelId: {
          gte: 1, // 只统计分销员
        },
      },
    });

    return count;
  }

  /**
   * 获取团队规模
   */
  private async getTeamSize(tenantId: string, memberId: string): Promise<number> {
    // 直推 + 间推
    const count = await this.prisma.umsMember.count({
      where: {
        tenantId,
        OR: [{ parentId: memberId }, { indirectParentId: memberId }],
        levelId: {
          gte: 1,
        },
      },
    });

    return count;
  }

  /**
   * 批量检查会员升级条件
   * 用于定时任务
   */
  async batchCheckUpgrade(
    tenantId: string,
    memberIds: string[],
    targetLevelId: number,
    condition: UpgradeCondition,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // 并行检查所有会员
    await Promise.all(
      memberIds.map(async (memberId) => {
        const { passed } = await this.checkCondition(tenantId, memberId, condition);
        results.set(memberId, passed);
      }),
    );

    return results;
  }

  /**
   * 批量检查会员保级条件
   * 用于定时任务
   */
  async batchCheckMaintain(
    tenantId: string,
    memberIds: string[],
    condition: UpgradeCondition,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    await Promise.all(
      memberIds.map(async (memberId) => {
        const { passed } = await this.checkCondition(tenantId, memberId, condition);
        results.set(memberId, passed);
      }),
    );

    return results;
  }
}
