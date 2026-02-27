import { Injectable, Logger } from '@nestjs/common';
import { NotificationMessage, SendResult } from '../interfaces/notification.types';

/**
 * APP 推送渠道 (Stub)
 */
@Injectable()
export class AppPushChannel {
  private readonly logger = new Logger(AppPushChannel.name);

  async send(target: string, message: NotificationMessage): Promise<SendResult> {
    this.logger.log(`[APP Push Stub] Sending to ${target}: ${message.content}`);
    return { success: true };
  }
}
