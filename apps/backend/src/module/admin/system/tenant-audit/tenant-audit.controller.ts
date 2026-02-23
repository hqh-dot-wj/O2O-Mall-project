import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import { Result } from 'src/common/response/result';
import { ListTenantAuditDto } from './dto/list-tenant-audit.dto';
import { TenantAuditService } from './tenant-audit.service';
import { AnomalyAccessVo, CrossTenantStatsVo, TenantAuditVo } from './vo/tenant-audit.vo';

/**
 * 租户审计日志 Controller
 * 
 * @tenantScope PlatformOnly
 * @description 审计日志查询需要特殊权限,非超管只能查看本租户相关日志
 */
@ApiTags('租户审计日志')
@Controller('admin/system/tenant-audit')
@ApiBearerAuth('Authorization')
export class TenantAuditController {
  constructor(private readonly auditService: TenantAuditService) {}

  /**
   * 分页查询审计日志
   * 
   * @sloCategory admin
   * @sloLatency P99 < 1000ms
   */
  @Api({ summary: '审计日志-列表', type: TenantAuditVo })
  @RequirePermission('system:tenant-audit:list')
  @Get('list')
  async findPage(@Query() dto: ListTenantAuditDto) {
    const result = await this.auditService.findPage(dto);
    return Result.ok(result);
  }

  /**
   * 跨租户访问统计
   * 
   * @sloCategory admin
   * @sloLatency P99 < 2000ms
   */
  @Api({ summary: '跨租户访问统计', type: CrossTenantStatsVo })
  @RequirePermission('system:tenant-audit:stats')
  @Get('cross-tenant-stats')
  async getCrossTenantStats() {
    const result = await this.auditService.getCrossTenantStats();
    return Result.ok(result);
  }

  /**
   * 异常访问分析
   * 
   * @sloCategory admin
   * @sloLatency P99 < 2000ms
   */
  @Api({ summary: '异常访问分析', type: AnomalyAccessVo })
  @RequirePermission('system:tenant-audit:anomalies')
  @Get('anomalies')
  async analyzeAnomalies() {
    const result = await this.auditService.analyzeAnomalies();
    return Result.ok(result);
  }
}
