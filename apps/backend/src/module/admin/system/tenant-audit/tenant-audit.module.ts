import { Module } from '@nestjs/common';
import { TenantAuditController } from './tenant-audit.controller';
import { TenantAuditRepository } from './tenant-audit.repository';
import { TenantAuditService } from './tenant-audit.service';

/**
 * 租户审计日志模块
 */
@Module({
  controllers: [TenantAuditController],
  providers: [TenantAuditService, TenantAuditRepository],
  exports: [TenantAuditService],
})
export class TenantAuditModule {}
