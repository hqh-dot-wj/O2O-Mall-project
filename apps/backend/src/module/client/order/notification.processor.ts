import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MessageService } from 'src/module/admin/system/message/message.service';
import { PrismaService } from 'src/prisma/prisma.service';

interface OrderNotificationJob {
  orderId: string;
}

/**
 * 订单通知处理器 (延迟队列)
 */
@Processor('ORDER_NOTIFICATION')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService,
  ) {}

  @Process()
  async handleOrderNotification(job: Job<OrderNotificationJob>) {
    const { orderId } = job.data;
    this.logger.log(`Processing order notification for order ${orderId}`);

    try {
      // 1. Double Check: 查询订单状态
      const order = await this.prisma.omsOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found, skipping notification`);
        return;
      }

      // 2. 如果订单已取消，拦截通知
      if (order.status === 'CANCELLED') {
        this.logger.log(`Order ${orderId} is CANCELLED, skipping notification`);
        return;
      }

      // 3. 发送通知
      await this.messageService.notifyNewOrder(order);
      this.logger.log(`Notification sent for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send notification for order ${orderId}`, error);
      // 失败不重试，避免延迟过久造成困扰? 或者重试几次? Bull 默认会重试。
      throw error;
    }
  }
}
