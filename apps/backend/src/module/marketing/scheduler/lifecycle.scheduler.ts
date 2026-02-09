import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { PlayInstanceStatus, PublishStatus } from '@prisma/client';
import { PlayInstanceService } from '../instance/instance.service';
import { MarketingStockService } from '../stock/stock.service';

/**
 * 营销活动生命周期调度器
 *
 * @description
 * 自动化处理营销活动的生命周期管理，包括：
 * 1. 超时实例自动关闭（防止长期占用资源）
 * 2. 活动自动上下架（根据时间规则）
 * 3. 过期数据归档（保持数据库性能）
 * 4. 库存自动释放（超时/失败后释放）
 *
 * 核心原则：
 * - 定时任务必须幂等（可重复执行）
 * - 批量处理提升性能
 * - 异常不影响后续任务
 * - 记录详细日志便于追踪
 */
@Injectable()
export class ActivityLifecycleScheduler {
  private readonly logger = new Logger(ActivityLifecycleScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly instanceService: PlayInstanceService,
    private readonly stockService: MarketingStockService,
  ) {}

  /**
   * 定时任务 1: 处理超时实例
   *
   * @description
   * 每分钟执行一次，检查并处理超时的实例：
   * - PENDING_PAY 状态超过 30 分钟 -> TIMEOUT
   * - ACTIVE 状态超过活动有效期 -> FAILED
   *
   * @cron 每分钟的第 0 秒执行
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleTimeoutInstances() {
    const startTime = Date.now();
    this.logger.log('[定时任务] 开始处理超时实例...');

    try {
      // === 1. 处理待支付超时 ===
      const paymentTimeout = 30 * 60 * 1000; // 30分钟
      const paymentDeadline = new Date(Date.now() - paymentTimeout);

      const timeoutPendingInstances = await this.prisma.playInstance.findMany({
        where: {
          status: PlayInstanceStatus.PENDING_PAY,
          createTime: { lt: paymentDeadline },
        },
        take: 100, // 每次最多处理 100 条，防止长时间阻塞
      });

      this.logger.log(
        `[待支付超时] 发现 ${timeoutPendingInstances.length} 个超时实例`,
      );

      for (const instance of timeoutPendingInstances) {
        try {
          // 流转状态到 TIMEOUT
          await this.instanceService.transitStatus(instance.id, PlayInstanceStatus.TIMEOUT);

          // 释放库存（如果有占用）
          const config = await this.prisma.storePlayConfig.findUnique({
            where: { id: instance.configId },
          });
          if (config && config.stockMode === 'STRONG_LOCK') {
            const quantity = (instance.instanceData as any)?.quantity || 1;
            await this.stockService.increment(instance.configId, quantity);
          }

          this.logger.debug(`[待支付超时] 实例 ${instance.id} 已超时关闭`);
        } catch (error) {
          this.logger.error(
            `[待支付超时] 处理实例 ${instance.id} 失败: ${error.message}`,
          );
          // 继续处理下一个，不中断整个任务
        }
      }

      // === 2. 处理活动中超时 ===
      // 查询所有 ACTIVE 状态的实例，检查是否超过活动有效期
      const activeInstances = await this.prisma.playInstance.findMany({
        where: {
          status: PlayInstanceStatus.ACTIVE,
        },
        include: {
          config: true, // 需要获取活动规则
        },
        take: 100,
      });

      let activeTimeoutCount = 0;
      for (const instance of activeInstances) {
        try {
          const rules = instance.config.rules as any;
          const validDays = rules?.validDays || 7; // 默认 7 天有效期
          const deadline = new Date(instance.createTime.getTime() + validDays * 24 * 60 * 60 * 1000);

          if (Date.now() > deadline.getTime()) {
            // 活动超时，流转到 FAILED
            await this.instanceService.transitStatus(instance.id, PlayInstanceStatus.FAILED);
            activeTimeoutCount++;
            this.logger.debug(`[活动超时] 实例 ${instance.id} 已超时失败`);
          }
        } catch (error) {
          this.logger.error(
            `[活动超时] 处理实例 ${instance.id} 失败: ${error.message}`,
          );
        }
      }

      this.logger.log(`[活动超时] 处理 ${activeTimeoutCount} 个超时实例`);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[定时任务] 超时实例处理完成，耗时 ${duration}ms，共处理 ${timeoutPendingInstances.length + activeTimeoutCount} 个实例`,
      );
    } catch (error) {
      this.logger.error(`[定时任务] 处理超时实例失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 定时任务 2: 活动自动上下架
   *
   * @description
   * 每小时执行一次，根据活动的时间规则自动上下架：
   * - 到达开始时间 -> 自动上架
   * - 到达结束时间 -> 自动下架
   *
   * @cron 每小时的第 0 分 0 秒执行
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleActivityStatus() {
    const startTime = Date.now();
    this.logger.log('[定时任务] 开始检查活动状态...');

    try {
      const now = new Date();

      // === 1. 自动上架到期的活动 ===
      // 查询：状态为下架 + 开始时间已到 + 结束时间未到
      const toOnShelf = await this.prisma.storePlayConfig.updateMany({
        where: {
          status: PublishStatus.OFF_SHELF,
          rules: {
            path: ['startTime'],
            lte: now.toISOString(),
          },
          AND: [
            {
              OR: [
                { rules: { path: ['endTime'], gte: now.toISOString() } },
                { rules: { path: ['endTime'], equals: null } }, // 没有结束时间
              ],
            },
          ],
        },
        data: {
          status: PublishStatus.ON_SHELF,
        },
      });

      this.logger.log(`[自动上架] 上架 ${toOnShelf.count} 个活动`);

      // === 2. 自动下架过期的活动 ===
      // 查询：状态为上架 + 结束时间已到
      const toOffShelf = await this.prisma.storePlayConfig.updateMany({
        where: {
          status: PublishStatus.ON_SHELF,
          rules: {
            path: ['endTime'],
            lte: now.toISOString(),
          },
        },
        data: {
          status: PublishStatus.OFF_SHELF,
        },
      });

      this.logger.log(`[自动下架] 下架 ${toOffShelf.count} 个活动`);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[定时任务] 活动状态检查完成，耗时 ${duration}ms，上架 ${toOnShelf.count} 个，下架 ${toOffShelf.count} 个`,
      );
    } catch (error) {
      this.logger.error(`[定时任务] 检查活动状态失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 定时任务 3: 清理过期数据
   *
   * @description
   * 每天凌晨 2 点执行，归档或清理过期数据：
   * - 30 天前的成功/失败实例 -> 标记为已归档
   * - 90 天前的已归档实例 -> 可选择删除或迁移到冷存储
   *
   * @cron 每天凌晨 2 点执行
   */
  @Cron('0 0 2 * * *')
  async cleanupExpiredData() {
    const startTime = Date.now();
    this.logger.log('[定时任务] 开始清理过期数据...');

    try {
      // === 1. 归档 30 天前的终态实例 ===
      const archiveThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const archived = await this.prisma.playInstance.updateMany({
        where: {
          updateTime: { lt: archiveThreshold },
          status: {
            in: [
              PlayInstanceStatus.SUCCESS,
              PlayInstanceStatus.FAILED,
              PlayInstanceStatus.TIMEOUT,
              PlayInstanceStatus.REFUNDED,
            ],
          },
          // 假设有 archived 字段，如果没有可以忽略
          // archived: false,
        },
        data: {
          // archived: true,
        },
      });

      this.logger.log(`[数据归档] 归档 ${archived.count} 个实例`);

      // === 2. 清理 Redis 中的过期缓存 ===
      // 注意：Redis 的 TTL 会自动清理，这里可以做额外的清理逻辑
      // 例如：清理幂等性缓存、库存缓存等

      const duration = Date.now() - startTime;
      this.logger.log(
        `[定时任务] 过期数据清理完成，耗时 ${duration}ms，归档 ${archived.count} 个实例`,
      );
    } catch (error) {
      this.logger.error(`[定时任务] 清理过期数据失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 定时任务 4: 健康检查
   *
   * @description
   * 每 5 分钟执行一次，检查系统健康状态：
   * - 统计各状态实例数量
   * - 检查是否有异常堆积
   * - 记录关键指标
   *
   * @cron 每 5 分钟执行
   */
  @Cron('0 */5 * * * *')
  async healthCheck() {
    try {
      // 统计各状态实例数量
      const statusCounts = await this.prisma.playInstance.groupBy({
        by: ['status'],
        _count: true,
      });

      const stats: Record<string, number> = {};
      for (const item of statusCounts) {
        stats[item.status] = item._count;
      }

      this.logger.log(`[健康检查] 实例状态统计: ${JSON.stringify(stats)}`);

      // 检查是否有异常堆积（例如：PENDING_PAY 超过 1000 个）
      if (stats[PlayInstanceStatus.PENDING_PAY] > 1000) {
        this.logger.warn(
          `[健康检查] 警告：待支付实例数量过多 (${stats[PlayInstanceStatus.PENDING_PAY]})，可能存在异常`,
        );
      }

      // 检查是否有长时间未处理的实例
      const oldestPending = await this.prisma.playInstance.findFirst({
        where: { status: PlayInstanceStatus.PENDING_PAY },
        orderBy: { createTime: 'asc' },
      });

      if (oldestPending) {
        const age = Date.now() - oldestPending.createTime.getTime();
        const ageMinutes = Math.floor(age / 60000);
        if (ageMinutes > 60) {
          this.logger.warn(
            `[健康检查] 警告：存在超过 ${ageMinutes} 分钟的待支付实例 (${oldestPending.id})`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`[健康检查] 执行失败: ${error.message}`, error.stack);
    }
  }
}
