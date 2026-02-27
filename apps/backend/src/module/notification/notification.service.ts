import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationChannel, NotificationMessage } from './interfaces/notification.types';

export const NOTIFICATION_QUEUE = 'NOTIFICATION';

export interface SendNotificationParams {
  target: string;
  channel: NotificationChannel;
  template?: string;
  title?: string;
  content: string;
  params?: Record<string, string>;
  tenantId: string;
}

interface NotificationJob {
  logId: number;
  channel: NotificationChannel;
  target: string;
  message: NotificationMessage;
}

/**
 * 通知服务
 * 推入 BullMQ 队列，失败重试最多 3 次、间隔指数递增（AC-10）
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 发送通知（异步）
   */
  async send(params: SendNotificationParams): Promise<void> {
    const log = await this.prisma.sysNotificationLog.create({
      data: {
        tenantId: params.tenantId,
        channel: params.channel,
        target: params.target,
        template: params.template ?? null,
        title: params.title ?? null,
        content: params.content,
        status: 'QUEUED',
      },
    });

    await this.queue.add(
      {
        logId: log.id,
        channel: params.channel,
        target: params.target,
        message: {
          title: params.title,
          content: params.content,
          template: params.template,
          params: params.params,
          tenantId: params.tenantId,
        },
      } as NotificationJob,
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );

    this.logger.log(`Notification queued: logId=${log.id}, channel=${params.channel}, target=${params.target}`);
  }

  /**
   * 多渠道发送
   */
  async sendMulti(target: string, channels: NotificationChannel[], params: Omit<SendNotificationParams, 'target' | 'channel'>): Promise<void> {
    for (const channel of channels) {
      await this.send({ ...params, target, channel });
    }
  }
}
