import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PlayInstance, Prisma, PlayInstanceStatus } from '@prisma/client';
import { CreatePlayInstanceDto, ListPlayInstanceDto, UpdatePlayInstanceDto } from './dto/instance.dto';
import { ClsService } from 'nestjs-cls';

/**
 * 营销实例仓储
 *
 * @description 处理营销活动执行实例的持久化操作
 */
@Injectable()
export class PlayInstanceRepository extends BaseRepository<PlayInstance, CreatePlayInstanceDto, UpdatePlayInstanceDto> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'playInstance');
  }

  /**
   * 分页搜索实例
   */
  async search(query: ListPlayInstanceDto) {
    const where: Prisma.PlayInstanceWhereInput = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.memberId) {
      where.memberId = query.memberId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      orderBy: 'createTime',
      order: 'desc',
    });
  }

  /**
   * 按订单号查询实例
   */
  async findByOrderSn(orderSn: string) {
    return this.findOne({ orderSn });
  }

  /**
   * 更新实例状态
   */
  async updateStatus(id: string, status: PlayInstanceStatus, instanceData?: any) {
    const data: any = { status };
    if (instanceData) {
      data.instanceData = instanceData;
    }

    // 如果是终态，记录结束时间
    const finalStatuses: PlayInstanceStatus[] = [
      PlayInstanceStatus.SUCCESS,
      PlayInstanceStatus.FAILED,
      PlayInstanceStatus.REFUNDED,
      PlayInstanceStatus.TIMEOUT,
    ];
    if (finalStatuses.includes(status)) {
      data.endTime = new Date();
    }

    // 如果是支付成功，记录支付时间
    if (status === PlayInstanceStatus.PAID) {
      data.payTime = new Date();
    }

    return this.update(id, data);
  }

  /**
   * 批量更新实例状态
   */
  async batchUpdateStatus(ids: string[], status: PlayInstanceStatus, instanceData?: any) {
    const data: any = { status };
    if (instanceData) {
      data.instanceData = instanceData;
    }

    const finalStatuses: PlayInstanceStatus[] = [
      PlayInstanceStatus.SUCCESS,
      PlayInstanceStatus.FAILED,
      PlayInstanceStatus.REFUNDED,
      PlayInstanceStatus.TIMEOUT,
    ];
    if (finalStatuses.includes(status)) {
      data.endTime = new Date();
    }

    if (status === PlayInstanceStatus.PAID) {
      data.payTime = new Date();
    }

    return this.prisma.playInstance.updateMany({
      where: { id: { in: ids } },
      data,
    });
  }
}
