import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { ListTenantAuditDto } from './dto/list-tenant-audit.dto';
import { TenantAuditRepository } from './tenant-audit.repository';
import { AnomalyAccessVo, CrossTenantStatsVo, TenantAuditVo } from './vo/tenant-audit.vo';
import { getErrorMessage } from 'src/common/utils/error';

/**
 * 审计日志数据接口
 */
export interface AuditLogData {
  userId?: string;
  userName?: string;
  userType: string;
  requestTenantId?: string;
  accessTenantId?: string;
  action: string;
  modelName: string;
  operation: string;
  isSuperTenant: boolean;
  isIgnoreTenant: boolean;
  isCrossTenant: boolean;
  ip?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  traceId?: string;
  duration?: number;
  status: string;
  errorMessage?: string;
}

/**
 * 租户审计日志 Service
 */
@Injectable()
export class TenantAuditService {
  private readonly logger = new Logger(TenantAuditService.name);

  constructor(private readonly auditRepo: TenantAuditRepository) {}

  /**
   * 记录审计日志
   * 
   * @description 异步记录,不阻塞主流程
   */
  async recordAccess(data: AuditLogData): Promise<void> {
    try {
      await this.auditRepo.create({
        userId: data.userId,
        userName: data.userName,
        userType: data.userType,
        requestTenantId: data.requestTenantId,
        accessTenantId: data.accessTenantId,
        action: data.action,
        modelName: data.modelName,
        operation: data.operation,
        isSuperTenant: data.isSuperTenant,
        isIgnoreTenant: data.isIgnoreTenant,
        isCrossTenant: data.isCrossTenant,
        ip: data.ip,
        userAgent: data.userAgent ? data.userAgent.substring(0, 500) : undefined,
        requestPath: data.requestPath,
        requestMethod: data.requestMethod,
        traceId: data.traceId,
        duration: data.duration,
        status: data.status,
        errorMessage: data.errorMessage,
      });
    } catch (error) {
      // 审计日志写入失败不应影响业务,仅记录错误
      this.logger.error(`Failed to record audit log: ${getErrorMessage(error)}`);
    }
  }

  /**
   * 分页查询审计日志
   */
  async findPage(dto: ListTenantAuditDto) {
    const pageNum = dto.pageNum ?? 1;
    const pageSize = dto.pageSize ?? 10;
    const orderBy = 'createTime';
    const order = 'desc' as const;

    // 构建查询条件
    const where: Prisma.SysTenantAuditLogWhereInput = {};

    if (dto.userId) {
      where.userId = { contains: dto.userId };
    }

    if (dto.userName) {
      where.userName = { contains: dto.userName };
    }

    if (dto.requestTenantId) {
      where.requestTenantId = dto.requestTenantId;
    }

    if (dto.accessTenantId) {
      where.accessTenantId = dto.accessTenantId;
    }

    if (dto.modelName) {
      where.modelName = { contains: dto.modelName };
    }

    if (dto.operation) {
      where.operation = dto.operation;
    }

    if (dto.isCrossTenant !== undefined) {
      where.isCrossTenant = dto.isCrossTenant;
    }

    if (dto.isSuperTenant !== undefined) {
      where.isSuperTenant = dto.isSuperTenant;
    }

    if (dto.isIgnoreTenant !== undefined) {
      where.isIgnoreTenant = dto.isIgnoreTenant;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    // 时间范围
    if (dto.startTime || dto.endTime) {
      where.createTime = {};
      if (dto.startTime) {
        where.createTime.gte = new Date(dto.startTime);
      }
      if (dto.endTime) {
        where.createTime.lte = new Date(dto.endTime);
      }
    }

    // 权限控制: 非超管只能查看本租户的审计日志
    const currentTenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();
    
    if (!isSuper && currentTenantId) {
      where.OR = [
        { requestTenantId: currentTenantId },
        { accessTenantId: currentTenantId },
      ];
    }

    const result = await this.auditRepo.findPage({
      pageNum,
      pageSize,
      where,
      orderBy,
      order,
    });

    return {
      rows: result.rows as TenantAuditVo[],
      total: result.total,
      pageNum: result.pageNum,
      pageSize: result.pageSize,
    };
  }

  /**
   * 跨租户访问统计
   */
  async getCrossTenantStats(): Promise<CrossTenantStatsVo> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 总次数
    const totalCount = await this.auditRepo.count({
      isCrossTenant: true,
    });

    // 今日次数
    const todayCount = await this.auditRepo.count({
      isCrossTenant: true,
      createTime: { gte: todayStart },
    });

    // 访问最多的用户 (最近7天)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const topUsers = await this.auditRepo.countCrossTenantByUser({
      startTime: sevenDaysAgo,
      limit: 10,
    });

    // 访问最多的模型 (最近7天)
    const topModels = await this.auditRepo.countCrossTenantByModel({
      startTime: sevenDaysAgo,
      limit: 10,
    });

    return {
      totalCount,
      todayCount,
      topUsers,
      topModels,
    };
  }

  /**
   * 异常访问分析
   */
  async analyzeAnomalies(): Promise<{ suspiciousAccess: AnomalyAccessVo[] }> {
    const suspiciousAccess: AnomalyAccessVo[] = [];

    // 检测1: 1小时内跨租户访问超过100次
    const highFrequency = await this.auditRepo.detectAnomalies({
      timeWindowMinutes: 60,
      threshold: 100,
    });

    for (const item of highFrequency) {
      suspiciousAccess.push({
        userId: item.userId,
        userName: item.userName,
        pattern: 'high_frequency_cross_tenant',
        severity: item.count > 500 ? 'high' : item.count > 200 ? 'medium' : 'low',
        description: `1小时内跨租户访问${item.count}次`,
        count: item.count,
        lastOccurrence: item.lastTime,
      });
    }

    // 检测2: 24小时内跨租户访问超过500次
    const dailyHighFrequency = await this.auditRepo.detectAnomalies({
      timeWindowMinutes: 24 * 60,
      threshold: 500,
    });

    for (const item of dailyHighFrequency) {
      // 避免重复
      if (!suspiciousAccess.find(a => a.userId === item.userId)) {
        suspiciousAccess.push({
          userId: item.userId,
          userName: item.userName,
          pattern: 'daily_high_frequency_cross_tenant',
          severity: item.count > 2000 ? 'high' : item.count > 1000 ? 'medium' : 'low',
          description: `24小时内跨租户访问${item.count}次`,
          count: item.count,
          lastOccurrence: item.lastTime,
        });
      }
    }

    return { suspiciousAccess };
  }
}
