import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationService, NOTIFICATION_QUEUE } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationController } from './notification.controller';
import { InAppChannel } from './channels/in-app.channel';
import { SmsChannel } from './channels/sms.channel';
import { WechatTemplateChannel } from './channels/wechat-template.channel';
import { AppPushChannel } from './channels/app-push.channel';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProcessor,
    InAppChannel,
    SmsChannel,
    WechatTemplateChannel,
    AppPushChannel,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
