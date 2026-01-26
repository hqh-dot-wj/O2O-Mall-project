import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IMarketingStrategy } from './strategy.interface';
import { PlayInstance, StorePlayConfig, PlayInstanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { PlayInstanceService } from '../instance/instance.service';
import { UserAssetService } from '../asset/asset.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CourseGroupBuyService implements IMarketingStrategy {
  readonly code = 'COURSE_GROUP_BUY';

  constructor(
    @Inject(forwardRef(() => PlayInstanceService))
    private readonly instanceService: PlayInstanceService,
    private readonly assetService: UserAssetService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 1.1 配置校验
   */
  async validateConfig(dto: any): Promise<void> {
    const rules = dto.rules;
    BusinessException.throwIf(!rules, '规则配置不能为空');

    // 1. 价格校验
    if (rules.price !== undefined) {
      BusinessException.throwIf(new Decimal(rules.price).lte(0), '课程拼团价必须大于 0');
    }

    // 2. 人数校验
    if (rules.minCount && Number(rules.minCount) < 2) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '开班最少 2 人');
    }

    // 3. 课时校验
    if (!rules.totalLessons || Number(rules.totalLessons) <= 0) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '总课时数必须大于 0');
    }
  }

  /**
   * 1. 准入校验
   */
  async validateJoin(config: StorePlayConfig, memberId: string, params: any = {}): Promise<void> {
    const rules = config.rules as any;

    // A. 时间校验
    if (rules.joinDeadline) {
      const deadline = new Date(rules.joinDeadline).getTime();
      if (Date.now() > deadline) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '报名已截止');
      }
    }

    // B. 身份校验 (团长必须是分销员)
    // 判定团长：没有 groupId 即为开团
    const isLeader = !params.groupId;

    if (isLeader && rules.leaderMustBeDistributor) {
      const member = await this.prisma.umsMember.findUnique({ where: { memberId } });
      // 简单判断：levelId > 0 或 status === 'DISTRIBUTOR' (需根据具体业务字段)
      // 假设 levelId > 0 为分销员，或者有特殊标记
      // 这里暂且假设 levelId 是分销等级
      if (!member || (member.levelId || 0) <= 0) {
        throw new BusinessException(ResponseCode.FORBIDDEN, '只有推广员才能发起拼团');
      }
    }

    // C. 人数校验 (需查询当前实例总数)
    if (params.groupId) {
      const group = await this.instanceService.findOne(params.groupId);
      if (group.data) {
        const current = (group.data.instanceData as any).currentCount || 0;
        // 校验该团是否已满 (使用 minCount 作为成团人数，或者 maxCount 作为满团人数)
        // 通常拼团是：minCount 成团，maxCount 满员截团(可选)
        const limit = rules.maxCount || 99;
        if (current >= limit) {
          throw new BusinessException(ResponseCode.BUSINESS_ERROR, '该团人员已满');
        }
      } else {
        throw new BusinessException(ResponseCode.NOT_FOUND, '拼团实例不存在');
      }
    }
  }

  /**
   * 2. 计算价格 (含团长优惠/免单)
   */
  async calculatePrice(config: StorePlayConfig, params: any): Promise<Decimal> {
    const rules = config.rules as any;
    let price = new Decimal(rules.price || 0);

    // 优先使用 SKU 维度的配置
    if (params.skuId && Array.isArray(rules.skus)) {
      const skuRule = rules.skus.find((s: any) => s.skuId === params.skuId);
      if (skuRule && skuRule.price) {
        price = new Decimal(skuRule.price);
      }
    }

    // 如果是团长 (新开团)
    if (params.isLeader) {
      // 1. 团长免单
      if (rules.leaderFree) {
        return new Decimal(0);
      }

      // 2. 团长优惠券
      if (rules.leaderDiscount) {
        const discount = new Decimal(rules.leaderDiscount);
        price = price.minus(discount);
      }
    }

    return price.lt(0) ? new Decimal(0) : price;
  }

  /**
   * 3. 支付成功回调
   */
  async onPaymentSuccess(instance: PlayInstance): Promise<void> {
    // 更新进度 (复用拼团逻辑，或者独立写)
    await this.updateProgress(instance);
  }

  /**
   * 4. 状态流转钩子
   */
  async onStatusChange(instance: PlayInstance, oldStatus: string, newStatus: string): Promise<void> {
    // 如果成功，发放课程权益 (次卡)
    if (newStatus === PlayInstanceStatus.SUCCESS) {
      await this.grantCourseAsset(instance);
    }
  }

  /**
   * 5. 前端展示增强
   * @description 将 JSON 规则转换为 C 端易读的文本
   */
  async getDisplayData(config: StorePlayConfig): Promise<any> {
    const rules = config.rules as any;

    // A. 基础人数文案
    const countText = `最低${rules.minCount || 1}人 ~ 最多${rules.maxCount || 99}人`;

    // B. 课程说明文案 (通过关联物理商品获取课时时长)
    let lessonSummary = '课程排期加载中';
    if (rules.totalLessons && rules.dayLessons) {
      const product = await this.prisma.pmsProduct.findFirst({
        where: { productId: config.serviceId },
      });
      const duration = product?.serviceDuration || 0;
      lessonSummary = `每期课程${rules.totalLessons}节课，一天上${rules.dayLessons}节，一次${duration}分钟`;
    }

    return {
      countText,
      lessonSummary,
      joinDeadlineText: rules.joinDeadline ? new Date(rules.joinDeadline).toLocaleString() : '长期有效',
    };
  }

  // --- Private Logic ---

  private async updateProgress(instance: PlayInstance) {
    const data = instance.instanceData as any;
    const parentId = data.parentId || (data.isLeader ? instance.id : null);
    if (!parentId) return;

    // 简单更新计数
    // 在真实业务中需加锁
    const parent = await this.prisma.playInstance.findUnique({ where: { id: parentId } });
    if (!parent) return;

    const parentData = parent.instanceData as any;
    const newCount = (parentData.currentCount || 0) + 1;

    await this.prisma.playInstance.update({
      where: { id: parentId },
      data: { instanceData: { ...parentData, currentCount: newCount } },
    });

    // 检查是否达到"最低开班人数" (minCount)
    // 注意：拼团课程可能不像普通拼团那样"满员即成团"，而是"到时间且满员才由人工或Job触发"?
    // 或者"满员自动成团"?
    // 假设: 只要达到 minCount，就可以流转为 SUCCESS (开班成功)
    const config = await this.prisma.storePlayConfig.findUnique({ where: { id: instance.configId } });
    const rules = config?.rules as any;

    if (newCount >= (rules.minCount || 1)) {
      // 触发成团 -> 这里简单处理，直接把相关人员全部 SUCCESS
      await this.finalizeGroup(parentId);
    }
  }

  private async finalizeGroup(leaderId: string) {
    const instances = await this.prisma.playInstance.findMany({
      where: {
        OR: [{ id: leaderId }, { instanceData: { path: ['parentId'], equals: leaderId } }],
        status: { in: [PlayInstanceStatus.PAID, PlayInstanceStatus.ACTIVE] },
      },
    });

    for (const ins of instances) {
      await this.instanceService.transitStatus(ins.id, PlayInstanceStatus.SUCCESS);
    }
  }

  private async grantCourseAsset(instance: PlayInstance) {
    const config = await this.prisma.storePlayConfig.findUnique({ where: { id: instance.configId } });
    const rules = config?.rules as any;

    // 发放次卡
    if (rules.totalLessons) {
      await this.assetService.grantAsset({
        tenantId: instance.tenantId,
        memberId: instance.memberId,
        instanceId: instance.id,
        configId: instance.configId,
        assetName: `课程: ${config?.id} (${rules.totalLessons}课时)`,
        assetType: 'TIMES_CARD',
        balance: new Decimal(rules.totalLessons),
        initialBalance: new Decimal(rules.totalLessons),
        status: 'UNUSED',
        expiredTime: rules.validDays ? new Date(Date.now() + rules.validDays * 86400000) : null,
      });
    }
  }
}
