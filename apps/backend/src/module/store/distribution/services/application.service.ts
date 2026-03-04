import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SysDistApplication, SysDistReviewConfig } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { ListApplicationDto, ApplicationStatus } from '../dto/list-application.dto';
import { ReviewApplicationDto, ReviewResult } from '../dto/review-application.dto';
import { BatchReviewDto } from '../dto/batch-review.dto';
import { UpdateReviewConfigDto } from '../dto/update-review-config.dto';
import { ApplicationVo, ApplicationStatusVo, ReviewConfigVo } from '../vo/application.vo';

/**
 * 内部审核配置类型（用于 getReviewConfigInternal 返回值）
 */
interface InternalReviewConfig {
  id?: number;
  enableAutoReview: boolean;
  minRegisterDays: number;
  minOrderCount: number;
  minOrderAmount: Prisma.Decimal;
  requireRealName: boolean;
  requirePhone: boolean;
  createTime?: Date;
}

/**
 * 分销员申请/审核服务
 */
@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 提交申请（会员端）
   */
  @Transactional()
  async createApplication(
    tenantId: string,
    memberId: string,
    dto: CreateApplicationDto,
  ): Promise<Result<ApplicationVo>> {
    // 1. 检查是否已是分销员
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
      select: { levelId: true, createTime: true, mobile: true },
    });

    BusinessException.throwIfNull(member, '会员不存在');
    BusinessException.throwIf(member.levelId >= 1, '您已经是分销员，无需重复申请');

    // 2. 检查是否有待审核的申请
    const existingApplication = await this.prisma.sysDistApplication.findFirst({
      where: {
        tenantId,
        memberId,
        status: { in: [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING] },
      },
    });

    BusinessException.throwIf(existingApplication != null, '您已有待审核的申请，请勿重复提交');

    // 3. 获取审核配置
    const config = await this.getReviewConfigInternal(tenantId);

    // 4. 检查基本条件
    this.checkBasicRequirements(member, config);

    // 5. 检查是否满足自动审核条件
    let status = ApplicationStatus.PENDING;
    let autoReviewed = false;

    if (config.enableAutoReview) {
      const canAutoApprove = await this.checkAutoReviewConditions(tenantId, memberId, config);
      if (canAutoApprove) {
        status = ApplicationStatus.APPROVED;
        autoReviewed = true;

        // 自动审核通过，更新会员等级
        await this.prisma.umsMember.update({
          where: { memberId },
          data: { levelId: 1 },
        });

        this.logger.log(`[Application] Auto approved for member ${memberId}`);
      }
    }

    // 6. 创建申请记录
    const application = await this.prisma.sysDistApplication.create({
      data: {
        tenantId,
        memberId,
        applyReason: dto.applyReason,
        status,
        autoReviewed,
        reviewTime: autoReviewed ? new Date() : undefined,
      },
    });

    return Result.ok(this.toApplicationVo(application), autoReviewed ? '申请已自动通过' : '申请提交成功');
  }

  /**
   * 查询申请状态（会员端）
   */
  async getApplicationStatus(tenantId: string, memberId: string): Promise<Result<ApplicationStatusVo>> {
    const application = await this.prisma.sysDistApplication.findFirst({
      where: { tenantId, memberId },
      orderBy: { createTime: 'desc' },
    });

    if (!application) {
      return Result.ok({
        hasApplication: false,
        canReapply: true,
      });
    }

    const canReapply = [ApplicationStatus.REJECTED, ApplicationStatus.CANCELLED].includes(
      application.status as ApplicationStatus,
    );

    return Result.ok({
      hasApplication: true,
      status: application.status,
      applyTime: application.createTime.toISOString(),
      reviewTime: application.reviewTime?.toISOString(),
      reviewRemark: application.reviewRemark || undefined,
      canReapply,
    });
  }

  /**
   * 撤回申请（会员端）
   */
  @Transactional()
  async cancelApplication(tenantId: string, memberId: string): Promise<Result<boolean>> {
    const application = await this.prisma.sysDistApplication.findFirst({
      where: {
        tenantId,
        memberId,
        status: { in: [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING] },
      },
    });

    BusinessException.throwIfNull(application, '没有可撤回的申请');

    await this.prisma.sysDistApplication.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.CANCELLED },
    });

    return Result.ok(true, '申请已撤回');
  }

  /**
   * 查询申请列表（管理端）
   */
  async listApplications(
    tenantId: string,
    query: ListApplicationDto,
  ): Promise<Result<{ rows: ApplicationVo[]; total: number }>> {
    const { skip, take } = PaginationHelper.getPagination(query);

    const where: Prisma.SysDistApplicationWhereInput = {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.memberId && { memberId: query.memberId }),
      ...(query.startTime &&
        query.endTime && {
          createTime: {
            gte: new Date(query.startTime),
            lte: new Date(query.endTime),
          },
        }),
    };

    const [applications, total] = await this.prisma.$transaction([
      this.prisma.sysDistApplication.findMany({
        where,
        orderBy: { createTime: 'desc' },
        skip,
        take,
      }),
      this.prisma.sysDistApplication.count({ where }),
    ]);

    const rows = applications.map((app) => this.toApplicationVo(app));

    return Result.ok({ rows, total });
  }

  /**
   * 审核申请（管理端）
   */
  @Transactional()
  async reviewApplication(
    tenantId: string,
    applicationId: number,
    dto: ReviewApplicationDto,
    reviewerId: string,
  ): Promise<Result<boolean>> {
    const application = await this.prisma.sysDistApplication.findFirst({
      where: {
        id: applicationId,
        tenantId,
      },
    });

    BusinessException.throwIfNull(application, '申请不存在');
    BusinessException.throwIf(
      ![ApplicationStatus.PENDING, ApplicationStatus.REVIEWING].includes(application.status as ApplicationStatus),
      '申请状态不正确，无法审核',
    );

    const newStatus = dto.result === ReviewResult.APPROVED ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;

    // 更新申请状态
    await this.prisma.sysDistApplication.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        reviewerId,
        reviewTime: new Date(),
        reviewRemark: dto.remark,
      },
    });

    // 如果审核通过，更新会员等级
    if (dto.result === ReviewResult.APPROVED) {
      await this.prisma.umsMember.update({
        where: { memberId: application.memberId },
        data: { levelId: 1 },
      });

      this.logger.log(`[Application] Approved for member ${application.memberId} by ${reviewerId}`);
    }

    return Result.ok(true, dto.result === ReviewResult.APPROVED ? '审核通过' : '审核拒绝');
  }

  /**
   * 批量审核（管理端）
   */
  @Transactional()
  async batchReview(
    tenantId: string,
    dto: BatchReviewDto,
    reviewerId: string,
  ): Promise<Result<{ success: number; failed: number }>> {
    let success = 0;
    let failed = 0;

    for (const id of dto.ids) {
      try {
        await this.reviewApplication(
          tenantId,
          id,
          { result: dto.result, remark: dto.remark },
          reviewerId,
        );
        success++;
      } catch (error) {
        this.logger.error(`[Application] Batch review failed for id ${id}:`, error);
        failed++;
      }
    }

    return Result.ok({ success, failed }, `批量审核完成：成功 ${success} 个，失败 ${failed} 个`);
  }

  /**
   * 获取审核配置（管理端）
   */
  async getReviewConfig(tenantId: string): Promise<Result<ReviewConfigVo>> {
    const config = await this.getReviewConfigInternal(tenantId);
    return Result.ok(this.toReviewConfigVo(config));
  }

  /**
   * 更新审核配置（管理端）
   */
  @Transactional()
  async updateReviewConfig(
    tenantId: string,
    dto: UpdateReviewConfigDto,
    operator: string,
  ): Promise<Result<boolean>> {
    await this.prisma.sysDistReviewConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        enableAutoReview: dto.enableAutoReview,
        minRegisterDays: dto.minRegisterDays,
        minOrderCount: dto.minOrderCount,
        minOrderAmount: dto.minOrderAmount,
        requireRealName: dto.requireRealName,
        requirePhone: dto.requirePhone,
        createBy: operator,
        updateBy: operator,
      },
      update: {
        enableAutoReview: dto.enableAutoReview,
        minRegisterDays: dto.minRegisterDays,
        minOrderCount: dto.minOrderCount,
        minOrderAmount: dto.minOrderAmount,
        requireRealName: dto.requireRealName,
        requirePhone: dto.requirePhone,
        updateBy: operator,
      },
    });

    return Result.ok(true, '配置更新成功');
  }

  // ==================== Private Methods ====================

  /**
   * 获取审核配置（内部方法）
   */
  private async getReviewConfigInternal(tenantId: string): Promise<InternalReviewConfig> {
    const config = await this.prisma.sysDistReviewConfig.findUnique({
      where: { tenantId },
    });

    // 返回默认配置
    if (!config) {
      return {
        enableAutoReview: false,
        minRegisterDays: 0,
        minOrderCount: 0,
        minOrderAmount: new Prisma.Decimal(0),
        requireRealName: false,
        requirePhone: true,
      };
    }

    return config;
  }

  /**
   * 检查基本条件
   */
  private checkBasicRequirements(
    member: { mobile: string | null },
    config: { requirePhone: boolean },
  ): void {
    if (config.requirePhone) {
      BusinessException.throwIf(!member.mobile, '请先绑定手机号');
    }
  }

  /**
   * 检查自动审核条件
   */
  private async checkAutoReviewConditions(
    tenantId: string,
    memberId: string,
    config: {
      minRegisterDays: number;
      minOrderCount: number;
      minOrderAmount: Prisma.Decimal;
      requireRealName: boolean;
    },
  ): Promise<boolean> {
    // 1. 检查注册时间
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
      select: { createTime: true },
    });

    if (!member) return false;

    const registerDays = Math.floor((Date.now() - member.createTime.getTime()) / (1000 * 60 * 60 * 24));
    if (registerDays < config.minRegisterDays) {
      this.logger.debug(`[Application] Register days ${registerDays} < ${config.minRegisterDays}`);
      return false;
    }

    // 2. 检查订单数和消费金额
    const orderStats = await this.prisma.omsOrder.aggregate({
      where: {
        tenantId,
        memberId,
        status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] }, // 已支付、已发货、已完成
      },
      _count: true,
      _sum: { payAmount: true },
    });

    const orderCount = orderStats._count || 0;
    const orderAmount = orderStats._sum.payAmount || new Prisma.Decimal(0);

    if (orderCount < config.minOrderCount) {
      this.logger.debug(`[Application] Order count ${orderCount} < ${config.minOrderCount}`);
      return false;
    }

    if (orderAmount.lt(config.minOrderAmount)) {
      this.logger.debug(`[Application] Order amount ${orderAmount} < ${config.minOrderAmount}`);
      return false;
    }

    return true;
  }

  /**
   * 转换为VO
   */
  private toApplicationVo(application: SysDistApplication): ApplicationVo {
    return {
      id: application.id,
      memberId: application.memberId,
      applyReason: application.applyReason || undefined,
      status: application.status,
      reviewerId: application.reviewerId || undefined,
      reviewTime: application.reviewTime?.toISOString(),
      reviewRemark: application.reviewRemark || undefined,
      autoReviewed: application.autoReviewed,
      createTime: application.createTime.toISOString(),
    };
  }

  /**
   * 转换为ReviewConfigVo
   */
  private toReviewConfigVo(config: InternalReviewConfig): ReviewConfigVo {
    return {
      id: config.id || 0,
      enableAutoReview: config.enableAutoReview,
      minRegisterDays: config.minRegisterDays,
      minOrderCount: config.minOrderCount,
      minOrderAmount: Number(config.minOrderAmount),
      requireRealName: config.requireRealName,
      requirePhone: config.requirePhone,
      createTime: config.createTime?.toISOString() || new Date().toISOString(),
    };
  }
}
