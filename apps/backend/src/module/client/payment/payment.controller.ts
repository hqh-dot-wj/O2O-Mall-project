import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PrepayDto, MockSuccessDto } from './dto/payment.dto';
import { Result } from 'src/common/response';
import { Member } from '../common/decorators/member.decorator';
import { MemberAuthGuard } from '../common/guards/member-auth.guard';

@ApiTags('C端-支付管理')
@Controller('client/payment')
@UseGuards(MemberAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('prepay')
  @ApiOperation({ summary: '预下单' })
  async prepay(@Member('memberId') memberId: string, @Body() dto: PrepayDto) {
    const data = await this.paymentService.prepay(memberId, dto);
    return Result.ok(data);
  }

  @Post('mock-success')
  @ApiOperation({ summary: '模拟支付成功 (测试用)' })
  async mockSuccess(@Member('memberId') memberId: string, @Body() dto: MockSuccessDto) {
    const data = await this.paymentService.mockSuccess(memberId, dto.orderId);
    return Result.ok(data, '模拟支付成功');
  }
}
