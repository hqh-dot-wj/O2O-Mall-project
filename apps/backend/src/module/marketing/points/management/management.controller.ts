import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PointsTransactionType } from '@prisma/client';
import { PointsStatisticsService } from '../statistics/statistics.service';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { ExportTransactionsQueryDto } from './dto/export-transactions-query.dto';

/**
 * 积分管理控制器
 * 
 * @description 提供积分统计和管理接口
 */
@ApiTags('积分管理')
@Controller('admin/marketing/points')
@ApiBearerAuth('Authorization')
export class PointsManagementController {
  constructor(private readonly statisticsService: PointsStatisticsService) {}

  @Get('statistics/earn')
  @Api({ summary: '查询积分发放统计' })
  @RequirePermission('marketing:points:statistics:earn')
  async getEarnStatistics(
    @Query('startTime') startTime?: Date,
    @Query('endTime') endTime?: Date,
  ) {
    return this.statisticsService.getEarnStatistics({ startTime, endTime });
  }

  @Get('statistics/use')
  @Api({ summary: '查询积分使用统计' })
  @RequirePermission('marketing:points:statistics:use')
  async getUseStatistics(
    @Query('startTime') startTime?: Date,
    @Query('endTime') endTime?: Date,
  ) {
    return this.statisticsService.getUseStatistics({ startTime, endTime });
  }

  @Get('statistics/balance')
  @Api({ summary: '查询积分余额统计' })
  @RequirePermission('marketing:points:statistics:balance')
  async getBalanceStatistics() {
    return this.statisticsService.getBalanceStatistics();
  }

  @Get('statistics/expire')
  @Api({ summary: '查询积分过期统计' })
  @RequirePermission('marketing:points:statistics:expire')
  async getExpireStatistics(
    @Query('startTime') startTime?: Date,
    @Query('endTime') endTime?: Date,
  ) {
    return this.statisticsService.getExpireStatistics({ startTime, endTime });
  }

  @Get('ranking')
  @Api({ summary: '查询积分排行榜' })
  @RequirePermission('marketing:points:ranking:list')
  async getRanking(@Query('limit') limit?: number) {
    return this.statisticsService.getRanking(limit);
  }

  @Get('export')
  @Api({ summary: '导出积分明细' })
  @RequirePermission('marketing:points:transaction:export')
  async exportTransactions(@Query() query: ExportTransactionsQueryDto) {
    return this.statisticsService.exportTransactions({
      memberId: query.memberId,
      type: query.type as PointsTransactionType | undefined,
      startTime: query.startTime,
      endTime: query.endTime,
    });
  }
}
