import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { ListMessageDto, CreateMessageDto } from './dto/message.dto';
import { FormatDateFields } from 'src/common/utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建消息
   */
  async create(dto: CreateMessageDto) {
    const message = await this.prisma.sysMessage.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        receiverId: dto.receiverId,
        tenantId: dto.tenantId,
      },
    });
    return Result.ok(message);
  }

  /**
   * 发送新订单通知 (Stub)
   */
  async notifyNewOrder(order: any) {
    // 1. 发送站内信
    // 通常发给租户管理员 (Tenant Owner)
    // 这里简化目前 owner 就是 tenantId 对应的某个 Admin (需查询)
    // 暂时先发给 "admin" 作为 Stub，或者如果 system/message 用于后台，receiverId 可能是 admin userId
    // 假设 receiverId = order.tenantId (即发给该租户的所有管理员?)
    // 为了简单，我们只记录一条消息，receiverId 设为 tenantId (前端需按 tenantId 过滤?)
    // 或者查询该租户下的所有管理员并发送

    // 这里简化：receiverId = order.tenantId
    await this.create({
      title: '您有新订单',
      content: `订单号: ${order.orderSn}, 金额: ${order.payAmount}`,
      type: 'ORDER',
      receiverId: order.tenantId, // 暂用
      tenantId: order.tenantId,
    });

    // 2. 发送 SMS (Stub)
    await this.sendSmsStub(order.tenantId, `您有新订单 ${order.orderSn}`);
  }

  /**
   * 发送短信 (Stub)
   * @param phone 接收手机号 (or userId to lookup phone)
   * @param content 内容
   */
  async sendSmsStub(target: string, content: string) {
    this.logger.log(`[SMS Stub] Sending SMS to ${target}: ${content}`);
    // TODO: Integrate Aliyun SMS or Tencent Cloud SMS here
  }

  /**
   * 查询消息列表
   */
  async findAll(query: ListMessageDto, currentTenantId: string) {
    const where: Prisma.SysMessageWhereInput = {
      tenantId: currentTenantId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [list, total] = await this.prisma.$transaction([
      this.prisma.sysMessage.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysMessage.count({ where }),
    ]);

    return Result.page(FormatDateFields(list), total);
  }

  /**
   * 标记已读
   */
  async read(id: number) {
    await this.prisma.sysMessage.update({
      where: { id },
      data: { isRead: true },
    });
    return Result.ok();
  }

  /**
   * 删除消息
   */
  async delete(id: number) {
    await this.prisma.sysMessage.delete({
      where: { id },
    });
    return Result.ok();
  }
}
