import { Injectable, Logger } from '@nestjs/common';
import { FinWithdrawal } from '@prisma/client';

/**
 * 提现打款服务
 * 负责对接外部支付渠道 (如微信企付零)
 */
@Injectable()
export class WithdrawalPaymentService {
  private readonly logger = new Logger(WithdrawalPaymentService.name);

  /**
   * 执行外部打款
   * @param withdrawal 提现记录
   */
  async transfer(withdrawal: FinWithdrawal): Promise<{ paymentNo: string }> {
    // 模拟微信支付调用
    // 实际项目中应调用 WechatPayService
    this.logger.log(`向用户 ${withdrawal.memberId} 打款 ${withdrawal.amount} 元`);

    // 模拟打款成功，生成外部流水号
    return {
      paymentNo: `WX${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
  }
}
