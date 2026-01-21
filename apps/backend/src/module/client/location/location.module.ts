import { Module } from '@nestjs/common';
import { ClientLocationController } from './location.controller';
import { ClientLocationService } from './location.service';
import { LbsModule } from 'src/module/lbs/lbs.module';

@Module({
    imports: [LbsModule],
    controllers: [ClientLocationController],
    providers: [ClientLocationService],
    exports: [ClientLocationService],
})
export class ClientLocationModule { }

