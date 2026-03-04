import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Api } from 'src/common/decorators/api.decorator';
import { Result } from 'src/common/response/result';
import { FormatDateFields } from 'src/common/utils';
import { CouponStatisticsService } from '../statistics/statistics.service';
import { UserCouponRepository } from '../distribution/user-coupon.repository';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';

/**
 * 优惠券管理控制器
 * 提供优惠券的查询、统计、导出等管理功能
 */
@ApiTags('营销-优惠券管理')
@Controller()
@ApiBearerAuth('Authorization')
export class CouponManagementController {
  constructor(
    private readonly statisticsService: CouponStatisticsService,
    private readonly userCouponRepo: UserCouponRepository,
  ) {}

  /**
   * 查询用户优惠券列表（管理端）
   */
  @Get('admin/marketing/coupon/user-coupons')
  @Api({ summary: '查询用户优惠券列表' })
  @RequirePermission('marketing:coupon:user-coupon:list')
  async getUserCoupons(
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
    @Query('pageNum') pageNum?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const result = await this.userCouponRepo.findUserCouponsPage(
      memberId,
      status as import('@prisma/client').UserCouponStatus | undefined,
      pageNum,
      pageSize,
    );
    return Result.page(FormatDateFields(result.rows), result.total);
  }

  /**
   * 查询优惠券使用记录（管理端）
   */
  @Get('admin/marketing/coupon/usage-records')
  @Api({ summary: '查询优惠券使用记录' })
  @RequirePermission('marketing:coupon:usage-record:list')
  async getUsageRecords(
    @Query('memberId') memberId?: string,
    @Query('templateId') templateId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('pageNum') pageNum?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return await this.statisticsService.getUsageRecords({
      memberId,
      templateId,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      pageNum,
      pageSize,
    });
  }

  /**
   * 查询优惠券统计数据（管理端）
   */
  @Get('admin/marketing/coupon/statistics')
  @Api({ summary: '查询优惠券统计数据' })
  @RequirePermission('marketing:coupon:statistics:query')
  async getStatistics(@Query('templateId') templateId?: string) {
    if (templateId) {
      return await this.statisticsService.getUsageRate(templateId);
    }
    return await this.statisticsService.getStatisticsOverview();
  }

  /**
   * 导出优惠券使用记录（管理端，返回 xlsx 文件流）
   */
  @Get('admin/marketing/coupon/export')
  @Api({ summary: '导出优惠券使用记录' })
  @RequirePermission('marketing:coupon:usage-record:export')
  async exportUsageRecords(
    @Res() res: Response,
    @Query('memberId') memberId?: string,
    @Query('templateId') templateId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ): Promise<void> {
    await this.statisticsService.exportUsageRecords(
      {
        memberId,
        templateId,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      },
      res,
    );
  }
}
