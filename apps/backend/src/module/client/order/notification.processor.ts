import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationService } from 'src/module/notification/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';

interface OrderNotificationJob {
  orderId: string;
}

/**
 * 订单通知处理器 (延迟队列)
 * 通过 NotificationService 发送站内信 + SMS
 */
@Processor('ORDER_NOTIFICATION')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Process()
  async handleOrderNotification(job: Job<OrderNotificationJob>) {
    const { orderId } = job.data;
    this.logger.log(`Processing order notification for order ${orderId}`);

    try {
      const order = await this.prisma.omsOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found, skipping notification`);
        return;
      }

      if (order.status === 'CANCELLED') {
        this.logger.log(`Order ${orderId} is CANCELLED, skipping notification`);
        return;
      }

      const content = `订单号: ${order.orderSn}, 金额: ${order.payAmount}`;
      const target = order.tenantId;

      await this.notificationService.sendMulti(target, ['IN_APP', 'SMS'], {
        tenantId: order.tenantId,
        title: '您有新订单',
        content,
        template: 'ORDER',
      });

      this.logger.log(`Notification queued for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to send notification for order ${orderId}`, error);
      throw error;
    }
  }
}
