import { Injectable, Logger } from '@nestjs/common';
import { NotificationMessage, SendResult } from '../interfaces/notification.types';

/**
 * 短信渠道 (Stub)
 * SMS 未配置时记录 Stub 日志，不抛异常（AC-9）
 */
@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);

  async send(target: string, message: NotificationMessage): Promise<SendResult> {
    this.logger.log(`[SMS Stub] Sending to ${target}: ${message.content}`);
    // TODO: [第三方] 对接阿里云/腾讯云短信 | P2 | 1d | payment-service-task-list
    return { success: true };
  }
}
