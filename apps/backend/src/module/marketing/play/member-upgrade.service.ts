import { Injectable, Logger } from '@nestjs/common';
import { StorePlayConfig, PlayInstance } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { IMarketingStrategy } from './strategy.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response/response.interface';

/**
 * 会员升级营销策略插件
 *
 * @description
 * 通过购买"升级商品"触发会员等级升级。
 *
 * rules 配置示例:
 * {
 *   "targetLevel": 1,      // 升级到的目标等级 (1=C1, 2=C2)
 *   "autoApprove": true,   // 是否自动通过
 *   "price": 99            // 升级价格
 * }
 */
@Injectable()
export class MemberUpgradeService implements IMarketingStrategy {
  readonly code = 'MEMBER_UPGRADE';
  private readonly logger = new Logger(MemberUpgradeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 准入校验: 只允许低等级用户购买
   */
  async validateJoin(config: StorePlayConfig, memberId: string, params?: any): Promise<void> {
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });

    if (!member) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '会员不存在');
    }

    const rules = config.rules as any;
    const targetLevel = rules?.targetLevel || 1;

    if (member.levelId >= targetLevel) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '您已是该等级或更高等级，无需购买');
    }
  }

  /**
   * 价格计算: 从 rules.price 获取
   */
  async calculatePrice(config: StorePlayConfig, params?: any): Promise<Decimal> {
    const rules = config.rules as any;
    return new Decimal(rules?.price || 0);
  }

  /**
   * 支付成功后: 自动升级会员
   */
  async onPaymentSuccess(instance: PlayInstance): Promise<void> {
    // 1. 获取活动配置
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: instance.configId },
    });

    if (!config) {
      this.logger.warn(`Config not found for instance ${instance.id}`);
      return;
    }

    const rules = config.rules as any;
    const targetLevel = rules?.targetLevel || 1;
    const autoApprove = rules?.autoApprove !== false; // 默认自动通过

    // 2. 通过 orderSn 获取订单信息
    let tenantId = config.tenantId;
    let orderId: string | null = null;

    if (instance.orderSn) {
      const order = await this.prisma.omsOrder.findUnique({
        where: { orderSn: instance.orderSn },
        select: { id: true, tenantId: true },
      });
      if (order) {
        tenantId = order.tenantId;
        orderId = order.id;
      }
    }

    // 3. 查询当前会员等级
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId: instance.memberId },
    });

    if (!member) return;

    // 4. 创建升级申请记录
    await this.prisma.umsUpgradeApply.create({
      data: {
        tenantId,
        memberId: instance.memberId,
        fromLevel: member.levelId,
        toLevel: targetLevel,
        applyType: 'PRODUCT_PURCHASE',
        orderId,
        status: autoApprove ? 'APPROVED' : 'PENDING',
      },
    });

    // 5. 如果自动通过，则立即升级
    if (autoApprove) {
      await this.doUpgrade(instance.memberId, targetLevel, tenantId, orderId);
      this.logger.log(`会员 ${instance.memberId} 自动升级到等级 ${targetLevel}`);
    } else {
      this.logger.log(`会员 ${instance.memberId} 升级申请已提交，待审批`);
    }
  }

  /**
   * 执行升级
   */
  private async doUpgrade(memberId: string, targetLevel: number, tenantId: string, orderId: string | null) {
    // 1. 升级会员
    await this.prisma.umsMember.update({
      where: { memberId },
      data: {
        levelId: targetLevel,
        tenantId, // 升级归属下单门店
        upgradedAt: new Date(),
        upgradeOrderId: orderId,
      },
    });

    // 2. 如果升级到C2，自动生成推荐码
    if (targetLevel === 2) {
      const { nanoid } = await import('nanoid');
      const prefix = tenantId.slice(0, 4).toUpperCase();
      const randomPart = nanoid(4).toUpperCase();
      const code = `${prefix}-${randomPart}`;

      await this.prisma.umsReferralCode.create({
        data: {
          tenantId,
          memberId,
          code,
          isActive: true,
        },
      });

      // 更新会员推荐码字段
      await this.prisma.umsMember.update({
        where: { memberId },
        data: { referralCode: code },
      });

      this.logger.log(`为C2会员 ${memberId} 生成推荐码: ${code}`);
    }
  }

  /**
   * 状态变更钩子 (升级场景不需要)
   */
  async onStatusChange(instance: PlayInstance, oldStatus: string, newStatus: string): Promise<void> {
    // 升级类活动无特殊状态处理
  }

  /**
   * 配置校验
   */
  async validateConfig(dto: any): Promise<void> {
    const rules = dto.rules;
    if (!rules?.targetLevel || ![1, 2].includes(rules.targetLevel)) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, 'targetLevel 必须为 1 或 2');
    }
    if (!rules?.price || rules.price <= 0) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, 'price 必须大于 0');
    }
  }
}
