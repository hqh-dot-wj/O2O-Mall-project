import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Member } from '../common/decorators/member.decorator';
import { MemberAuthGuard } from '../common/guards/member-auth.guard';
import { Result } from 'src/common/response/result';
import { OrderIntegrationService } from 'src/module/marketing/integration/integration.service';
import { CalculateDiscountDto } from 'src/module/marketing/integration/dto/calculate-discount.dto';
import { OrderDiscountVo } from 'src/module/marketing/integration/vo/order-discount.vo';

/**
 * C端订单优惠计算控制器
 */
@ApiTags('C端-订单')
@Controller('client/order')
@UseGuards(MemberAuthGuard)
export class OrderIntegrationController {
  constructor(
    private readonly integrationService: OrderIntegrationService,
  ) {}

  @Post('calculate-discount')
  @ApiOperation({ summary: '计算订单优惠' })
  async calculateDiscount(
    @Member('memberId') memberId: string,
    @Body() dto: CalculateDiscountDto,
  ): Promise<Result<OrderDiscountVo>> {
    return this.integrationService.calculateOrderDiscount(memberId, dto);
  }
}
