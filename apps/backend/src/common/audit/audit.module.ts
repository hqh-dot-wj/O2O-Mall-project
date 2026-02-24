import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantAuditModule } from 'src/module/admin/system/tenant-audit/tenant-audit.module';
import { TenantAuditService } from 'src/module/admin/system/tenant-audit/tenant-audit.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantAuditInterceptor } from '../interceptors/tenant-audit.interceptor';

/**
 * 审计模块
 * 
 * @description 全局审计模块,负责:
 * 1. 将 TenantAuditService 注册到 ClsService
 * 2. 注册全局审计拦截器
 */
@Global()
@Module({
  imports: [TenantAuditModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantAuditInterceptor,
    },
  ],
  exports: [],
})
export class AuditModule implements OnModuleInit {
  constructor(
    private readonly cls: ClsService,
    private readonly tenantAuditService: TenantAuditService,
  ) {}

  /**
   * 模块初始化时注册审计服务到 CLS
   */
  onModuleInit() {
    // 注册审计服务到 CLS,使其在整个请求生命周期中可用
    // 注意: 这里不能直接 set,因为 CLS 是请求级别的
    // 我们需要在中间件或拦截器中动态设置
    // 所以这里我们将服务实例存储为模块级别的静态变量
    AuditModule.auditService = this.tenantAuditService;
  }

  /**
   * 静态审计服务实例,供拦截器使用
   */
  static auditService: TenantAuditService;
}
