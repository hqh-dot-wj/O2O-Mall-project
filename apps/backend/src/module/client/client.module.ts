import { Module, Global } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        ClientAuthModule,
        UserModule
    ],
    controllers: [],
    providers: [],
    exports: [ClientAuthModule]
})
export class ClientModule { }
