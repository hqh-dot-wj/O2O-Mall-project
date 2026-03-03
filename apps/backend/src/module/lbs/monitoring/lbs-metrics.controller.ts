import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LbsMetricsService } from './lbs-metrics.service';
import { Result } from 'src/common/response';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';

/**
 * LBS 监控指标控制器
 * @tenantScope PlatformOnly
 */
@ApiTags('LBS监控')
@Controller('admin/lbs/metrics')
export class LbsMetricsController {
  constructor(private readonly metricsService: LbsMetricsService) {}

  @Api({ summary: '获取今日匹配统计' })
  @RequirePermission('lbs:metrics:query')
  @Get('today')
  async getTodayStats() {
    const stats = await this.metricsService.getTodayMatchStats();
    return Result.ok(stats);
  }

  @Api({ summary: '获取当前小时P95延迟' })
  @RequirePermission('lbs:metrics:query')
  @Get('p95-latency')
  async getP95Latency() {
    const p95 = await this.metricsService.getCurrentHourP95Latency();
    return Result.ok({ p95Latency: p95 });
  }

  @Api({ summary: '获取热门站点Top10' })
  @RequirePermission('lbs:metrics:query')
  @Get('top-stations')
  async getTopStations() {
    const stations = await this.metricsService.getTopStations(10);
    return Result.ok({ stations });
  }
}
