import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationMessage, SendResult } from '../interfaces/notification.types';

/**
 * 站内信渠道
 * 写入 sys_message 表
 */
@Injectable()
export class InAppChannel {
  constructor(private readonly prisma: PrismaService) {}

  async send(target: string, message: NotificationMessage): Promise<SendResult> {
    await this.prisma.sysMessage.create({
      data: {
        title: message.title ?? '系统通知',
        content: message.content,
        type: message.template ?? 'SYSTEM',
        receiverId: target,
        tenantId: message.tenantId,
      },
    });
    return { success: true };
  }
}
