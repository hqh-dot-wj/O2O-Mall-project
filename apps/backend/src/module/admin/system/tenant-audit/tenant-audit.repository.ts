import { Injectable } from '@nestjs/common';
import { Prisma, SysTenantAuditLog } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 租户审计日志 Repository
 * 
 * @description 不继承租户隔离,因为审计日志需要跨租户查询
 */
@Injectable()
export class TenantAuditRepository extends BaseRepository<
  SysTenantAuditLog,
  Prisma.SysTenantAuditLogCreateInput,
  Prisma.SysTenantAuditLogUpdateInput,
  Prisma.SysTenantAuditLogDelegate
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    // 审计日志表不需要租户过滤,传入空字符串
    super(prisma, cls, 'sysTenantAuditLog', 'id', '');
  }

  /**
   * 查询跨租户访问记录
   */
  async findCrossTenantAccess(options: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<SysTenantAuditLog[]> {
    const { startTime, endTime, limit = 100 } = options;

    const where: Prisma.SysTenantAuditLogWhereInput = {
      isCrossTenant: true,
    };

    if (startTime || endTime) {
      where.createTime = {};
      if (startTime) where.createTime.gte = startTime;
      if (endTime) where.createTime.lte = endTime;
    }

    return this.delegate.findMany({
      where,
      orderBy: { createTime: 'desc' },
      take: limit,
    });
  }

  /**
   * 统计租户访问次数
   */
  async countByTenant(tenantId: string, options?: {
    startTime?: Date;
    endTime?: Date;
  }): Promise<number> {
    const where: Prisma.SysTenantAuditLogWhereInput = {
      OR: [
        { requestTenantId: tenantId },
        { accessTenantId: tenantId },
      ],
    };

    if (options?.startTime || options?.endTime) {
      where.createTime = {};
      if (options.startTime) where.createTime.gte = options.startTime;
      if (options.endTime) where.createTime.lte = options.endTime;
    }

    return this.delegate.count({ where });
  }

  /**
   * 按用户统计跨租户访问
   */
  async countCrossTenantByUser(options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<Array<{ userId: string; userName: string; count: number }>> {
    const { startTime, endTime, limit = 10 } = options || {};

    const result = await this.prisma.$queryRaw<Array<{ userId: string; userName: string; count: bigint }>>`
      SELECT 
        user_id as "userId",
        user_name as "userName",
        COUNT(*) as count
      FROM sys_tenant_audit_log
      WHERE is_cross_tenant = true
        AND user_id IS NOT NULL
        ${startTime ? Prisma.sql`AND create_time >= ${startTime}` : Prisma.empty}
        ${endTime ? Prisma.sql`AND create_time <= ${endTime}` : Prisma.empty}
      GROUP BY user_id, user_name
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    return result.map((r) => ({
      userId: r.userId,
      userName: r.userName || '',
      count: Number(r.count),
    }));
  }

  /**
   * 按模型统计跨租户访问
   */
  async countCrossTenantByModel(options?: {
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<Array<{ modelName: string; count: number }>> {
    const { startTime, endTime, limit = 10 } = options || {};

    const result = await this.prisma.$queryRaw<Array<{ modelName: string; count: bigint }>>`
      SELECT 
        model_name as "modelName",
        COUNT(*) as count
      FROM sys_tenant_audit_log
      WHERE is_cross_tenant = true
        ${startTime ? Prisma.sql`AND create_time >= ${startTime}` : Prisma.empty}
        ${endTime ? Prisma.sql`AND create_time <= ${endTime}` : Prisma.empty}
      GROUP BY model_name
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    return result.map((r) => ({
      modelName: r.modelName,
      count: Number(r.count),
    }));
  }

  /**
   * 检测异常访问模式
   * 
   * @description 检测单用户短时间内大量跨租户访问
   */
  async detectAnomalies(options: {
    timeWindowMinutes: number;
    threshold: number;
  }): Promise<Array<{ userId: string; userName: string; count: number; lastTime: Date }>> {
    const { timeWindowMinutes, threshold } = options;
    const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const result = await this.prisma.$queryRaw<Array<{
      userId: string;
      userName: string;
      count: bigint;
      lastTime: Date;
    }>>`
      SELECT 
        user_id as "userId",
        user_name as "userName",
        COUNT(*) as count,
        MAX(create_time) as "lastTime"
      FROM sys_tenant_audit_log
      WHERE is_cross_tenant = true
        AND user_id IS NOT NULL
        AND create_time >= ${startTime}
      GROUP BY user_id, user_name
      HAVING COUNT(*) >= ${threshold}
      ORDER BY count DESC
    `;

    return result.map((r) => ({
      userId: r.userId,
      userName: r.userName || '',
      count: Number(r.count),
      lastTime: r.lastTime,
    }));
  }
}
