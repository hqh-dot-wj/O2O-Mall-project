import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { BusinessConstants } from 'src/common/constants/business.constants';
import { DelFlag, Status } from '@prisma/client';
import { NotificationService } from 'src/module/notification/notification.service';
import { StockAlertConfigDto } from './dto';

/**
 * 库存预警服务
 * 低库存阈值配置 + 定时扫描 + 消息通知
 */
@Injectable()
export class StockAlertService {
  private readonly logger = new Logger(StockAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 获取当前租户的低库存阈值
   */
  async getThreshold(tenantId: string) {
    const config = await this.prisma.sysConfig.findFirst({
      where: {
        tenantId,
        configKey: BusinessConstants.STOCK_ALERT.CONFIG_KEY,
        status: Status.NORMAL,
        delFlag: DelFlag.NORMAL,
      },
    });

    const threshold = config
      ? parseInt(config.configValue, 10)
      : BusinessConstants.STOCK_ALERT.DEFAULT_THRESHOLD;

    return Result.ok({ threshold: Number.isNaN(threshold) ? BusinessConstants.STOCK_ALERT.DEFAULT_THRESHOLD : threshold });
  }

  /**
   * 设置低库存阈值
   */
  async setThreshold(tenantId: string, dto: StockAlertConfigDto) {
    const { threshold } = dto;

    const existing = await this.prisma.sysConfig.findFirst({
      where: {
        tenantId,
        configKey: BusinessConstants.STOCK_ALERT.CONFIG_KEY,
        status: Status.NORMAL,
        delFlag: DelFlag.NORMAL,
      },
    });

    if (existing) {
      await this.prisma.sysConfig.update({
        where: { configId: existing.configId },
        data: { configValue: String(threshold) },
      });
    } else {
      await this.prisma.sysConfig.create({
        data: {
          tenantId,
          configName: '门店商品低库存预警阈值',
          configKey: BusinessConstants.STOCK_ALERT.CONFIG_KEY,
          configValue: String(threshold),
          configType: 'Y',
          status: Status.NORMAL,
          delFlag: DelFlag.NORMAL,
        },
      });
    }

    return Result.ok({ threshold }, '阈值已更新');
  }

  /**
   * 扫描所有租户的低库存 SKU 并发送预警消息
   * 由定时任务每日 09:00 调用
   */
  async checkLowStock() {
    const startTime = Date.now();
    this.logger.log('开始执行库存预警扫描...');

    try {
      const tenants = await this.prisma.sysTenant.findMany({
        where: { status: Status.NORMAL },
        select: { tenantId: true, companyName: true },
      });

      let totalAlerts = 0;

      for (const tenant of tenants) {
        try {
          const sent = await this.checkTenantLowStock(tenant.tenantId, tenant.companyName);
          totalAlerts += sent;
        } catch (error) {
          this.logger.error(`租户 ${tenant.companyName}(${tenant.tenantId}) 库存预警处理失败:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`库存预警扫描完成: 处理 ${tenants.length} 个租户, 发送 ${totalAlerts} 条预警, 耗时 ${duration}ms`);
    } catch (error) {
      this.logger.error('库存预警扫描执行失败:', error);
    }
  }

  /**
   * 检查单个租户的低库存并发送消息
   */
  private async checkTenantLowStock(tenantId: string, companyName: string): Promise<number> {
    const config = await this.prisma.sysConfig.findFirst({
      where: {
        tenantId,
        configKey: BusinessConstants.STOCK_ALERT.CONFIG_KEY,
        status: Status.NORMAL,
        delFlag: DelFlag.NORMAL,
      },
    });

    const threshold = config
      ? parseInt(config.configValue, 10)
      : BusinessConstants.STOCK_ALERT.DEFAULT_THRESHOLD;
    const effectiveThreshold = Number.isNaN(threshold) ? BusinessConstants.STOCK_ALERT.DEFAULT_THRESHOLD : threshold;

    const lowStockSkus = await this.prisma.pmsTenantSku.findMany({
      where: {
        tenantId,
        isActive: true,
        stock: { lt: effectiveThreshold },
      },
      include: {
        globalSku: { select: { specValues: true } },
        tenantProd: { include: { product: { select: { name: true } } } },
      },
    });

    if (lowStockSkus.length === 0) {
      return 0;
    }

    const lines = lowStockSkus.map(
      (sku) =>
        `- ${sku.tenantProd.product.name} (${sku.globalSku.specValues || '默认规格'}): 库存 ${sku.stock}，阈值 ${effectiveThreshold}`,
    );
    const content = `以下商品库存不足，请及时补货：\n\n${lines.join('\n')}`;

    await this.notificationService.send({
      target: tenantId,
      channel: 'IN_APP',
      tenantId,
      title: '库存预警',
      content,
      template: 'STOCK_ALERT',
    });

    this.logger.log(`租户 ${companyName}(${tenantId}): 发送库存预警，共 ${lowStockSkus.length} 个 SKU`);
    return 1;
  }
}
