import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IMarketingStrategy } from './strategy.interface';
import { PlayInstance, StorePlayConfig, PlayInstanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { PlayInstanceService } from '../instance/instance.service';
import { UserAssetService } from '../asset/asset.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CourseGroupBuyRulesDto, CourseGroupBuyJoinDto } from './dto/course-group-buy.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlayStrategy } from './play-strategy.decorator';
import { CourseGroupBuyExtensionRepository } from './course-group-buy-extension.repository';

@Injectable()
@PlayStrategy('COURSE_GROUP_BUY')
export class CourseGroupBuyService implements IMarketingStrategy {
  readonly code = 'COURSE_GROUP_BUY';

  constructor(
    @Inject(forwardRef(() => PlayInstanceService))
    private readonly instanceService: PlayInstanceService,
    private readonly assetService: UserAssetService,
    private readonly prisma: PrismaService,
    private readonly extensionRepo: CourseGroupBuyExtensionRepository,
  ) {}

  /**
   * 1.1 配置校验
   */
  async validateConfig(dto: any): Promise<void> {
    const rules = dto.rules;
    BusinessException.throwIf(!rules, '规则配置不能为空');

    // 使用 DTO 进行严格校验
    const rulesDto = plainToInstance(CourseGroupBuyRulesDto, rules);
    const errors = await validate(rulesDto);

    if (errors.length > 0) {
      const constraints = errors[0].constraints;
      const msg = constraints ? Object.values(constraints)[0] : '规则配置校验失败';
      throw new BusinessException(ResponseCode.PARAM_INVALID, msg);
    }

    // 额外业务逻辑校验
    if (rulesDto.maxCount !== undefined && rulesDto.maxCount < rulesDto.minCount) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '最大人数不能小于最小人数');
    }

    // 上课时间校验
    if (rulesDto.classStartTime && rulesDto.classEndTime) {
      const startTime = new Date(rulesDto.classStartTime).getTime();
      const endTime = new Date(rulesDto.classEndTime).getTime();
      if (endTime <= startTime) {
        throw new BusinessException(ResponseCode.PARAM_INVALID, '上课结束时间必须晚于开始时间');
      }
    }

    // 报名截止时间校验
    if (rulesDto.joinDeadline && rulesDto.classStartTime) {
      const joinDeadline = new Date(rulesDto.joinDeadline).getTime();
      const classStart = new Date(rulesDto.classStartTime).getTime();
      if (joinDeadline >= classStart) {
        throw new BusinessException(ResponseCode.PARAM_INVALID, '报名截止时间必须早于上课开始时间');
      }
    }
  }

  /**
   * 1. 准入校验
   */
  async validateJoin(config: StorePlayConfig, memberId: string, params: any = {}): Promise<void> {
    const rules = config.rules as any;
    const joinDto = plainToInstance(CourseGroupBuyJoinDto, params);

    // A. 报名截止时间校验
    if (rules.joinDeadline) {
      const deadline = new Date(rules.joinDeadline).getTime();
      if (Date.now() > deadline) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '报名已截止');
      }
    }

    // B. 身份校验 (团长必须是分销员)
    const isLeader = !joinDto.groupId;

    if (isLeader && rules.leaderMustBeDistributor) {
      const member = await this.prisma.umsMember.findUnique({ where: { memberId } });
      if (!member || (member.levelId || 0) <= 0) {
        throw new BusinessException(ResponseCode.FORBIDDEN, '只有推广员才能发起拼团');
      }
    }

    // C. 人数校验 (参团时检查是否已满)
    if (joinDto.groupId) {
      const group = await this.instanceService.findOne(joinDto.groupId);
      if (group.data) {
        const current = (group.data.instanceData as any).currentCount || 0;
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

    // 创建课程扩展记录
    await this.createExtensionRecord(instance);
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

    // B. 课程说明文案
    let lessonSummary = '课程排期加载中';
    if (rules.totalLessons && rules.dayLessons) {
      const product = await this.prisma.pmsProduct.findFirst({
        where: { productId: config.serviceId },
      });
      const duration = product?.serviceDuration || 0;
      lessonSummary = `每期课程${rules.totalLessons}节课，一天上${rules.dayLessons}节，一次${duration}分钟`;
    }

    // C. 时间地点文案
    let scheduleText = '';
    if (rules.classStartTime && rules.classEndTime) {
      const startDate = new Date(rules.classStartTime).toLocaleDateString('zh-CN');
      const endDate = new Date(rules.classEndTime).toLocaleDateString('zh-CN');
      scheduleText = `上课时间：${startDate} ~ ${endDate}`;
    }

    let addressText = rules.classAddress ? `上课地址：${rules.classAddress}` : '';
    let deadlineText = rules.joinDeadline 
      ? `报名截止：${new Date(rules.joinDeadline).toLocaleString('zh-CN')}` 
      : '长期有效';

    return {
      countText,
      lessonSummary,
      scheduleText,
      addressText,
      deadlineText,
      joinDeadlineText: deadlineText, // 兼容旧字段
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

    // 成团后，为团长创建排课记录
    const leaderInstance = instances.find((ins) => ins.id === leaderId);
    if (leaderInstance) {
      await this.createSchedulesForGroup(leaderInstance);
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

  /**
   * 创建课程扩展记录
   * @description 支付成功后，为每个学员创建扩展记录
   */
  private async createExtensionRecord(instance: PlayInstance) {
    const config = await this.prisma.storePlayConfig.findUnique({ where: { id: instance.configId } });
    const rules = config?.rules as any;
    const instanceData = instance.instanceData as any;

    // 确定团ID (团长用自己的ID，团员用parentId)
    const groupId = instanceData.isLeader ? instance.id : instanceData.parentId;
    if (!groupId) return;

    // 检查是否已存在扩展记录
    const existing = await this.extensionRepo.findByInstanceId(instance.id);
    if (existing) return;

    // 获取团长信息
    const leaderInstance = await this.prisma.playInstance.findUnique({
      where: { id: groupId },
    });
    const leaderData = leaderInstance?.instanceData as any;

    // 创建扩展记录
    await this.extensionRepo.create({
      tenantId: instance.tenantId,
      totalLessons: rules.totalLessons || 0,
      completedLessons: 0,
      classAddress: rules.classAddress || '',
      classStartTime: rules.classStartTime ? new Date(rules.classStartTime) : null,
      classEndTime: rules.classEndTime ? new Date(rules.classEndTime) : null,
      leaderId: leaderData?.memberId || instance.memberId,
      leaderDiscount: rules.leaderDiscount || 0,
      instance: {
        connect: { id: instance.id },
      },
      groupId,
    });
  }

  /**
   * 为成团的课程创建排课记录
   * @description 成团后，根据规则自动生成排课计划
   */
  private async createSchedulesForGroup(leaderInstance: PlayInstance) {
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: leaderInstance.configId },
    });
    const rules = config?.rules as any;

    // 获取团长的扩展记录
    const extension = await this.extensionRepo.findByInstanceId(leaderInstance.id);
    if (!extension) return;

    // 如果没有配置上课时间或总课时，则不创建排课
    if (!rules.classStartTime || !rules.totalLessons) return;

    const startTime = new Date(rules.classStartTime);
    const totalLessons = rules.totalLessons;
    const dayLessons = rules.dayLessons || 1; // 每天上几节课

    // 生成排课记录
    const schedules = [];
    let currentDate = new Date(startTime);
    let remainingLessons = totalLessons;

    while (remainingLessons > 0) {
      const lessonsToday = Math.min(dayLessons, remainingLessons);

      schedules.push({
        extensionId: extension.id,
        tenantId: extension.tenantId,
        date: new Date(currentDate),
        startTime: '09:00', // 默认上课时间，可以从规则中获取
        endTime: '17:00', // 默认下课时间，可以从规则中获取
        lessons: lessonsToday,
        status: 'SCHEDULED',
      });

      remainingLessons -= lessonsToday;
      // 下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 批量创建排课记录
    if (schedules.length > 0) {
      await this.extensionRepo.createSchedules(schedules);
    }
  }

  /**
   * 获取课程排课信息
   */
  async getSchedules(instanceId: string) {
    const extension = await this.extensionRepo.findByInstanceId(instanceId);
    if (!extension) {
      throw new BusinessException(ResponseCode.NOT_FOUND, '课程扩展记录不存在');
    }

    return this.extensionRepo.findSchedulesByExtensionId(extension.id);
  }

  /**
   * 获取学员考勤信息
   */
  async getAttendances(instanceId: string) {
    const extension = await this.extensionRepo.findByInstanceId(instanceId);
    if (!extension) {
      throw new BusinessException(ResponseCode.NOT_FOUND, '课程扩展记录不存在');
    }

    return this.extensionRepo.findAttendancesByExtensionId(extension.id);
  }

  /**
   * 标记学员出勤
   */
  async markAttendance(instanceId: string, memberId: string, date: Date, remark?: string) {
    const extension = await this.extensionRepo.findByInstanceId(instanceId);
    if (!extension) {
      throw new BusinessException(ResponseCode.NOT_FOUND, '课程扩展记录不存在');
    }

    // 检查排课是否存在
    const schedule = await this.extensionRepo.findScheduleByDate(extension.id, date);
    if (!schedule) {
      throw new BusinessException(ResponseCode.NOT_FOUND, '该日期没有排课');
    }

    // 标记出勤
    return this.extensionRepo.markAttended(extension.id, memberId, date, remark);
  }

  /**
   * 获取学员出勤率
   */
  async getAttendanceRate(instanceId: string, memberId: string) {
    const extension = await this.extensionRepo.findByInstanceId(instanceId);
    if (!extension) {
      throw new BusinessException(ResponseCode.NOT_FOUND, '课程扩展记录不存在');
    }

    return this.extensionRepo.getAttendanceRate(extension.id, memberId);
  }
}
