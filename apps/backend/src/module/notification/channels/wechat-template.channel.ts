import { Injectable, Logger } from '@nestjs/common';
import { NotificationMessage, SendResult } from '../interfaces/notification.types';

/**
 * 微信模板消息渠道 (Stub)
 */
@Injectable()
export class WechatTemplateChannel {
  private readonly logger = new Logger(WechatTemplateChannel.name);

  async send(target: string, message: NotificationMessage): Promise<SendResult> {
    this.logger.log(`[WechatTemplate Stub] Sending to ${target}: ${message.content}`);
    return { success: true };
  }
}
