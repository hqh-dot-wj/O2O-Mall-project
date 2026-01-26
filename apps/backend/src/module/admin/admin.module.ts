import { Module } from '@nestjs/common';
import { SystemModule } from './system/system.module';
import { MonitorModule } from './monitor/monitor.module';
import { UploadModule } from './upload/upload.module';
import { ResourceModule } from './resource/resource.module';
import { AuthModule } from './auth/auth.module';
import { MemberModule } from './member/member.module';
import { AdminUpgradeModule } from './upgrade/admin-upgrade.module';
// import { ToolModule } from './tool/tool.module'; // Tool module missing/skipped

@Module({
  imports: [AuthModule, SystemModule, MonitorModule, UploadModule, ResourceModule, MemberModule, AdminUpgradeModule],
})
export class AdminModule {}
