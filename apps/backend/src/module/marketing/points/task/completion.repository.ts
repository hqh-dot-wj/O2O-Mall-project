import { Injectable } from '@nestjs/common';
import { MktUserTaskCompletion, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 用户任务完成记录仓储
 * 
 * @description 继承 BaseRepository，自动处理租户隔离
 */
@Injectable()
export class UserTaskCompletionRepository extends BaseRepository<
  MktUserTaskCompletion,
  Prisma.MktUserTaskCompletionCreateInput,
  Prisma.MktUserTaskCompletionUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktUserTaskCompletion', 'id', 'tenantId');
  }

  /**
   * 查询用户任务完成次数
   * 
   * @param memberId 用户ID
   * @param taskId 任务ID
   * @returns 完成次数
   */
  async countUserCompletions(memberId: string, taskId: string): Promise<number> {
    return this.count({
      memberId,
      taskId,
    });
  }

  /**
   * 查询用户的任务完成记录
   * 
   * @param memberId 用户ID
   * @param pageNum 页码
   * @param pageSize 每页数量
   * @returns 分页结果
   */
  async findUserCompletions(
    memberId: string,
    pageNum: number = 1,
    pageSize: number = 10,
  ) {
    return this.findPage({
      pageNum,
      pageSize,
      where: {
        memberId,
      },
      orderBy: 'completionTime',
      order: 'desc',
    });
  }
}
