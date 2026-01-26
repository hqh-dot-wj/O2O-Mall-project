import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { OrderService } from './order.service';

interface OrderDelayJob {
  orderId: string;
}

@Processor('ORDER_DELAY')
export class OrderDelayProcessor {
  private readonly logger = new Logger(OrderDelayProcessor.name);

  constructor(private readonly orderService: OrderService) {}

  @Process('cancel_unpaid')
  async handleCancelUnpaid(job: Job<OrderDelayJob>) {
    const { orderId } = job.data;
    this.logger.log(`Processing auto-cancellation for order ${orderId}`);

    try {
      await this.orderService.cancelOrderBySystem(orderId, '超时未支付自动关闭');
    } catch (error) {
      this.logger.error(`Failed to auto-cancel order ${orderId}`, error);
      // Optional: throw error to retry if it's a transient issue?
      // For now, let's just log. If we throw, Bull might retry indefinitely or based on config.
      // BusinessException might be thrown if order is not found or already paid.
      // We should probably catch "Order not pending" harmlessly.
    }
  }
}
