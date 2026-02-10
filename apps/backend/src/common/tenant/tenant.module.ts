import { Module, Global } from '@nestjs/common';
import { TenantHelper } from './tenant.helper';
import { TenantGuard } from './tenant.guard';
import { TenantMiddleware } from './tenant.middleware';

@Global()
@Module({
  providers: [TenantHelper, TenantGuard, TenantMiddleware],
  exports: [TenantHelper, TenantGuard, TenantMiddleware],
})
export class TenantModule {}
