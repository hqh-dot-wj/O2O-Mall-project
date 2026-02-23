import { ApiProperty } from '@nestjs/swagger';

/**
 * 租户审计日志 VO
 */
export class TenantAuditVo {
  @ApiProperty({ description: '审计日志ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId?: string;

  @ApiProperty({ description: '用户名' })
  userName?: string;

  @ApiProperty({ description: '用户类型' })
  userType: string;

  @ApiProperty({ description: '请求租户ID' })
  requestTenantId?: string;

  @ApiProperty({ description: '访问租户ID' })
  accessTenantId?: string;

  @ApiProperty({ description: '操作' })
  action: string;

  @ApiProperty({ description: '模型名称' })
  modelName: string;

  @ApiProperty({ description: '操作类型' })
  operation: string;

  @ApiProperty({ description: '是否超级管理员' })
  isSuperTenant: boolean;

  @ApiProperty({ description: '是否忽略租户' })
  isIgnoreTenant: boolean;

  @ApiProperty({ description: '是否跨租户访问' })
  isCrossTenant: boolean;

  @ApiProperty({ description: 'IP地址' })
  ip?: string;

  @ApiProperty({ description: 'User Agent' })
  userAgent?: string;

  @ApiProperty({ description: '请求路径' })
  requestPath?: string;

  @ApiProperty({ description: '请求方法' })
  requestMethod?: string;

  @ApiProperty({ description: '追踪ID' })
  traceId?: string;

  @ApiProperty({ description: '耗时(ms)' })
  duration?: number;

  @ApiProperty({ description: '状态' })
  status: string;

  @ApiProperty({ description: '错误信息' })
  errorMessage?: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;
}

/**
 * 跨租户访问统计 VO
 */
export class CrossTenantStatsVo {
  @ApiProperty({ description: '总次数' })
  totalCount: number;

  @ApiProperty({ description: '今日次数' })
  todayCount: number;

  @ApiProperty({ description: '访问最多的用户' })
  topUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;

  @ApiProperty({ description: '访问最多的模型' })
  topModels: Array<{
    modelName: string;
    count: number;
  }>;
}

/**
 * 异常访问 VO
 */
export class AnomalyAccessVo {
  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '用户名' })
  userName?: string;

  @ApiProperty({ description: '异常模式' })
  pattern: string;

  @ApiProperty({ description: '严重程度' })
  severity: 'low' | 'medium' | 'high';

  @ApiProperty({ description: '描述' })
  description: string;

  @ApiProperty({ description: '发生次数' })
  count: number;

  @ApiProperty({ description: '最后发生时间' })
  lastOccurrence: Date;
}
