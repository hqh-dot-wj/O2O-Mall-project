import { Module } from '@nestjs/common';
import { StoreFinanceController } from './store-finance.controller';
import { StoreFinanceService } from './store-finance.service';
import { FinanceModule } from 'src/module/finance/finance.module';

/**
 * Store端财务管理模块
 */
@Module({
    imports: [FinanceModule],
    controllers: [StoreFinanceController],
    providers: [StoreFinanceService],
    exports: [StoreFinanceService],
})
export class StoreFinanceModule { }
