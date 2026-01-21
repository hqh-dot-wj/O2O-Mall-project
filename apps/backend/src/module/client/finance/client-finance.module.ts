import { Module } from '@nestjs/common';
import { ClientFinanceService } from './client-finance.service';
import { ClientFinanceController } from './client-finance.controller';
import { FinanceModule } from 'src/module/finance/finance.module';

@Module({
    imports: [FinanceModule],
    controllers: [ClientFinanceController],
    providers: [ClientFinanceService],
    exports: [ClientFinanceService],
})
export class ClientFinanceModule { }
