import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TenantContext } from '../tenant/tenant.context';
import { ClsService } from 'nestjs-cls';

/**
 * 租户审计拦截器
 * 
 * @description 记录租户数据访问行为,用于安全审计
 */
@Injectable()
export class TenantAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantAuditInterceptor.name);

  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // 提取审计数据
    const auditData = this.extractAuditData(context, request);

    // 存储到 CLS,供 Repository 使用
    this.cls.set('AUDIT_DATA', auditData);

    return next.handle().pipe(
      tap(() => {
        // 成功时记录
        const duration = Date.now() - startTime;
        this.cls.set('AUDIT_DURATION', duration);
        this.cls.set('AUDIT_STATUS', 'success');
      }),
      catchError((error) => {
        // 失败时记录
        const duration = Date.now() - startTime;
        this.cls.set('AUDIT_DURATION', duration);
        this.cls.set('AUDIT_STATUS', 'error');
        this.cls.set('AUDIT_ERROR', error.message || String(error));
        return throwError(() => error);
      }),
    );
  }

  /**
   * 提取审计数据
   */
  private extractAuditData(context: ExecutionContext, request: any) {
    const user = request.user;
    const tenantId = TenantContext.getTenantId();
    const isSuperTenant = TenantContext.isSuperTenant();
    const isIgnoreTenant = TenantContext.isIgnoreTenant();

    return {
      userId: user?.userId,
      userName: user?.userName,
      userType: user ? 'admin' : 'anonymous',
      requestTenantId: tenantId,
      isSuperTenant,
      isIgnoreTenant,
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      requestPath: request.url,
      requestMethod: request.method,
      traceId: this.cls.get('traceId') || request.headers['x-trace-id'],
    };
  }

  /**
   * 获取客户端 IP
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      ''
    );
  }
}
