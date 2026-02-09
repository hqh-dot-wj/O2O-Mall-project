import { Injectable, Logger } from '@nestjs/common';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { Result } from 'src/common/response/result';
import { FormatDateFields } from 'src/common/utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsAccountService } from '../account/account.service';
import { PointsTaskRepository } from './task.repository';
import { UserTaskCompletionRepository } from './completion.repository';
import { CreatePointsTaskDto } from './dto/create-points-task.dto';
import { UpdatePointsTaskDto } from './dto/update-points-task.dto';
import { PointsTaskQueryDto } from './dto/points-task-query.dto';

/**
 * 积分任务服务
 * 
 * @description 提供积分任务的创建、更新、完成等功能
 */
@Injectable()
export class PointsTaskService {
  private readonly logger = new Logger(PointsTaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
    private readonly taskRepo: PointsTaskRepository,
    private readonly completionRepo: UserTaskCompletionRepository,
    private readonly accountService: PointsAccountService,
  ) {}

  /**
   * 创建积分任务
   * 
   * @param dto 创建数据
   * @returns 任务
   */
  async createTask(dto: CreatePointsTaskDto) {
    const tenantId = this.cls.get('tenantId');
    const userId = this.cls.get('userId') || 'system';

    // 检查任务标识是否已存在
    const existing = await this.taskRepo.findByTaskKey(dto.taskKey);
    BusinessException.throwIf(existing !== null, '任务标识已存在');

    const task = await this.taskRepo.create({
      tenantId,
      taskKey: dto.taskKey,
      taskName: dto.taskName,
      taskDescription: dto.taskDescription,
      pointsReward: dto.pointsReward,
      completionCondition: dto.completionCondition || {},
      isRepeatable: dto.isRepeatable ?? false,
      maxCompletions: dto.maxCompletions,
      isEnabled: dto.isEnabled ?? true,
      createBy: userId,
    } as any);

    this.logger.log(`创建积分任务: taskKey=${dto.taskKey}, reward=${dto.pointsReward}`);

    return Result.ok(FormatDateFields(task), '创建成功');
  }

  /**
   * 更新积分任务
   * 
   * @param id 任务ID
   * @param dto 更新数据
   * @returns 任务
   */
  async updateTask(id: string, dto: UpdatePointsTaskDto) {
    const userId = this.cls.get('userId') || 'system';

    const task = await this.taskRepo.findById(id);
    BusinessException.throwIfNull(task, '任务不存在');

    const updated = await this.taskRepo.update(id, {
      ...dto,
      updateBy: userId,
    } as any);

    this.logger.log(`更新积分任务: taskId=${id}`);

    return Result.ok(FormatDateFields(updated), '更新成功');
  }

  /**
   * 查询积分任务列表
   * 
   * @param query 查询参数
   * @returns 任务列表
   */
  async findAll(query: PointsTaskQueryDto) {
    const where: any = {};

    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    const { rows, total } = await this.taskRepo.findPage({
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
      where,
      orderBy: 'createTime',
      order: 'desc',
    });

    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 删除积分任务
   * 
   * @param id 任务ID
   */
  async deleteTask(id: string) {
    const task = await this.taskRepo.findById(id);
    BusinessException.throwIfNull(task, '任务不存在');

    await this.taskRepo.delete(id);

    this.logger.log(`删除积分任务: taskId=${id}`);

    return Result.ok(null, '删除成功');
  }

  /**
   * 完成任务并发放积分
   * 
   * @param memberId 用户ID
   * @param taskKey 任务标识
   * @returns 完成结果
   */
  async completeTask(memberId: string, taskKey: string) {
    const tenantId = this.cls.get('tenantId');

    // 1. 查询任务
    const task = await this.taskRepo.findByTaskKey(taskKey);
    BusinessException.throwIfNull(task, '任务不存在');
    BusinessException.throwIf(!task.isEnabled, '任务已停用');

    // 2. 检查任务资格
    const eligibility = await this.checkTaskEligibility(memberId, task.id);
    if (!eligibility.eligible) {
      BusinessException.throw(400, eligibility.reason || '不符合任务完成条件');
    }

    // 3. 使用事务完成任务
    // 发放积分
    const pointsResult = await this.accountService.addPoints({
      memberId,
      amount: task.pointsReward,
      type: PointsTransactionType.EARN_TASK,
      relatedId: task.id,
      remark: `完成任务：${task.taskName}`,
    });

    // 记录完成
    const completion = await this.completionRepo.create({
      tenantId,
      memberId,
      taskId: task.id,
      completionTime: new Date(),
      pointsAwarded: task.pointsReward,
      transactionId: pointsResult.data.id,
    } as any);

    const result = { completion, transaction: pointsResult.data };

    this.logger.log(
      `完成任务: memberId=${memberId}, taskKey=${taskKey}, points=${task.pointsReward}`,
    );

    return Result.ok({
      taskName: task.taskName,
      pointsAwarded: task.pointsReward,
      completionTime: result.completion.completionTime,
    }, '任务完成');
  }

  /**
   * 检查任务资格
   * 
   * @param memberId 用户ID
   * @param taskId 任务ID
   * @returns 资格检查结果
   */
  async checkTaskEligibility(
    memberId: string,
    taskId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      return { eligible: false, reason: '任务不存在' };
    }

    if (!task.isEnabled) {
      return { eligible: false, reason: '任务已停用' };
    }

    // 检查完成次数限制
    const completionCount = await this.completionRepo.countUserCompletions(
      memberId,
      taskId,
    );

    if (!task.isRepeatable && completionCount > 0) {
      return { eligible: false, reason: '任务已完成，不可重复' };
    }

    if (task.maxCompletions && completionCount >= task.maxCompletions) {
      return { eligible: false, reason: '已达到最大完成次数' };
    }

    return { eligible: true };
  }

  /**
   * 查询用户任务完成记录
   * 
   * @param memberId 用户ID
   * @param pageNum 页码
   * @param pageSize 每页数量
   * @returns 完成记录
   */
  async getUserCompletions(
    memberId: string,
    pageNum: number = 1,
    pageSize: number = 10,
  ) {
    const { rows, total } = await this.completionRepo.findUserCompletions(
      memberId,
      pageNum,
      pageSize,
    );

    // 关联任务信息
    const completions = await Promise.all(
      rows.map(async (record) => {
        const task = await this.taskRepo.findById(record.taskId);
        return {
          id: record.id,
          taskId: record.taskId,
          taskName: task?.taskName || '未知任务',
          completionTime: record.completionTime,
          pointsAwarded: record.pointsAwarded,
        };
      }),
    );

    return Result.page(FormatDateFields(completions), total);
  }
}
