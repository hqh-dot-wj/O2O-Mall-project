import { Module } from '@nestjs/common';
import { TenantPackageService } from './tenant-package.service';
import { TenantPackageController } from './tenant-package.controller';

@Module({
    controllers: [TenantPackageController],
    providers: [TenantPackageService],
    exports: [TenantPackageService],
})
export class TenantPackageModule { }
