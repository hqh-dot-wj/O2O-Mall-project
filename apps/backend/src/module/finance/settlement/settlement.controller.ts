import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { SettlementScheduler } from './settlement.scheduler';
import { Result } from 'src/common/response';

/**
 * 结算管理控制器
 * 
 * @description
 * S-T6: 新增结算统计功能
 * S-T7: 新增手动触发结算接口
 */
@ApiTags('财务管理-结算管理')
@Controller('finance/settlement')
export class SettlementController {
  constructor(private readonly settlementScheduler: SettlementScheduler) {}

  @Get('stats')
  @Api({ summary: '获取结算统计' })
  @RequirePermission('finance:settlement:stats')
  async getStats() {
    const stats = await this.settlementScheduler.getSettlementStats();
    return Result.ok({
      pendingCount: stats.pendingCount,
      pendingAmount: Number(stats.pendingAmount),
      todaySettledCount: stats.todaySettledCount,
      todaySettledAmount: Number(stats.todaySettledAmount),
    });
  }

  @Post('trigger')
  @Api({ summary: '手动触发结算' })
  @RequirePermission('finance:settlement:trigger')
  async trigger() {
    const result = await this.settlementScheduler.triggerSettlement();
    return Result.ok({
      settledCount: result.settledCount,
      failedCount: result.failedCount,
      totalAmount: Number(result.totalAmount),
    }, `结算完成：成功 ${result.settledCount} 条，失败 ${result.failedCount} 条`);
  }
}
