import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponDistributionService } from './distribution.service';
import { ManualDistributionDto } from './dto/manual-distribution.dto';
import { Api } from 'src/common/decorators/api.decorator';
import { User } from 'src/common/decorators/user.decorator';

/**
 * 优惠券发放控制器
 * 提供优惠券的手动发放和用户领取接口
 */
@ApiTags('营销-优惠券发放')
@Controller()
export class CouponDistributionController {
  constructor(private readonly service: CouponDistributionService) {}

  /**
   * 手动发放优惠券（管理端）
   * 批量发放优惠券给指定用户
   */
  @Post('admin/marketing/coupon/distribute/manual')
  @Api({ summary: '手动发放优惠券' })
  async distributeManually(@Body() dto: ManualDistributionDto) {
    return await this.service.distributeManually(dto);
  }

  /**
   * 用户领取优惠券（C端）
   * 用户主动领取指定模板的优惠券
   */
  @Post('client/marketing/coupon/claim/:templateId')
  @Api({ summary: '用户领取优惠券' })
  async claimCoupon(
    @Param('templateId') templateId: string,
    @User('memberId') memberId: string,
  ) {
    return await this.service.claimCoupon(memberId, templateId);
  }

  /**
   * 查询可领取的优惠券列表（C端）
   * 返回当前用户可以领取的所有优惠券模板
   */
  @Get('client/marketing/coupon/available')
  @Api({ summary: '查询可领取的优惠券列表' })
  async getAvailableCoupons(@User('memberId') memberId: string) {
    // TODO: 实现查询可领取的优惠券列表逻辑
    // 需要查询所有启用中的模板，并过滤掉用户已达领取上限的
    return { message: '功能开发中' };
  }
}
