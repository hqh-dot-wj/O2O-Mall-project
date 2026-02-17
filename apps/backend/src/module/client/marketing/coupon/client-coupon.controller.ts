import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { Member } from 'src/module/client/common/decorators/member.decorator';
import { MemberAuthGuard } from 'src/module/client/common/guards/member-auth.guard';
import { Result } from 'src/common/response/result';
import { FormatDateFields } from 'src/common/utils';
import { CouponDistributionService } from 'src/module/marketing/coupon/distribution/distribution.service';
import { UserCouponRepository } from 'src/module/marketing/coupon/distribution/user-coupon.repository';

/**
 * C端优惠券控制器
 * 提供用户领券、查询可领券、我的优惠券等接口
 */
@ApiTags('C端-优惠券')
@Controller('client/marketing/coupon')
@UseGuards(MemberAuthGuard)
export class ClientCouponController {
  constructor(
    private readonly distributionService: CouponDistributionService,
    private readonly userCouponRepo: UserCouponRepository,
  ) {}

  /**
   * 用户领取优惠券
   */
  @Post('claim/:templateId')
  @Api({ summary: '用户领取优惠券' })
  async claimCoupon(
    @Param('templateId') templateId: string,
    @Member('memberId') memberId: string,
  ) {
    return await this.distributionService.claimCoupon(memberId, templateId);
  }

  /**
   * 查询可领取的优惠券列表
   */
  @Get('available')
  @Api({ summary: '查询可领取的优惠券列表' })
  async getAvailableCoupons(@Member('memberId') memberId: string) {
    return { message: '功能开发中' };
  }

  /**
   * 查询我的优惠券
   */
  @Get('my-coupons')
  @Api({ summary: '查询我的优惠券' })
  async getMyCoupons(
    @Member('memberId') memberId: string,
    @Query('status') status?: string,
    @Query('pageNum') pageNum?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const result = await this.userCouponRepo.findUserCouponsPage(
      memberId,
      status as any,
      pageNum,
      pageSize,
    );
    return Result.page(FormatDateFields(result.rows), result.total);
  }
}
