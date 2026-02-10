import { Injectable } from '@nestjs/common';
import { MktPointsTask, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 积分任务仓储
 *
 * @description 继承 BaseRepository，自动处理租户隔离
 */
@Injectable()
export class PointsTaskRepository extends BaseRepository<
  MktPointsTask,
  Prisma.MktPointsTaskCreateInput,
  Prisma.MktPointsTaskUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktPointsTask', 'id', 'tenantId');
  }

  /**
   * 根据任务标识查询任务
   *
   * @param taskKey 任务标识
   * @returns 任务
   */
  async findByTaskKey(taskKey: string): Promise<MktPointsTask | null> {
    const tenantId = TenantContext.getTenantId() ?? TenantContext.SUPER_TENANT_ID;
    return this.findOne({ tenantId, taskKey });
  }

  /**
   * 查询启用的任务列表
   *
   * @returns 任务列表
   */
  async findEnabledTasks(): Promise<MktPointsTask[]> {
    return this.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: {
        createTime: 'desc',
      },
    });
  }
}
