import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponDistributionService } from './distribution.service';
import { ManualDistributionDto } from './dto/manual-distribution.dto';
import { Api } from 'src/common/decorators/api.decorator';

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
}
