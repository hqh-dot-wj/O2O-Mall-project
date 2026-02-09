import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PointsTransactionType } from '@prisma/client';
import { Result } from 'src/common/response/result';
import { PointsStatisticsService } from '../statistics/statistics.service';

/**
 * 积分管理控制器
 * 
 * @description 提供积分统计和管理接口
 */
@ApiTags('积分管理')
@Controller('admin/marketing/points')
export class PointsManagementController {
  constructor(private readonly statisticsService: PointsStatisticsService) {}

  @Get('statistics/earn')
  @ApiOperation({ summary: '查询积分发放统计' })
  async getEarnStatistics(
    @Query('startTime') startTime?: Date,
    @Query('endTime') endTime?: Date,
  ) {
    return this.statisticsService.getEarnStatistics({ startTime, endTime });
  }

  @Get('statistics/use')
  @ApiOperation({ summary: '查询积分使用统计' })
  async getUseStatistics(
    @Query('startTime') startTime?: Date,
    @Query('endTime') endTime?: Date,
  ) {
    return this.statisticsService.getUseStatistics({ startTime, endTime });
  }

  @Get('statistics/balance')
  @ApiOperation({ summary: '查询积分余额统计' })
  async getBalanceStatistics() {
    return this.statisticsService.getBalanceStatistics();
  }

  @Get('statistics/expire')
  @ApiOperation({ summary: '查询积分过期统计' })
  async getExpireStatistics(
    @Query('startTime') startTime?: Date,
    @Query('endTime') endTime?: Date,
  ) {
    return this.statisticsService.getExpireStatistics({ startTime, endTime });
  }

  @Get('ranking')
  @ApiOperation({ summary: '查询积分排行榜' })
  async getRanking(@Query('limit') limit?: number) {
    return this.statisticsService.getRanking(limit);
  }

  @Get('export')
  @ApiOperation({ summary: '导出积分明细' })
  async exportTransactions(
    @Query('memberId') memberId?: string,
    @Query('type') type?: PointsTransactionType,
    @Query('startTime') startTime?: Date,
    @Query('endTime') endTime?: Date,
  ) {
    return this.statisticsService.exportTransactions({
      memberId,
      type,
      startTime,
      endTime,
    });
  }
}
