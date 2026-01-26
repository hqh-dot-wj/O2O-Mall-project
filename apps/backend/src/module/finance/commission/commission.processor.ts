import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { CommissionService } from './commission.service';

interface CalcCommissionJob {
  orderId: string;
  tenantId: string;
}

/**
 * 佣金计算队列处理器
 */
@Processor('CALC_COMMISSION')
export class CommissionProcessor {
  private readonly logger = new Logger(CommissionProcessor.name);

  constructor(private readonly commissionService: CommissionService) {}

  @Process()
  async handleCalcCommission(job: Job<CalcCommissionJob>) {
    const { orderId, tenantId } = job.data;
    this.logger.log(`Processing commission calculation for order ${orderId}`);

    try {
      await this.commissionService.calculateCommission(orderId, tenantId);
      this.logger.log(`Commission calculation completed for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to calculate commission for order ${orderId}`, error);
      throw error; // 重新抛出以触发重试
    }
  }
}
