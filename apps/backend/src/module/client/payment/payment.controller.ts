import { Controller, Post, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { PrepayDto, MockSuccessDto } from './dto/payment.dto';
import { Result } from 'src/common/response';
import { Member } from '../common/decorators/member.decorator';
import { MemberAuthGuard } from '../common/guards/member-auth.guard';

@ApiTags('C端-支付管理')
@Controller('client/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('prepay')
  @UseGuards(MemberAuthGuard)
  @ApiOperation({ summary: '预下单' })
  async prepay(@Member('memberId') memberId: string, @Body() dto: PrepayDto) {
    const data = await this.paymentService.prepay(memberId, dto);
    return Result.ok(data);
  }

  @Post('mock-success')
  @UseGuards(MemberAuthGuard)
  @ApiOperation({ summary: '模拟支付成功 (测试用)' })
  async mockSuccess(@Member('memberId') memberId: string, @Body() dto: MockSuccessDto) {
    const data = await this.paymentService.mockSuccess(memberId, dto.orderId);
    return Result.ok(data, '模拟支付成功');
  }

  /**
   * 支付回调（微信服务器调用，无需鉴权）
   * 幂等：同一 orderId 多次回调只处理一次
   */
  @Post('notify')
  @ApiExcludeEndpoint()
  async notify(@Req() req: Request, @Headers() headers: Record<string, string>) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const result = await this.paymentService.handleCallback(headers, body);
    return { code: 'SUCCESS', message: 'OK', ...result };
  }
}
