import { Module, Global } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';
// 未来添加: import { ClientUserModule } from './user/user.module';

@Module({
    imports: [
        ClientAuthModule,
        // ClientUserModule
    ],
    controllers: [],
    providers: [],
    exports: [ClientAuthModule]
})
export class ClientModule { }
