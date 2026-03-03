import { Module } from '@nestjs/common';
import { AdminFinanceController } from './admin-finance.controller';
import { FinanceModule } from 'src/module/finance/finance.module';

/**
 * Admin端财务管理模块
 * 
 * @description
 * 第三阶段功能入口：
 * - 钱包统计、监控、冻结
 * - 佣金查询、统计
 * - 提现统计、导出、通知
 * - 结算日志查询
 */
@Module({
  imports: [FinanceModule],
  controllers: [AdminFinanceController],
})
export class AdminFinanceModule {}
