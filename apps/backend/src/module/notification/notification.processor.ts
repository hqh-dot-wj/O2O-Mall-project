import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NOTIFICATION_QUEUE } from './notification.service';
import { InAppChannel } from './channels/in-app.channel';
import { SmsChannel } from './channels/sms.channel';
import { WechatTemplateChannel } from './channels/wechat-template.channel';
import { AppPushChannel } from './channels/app-push.channel';
import { NotificationChannel } from './interfaces/notification.types';
import { getErrorMessage } from 'src/common/utils/error';

interface NotificationJob {
  logId: number;
  channel: NotificationChannel;
  target: string;
  message: { title?: string; content: string; template?: string; params?: Record<string, string>; tenantId: string };
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppChannel: InAppChannel,
    private readonly smsChannel: SmsChannel,
    private readonly wechatTemplateChannel: WechatTemplateChannel,
    private readonly appPushChannel: AppPushChannel,
  ) {}

  @Process()
  async handleNotification(job: Job<NotificationJob>) {
    const { logId, channel, target, message } = job.data;

    await this.prisma.sysNotificationLog.update({
      where: { id: logId },
      data: { status: 'SENDING' },
    });

    const channelImpl = this.getChannel(channel);
    try {
      const result = await channelImpl.send(target, message);

      if (result.success) {
        await this.prisma.sysNotificationLog.update({
          where: { id: logId },
          data: { status: 'SENT' },
        });
      } else {
        throw new Error(result.error ?? 'Send failed');
      }
    } catch (error) {
      const errMsg = getErrorMessage(error);
      await this.prisma.sysNotificationLog.update({
        where: { id: logId },
        data: { status: 'FAILED', errorMsg: errMsg },
      });
      this.logger.error(`Notification failed: logId=${logId}, channel=${channel}`, errMsg);
      throw error;
    }
  }

  private getChannel(channel: NotificationChannel) {
    const map = {
      IN_APP: this.inAppChannel,
      SMS: this.smsChannel,
      WECHAT_TEMPLATE: this.wechatTemplateChannel,
      APP_PUSH: this.appPushChannel,
    } as const;
    const impl = map[channel];
    if (!impl) throw new Error(`Unknown notification channel: ${channel}`);
    return impl;
  }
}
