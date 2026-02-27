import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StockAlertService } from './stock-alert.service';

/**
 * 库存预警定时任务
 * 每日 09:00 扫描低库存 SKU 并发送站内信
 */
@Injectable()
export class StockAlertScheduler {
  private readonly logger = new Logger(StockAlertScheduler.name);

  constructor(private readonly stockAlertService: StockAlertService) {}

  /**
   * 每日 09:00 执行库存预警扫描
   */
  @Cron('0 0 9 * * *')
  async handleStockAlert() {
    this.logger.log('触发库存预警定时任务');
    await this.stockAlertService.checkLowStock();
  }
}
