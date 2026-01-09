import { Module } from '@nestjs/common';
import { SystemModule } from './system/system.module';
import { MonitorModule } from './monitor/monitor.module';
import { UploadModule } from './upload/upload.module';
import { ResourceModule } from './resource/resource.module';
import { AuthModule } from './auth/auth.module';
// import { ToolModule } from './tool/tool.module'; // Tool module missing/skipped

@Module({
    imports: [
        AuthModule,
        SystemModule,
        MonitorModule,
        UploadModule,
        ResourceModule,
    ],
})
export class AdminModule { }
