import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Member } from 'src/module/client/common/decorators/member.decorator';
import { MemberAuthGuard } from 'src/module/client/common/guards/member-auth.guard';
import { Result } from 'src/common/response/result';
import { OrderIntegrationService } from './integration.service';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { OrderDiscountVo } from './vo/order-discount.vo';

/**
 * 订单集成控制器
 * 
 * @description 提供订单优惠计算接口
 */
@ApiTags('C端-订单集成')
@Controller('client/order')
@UseGuards(MemberAuthGuard)
export class OrderIntegrationController {
  constructor(
    private readonly integrationService: OrderIntegrationService,
  ) {}

  /**
   * 计算订单优惠
   */
  @Post('calculate-discount')
  @ApiOperation({ summary: '计算订单优惠' })
  async calculateDiscount(
    @Member('memberId') memberId: string,
    @Body() dto: CalculateDiscountDto,
  ): Promise<Result<OrderDiscountVo>> {
    return this.integrationService.calculateOrderDiscount(memberId, dto);
  }
}
