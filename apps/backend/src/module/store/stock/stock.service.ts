import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantSkuRepository } from '../product/tenant-sku.repository';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { ExportTable, ExportHeader } from 'src/common/utils/export';
import { getErrorInfo } from 'src/common/utils/error';
import { ListStockDto, UpdateStockDto, BatchUpdateStockDto } from './dto';

/**
 * 库存管理服务层
 * 处理库存的查询和更新逻辑
 */
@Injectable()
export class StockService {
  constructor(
    private readonly tenantSkuRepo: TenantSkuRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 分页查询库存列表
   */
  async findAll(tenantId: string, query: ListStockDto) {
    const [records, total] = await this.tenantSkuRepo.findStockList(tenantId, {
      skip: query.skip,
      take: query.take,
      productName: query.productName,
    });
    return Result.page(records, total);
  }

  /**
   * 更新库存数量
   *
   * @description
   * 使用 TenantSkuRepository 原子操作,租户隔离,防负库存
   * 成功后写入库存变动流水表
   */
  async updateStock(tenantId: string, dto: UpdateStockDto, operatorId?: string) {
    const { skuId, stockChange, reason } = dto;
    const change = Number(stockChange);

    BusinessException.throwIf(change === 0, '库存变动值不能为零');

    const result = await this.tenantSkuRepo.updateStockForTenant(tenantId, skuId, change);

    if (!result.updated) {
      if (!result.sku) {
        throw new BusinessException(ResponseCode.DATA_NOT_FOUND, 'SKU不存在或无权访问');
      }
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        `库存不足,当前库存: ${result.sku.stock}, 需要: ${Math.abs(change)}`,
      );
    }

    const stockAfter = result.sku.stock;
    const stockBefore = stockAfter - change;

    await this.prisma.pmsStockLog.create({
      data: {
        tenantId,
        tenantSkuId: skuId,
        operatorId: operatorId ?? '',
        stockChange: change,
        stockBefore,
        stockAfter,
        reason: reason ?? null,
      },
    });

    return Result.ok(result.sku);
  }

  /**
   * 批量调整库存
   * 单个失败不影响其他，返回成功/失败统计及明细
   */
  async batchUpdateStock(tenantId: string, dto: BatchUpdateStockDto, operatorId?: string) {
    const results: Array<{ skuId: string; success: boolean; error?: string }> = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of dto.items) {
      const change = Number(item.stockChange);
      if (change === 0) {
        results.push({ skuId: item.skuId, success: false, error: '库存变动值不能为零' });
        failCount++;
        continue;
      }

      try {
        const result = await this.tenantSkuRepo.updateStockForTenant(tenantId, item.skuId, change);

        if (!result.updated) {
          const msg = !result.sku
            ? 'SKU不存在或无权访问'
            : `库存不足,当前库存: ${result.sku.stock}, 需要: ${Math.abs(change)}`;
          results.push({ skuId: item.skuId, success: false, error: msg });
          failCount++;
          continue;
        }

        const stockAfter = result.sku.stock;
        const stockBefore = stockAfter - change;

        await this.prisma.pmsStockLog.create({
          data: {
            tenantId,
            tenantSkuId: item.skuId,
            operatorId: operatorId ?? '',
            stockChange: change,
            stockBefore,
            stockAfter,
            reason: item.reason ?? null,
          },
        });

        results.push({ skuId: item.skuId, success: true });
        successCount++;
      } catch (error) {
        const { message } = getErrorInfo(error);
        results.push({ skuId: item.skuId, success: false, error: message });
        failCount++;
      }
    }

    return Result.ok(
      { successCount, failCount, details: results },
      `批量调整完成: 成功 ${successCount} 个, 失败 ${failCount} 个`,
    );
  }

  /**
   * 导出库存数据（Excel）
   * 最多导出 5000 条
   */
  async exportStock(query: ListStockDto, res: Response) {
    const tenantId = TenantContext.getTenantId();
    const [records] = await this.tenantSkuRepo.findStockList(tenantId, {
      skip: 0,
      take: 5000,
      productName: query.productName,
    });

    const exportData = records.map((sku) => {
      const spec = sku.globalSku?.specValues;
      return {
        productName: sku.tenantProd?.product?.name ?? '',
        specValues: typeof spec === 'string' ? spec : spec ? JSON.stringify(spec) : '',
        stock: sku.stock,
        price: Number(sku.price),
        skuId: sku.id,
      };
    });

    const headers: ExportHeader[] = [
      { title: '商品名称', dataIndex: 'productName', width: 30 },
      { title: '规格', dataIndex: 'specValues', width: 20 },
      { title: '库存', dataIndex: 'stock', width: 10 },
      { title: '售价', dataIndex: 'price', width: 12 },
      { title: 'SKU ID', dataIndex: 'skuId', width: 36 },
    ];

    const filename = `库存数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await ExportTable(
      { data: exportData, header: headers, sheetName: '库存列表', filename },
      res,
    );
  }
}
