import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { ListStockDto, UpdateStockDto } from './dto';

/**
 * 库存管理服务层
 * 处理库存的查询和更新逻辑
 */
@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 分页查询库存列表
   *
   * @param tenantId - 当前租户ID
   * @param query - 查询参数 DTO
   * @returns 分页结果
   */
  async findAll(tenantId: string, query: ListStockDto) {
    const { productName } = query;

    // 构建查询条件
    const where: Prisma.PmsTenantSkuWhereInput = {
      tenantProd: {
        tenantId,
        product: {
          name: productName ? { contains: productName } : undefined,
        },
      },
    };

    // 并行执行查询和计数
    const [records, total] = await Promise.all([
      this.prisma.pmsTenantSku.findMany({
        where,
        skip: query.skip, // 使用 DTO 的 skip 计算属性
        take: query.take, // 使用 DTO 的 take 计算属性
        include: {
          tenantProd: {
            include: {
              product: true,
            },
          },
          globalSku: true,
        },
      }),
      this.prisma.pmsTenantSku.count({ where }),
    ]);

    // 返回标准分页结果
    return Result.page(records, total);
  }

  /**
   * 更新库存数量
   *
   * @description
   * 使用数据库原子操作(increment/decrement)防止并发竞态
   *
   * @param tenantId - 当前租户ID
   * @param dto - 更新参数
   * @param dto.skuId - SKU ID
   * @param dto.stockChange - 库存变化量(正数增加,负数减少)
   * @returns 更新后的 SKU 信息
   *
   * @throws BusinessException
   * - SKU不存在或无权访问
   * - 库存不足(扣减时)
   *
   * @concurrency 使用数据库原子操作,绝对安全,无竞态风险
   * @performance 单条SQL完成,性能最优,支持高并发
   *
   * @example
   * // 增加库存
   * await updateStock('tenant1', { skuId: 'sku1', stockChange: 100 });
   *
   * // 减少库存
   * await updateStock('tenant1', { skuId: 'sku1', stockChange: -10 });
   */
  async updateStock(tenantId: string, dto: UpdateStockDto) {
    const { skuId, stockChange } = dto;
    const change = Number(stockChange);

    // 使用 updateMany 原子操作更新库存
    // 对于扣减操作,在 where 条件中检查库存充足性,防止负库存
    const affected = await this.prisma.pmsTenantSku.updateMany({
      where: {
        id: skuId,
        tenantProd: { tenantId }, // 确保属于当前租户
        // 扣减库存时,检查库存是否充足
        stock: change < 0 ? { gte: Math.abs(change) } : undefined,
      },
      data: {
        stock: {
          // 根据正负号选择 increment 或 decrement
          [change > 0 ? 'increment' : 'decrement']: Math.abs(change),
        },
      },
    });

    // 检查更新结果
    if (affected.count === 0) {
      // 查询 SKU 是否存在,给出更准确的错误提示
      const sku = await this.prisma.pmsTenantSku.findFirst({
        where: { id: skuId, tenantProd: { tenantId } },
      });

      if (!sku) {
        throw new BusinessException(ResponseCode.DATA_NOT_FOUND, 'SKU不存在或无权访问');
      } else {
        throw new BusinessException(
          ResponseCode.BUSINESS_ERROR,
          `库存不足,当前库存: ${sku.stock}, 需要: ${Math.abs(change)}`,
        );
      }
    }

    // 查询最新数据返回
    const updated = await this.prisma.pmsTenantSku.findUnique({
      where: { id: skuId },
      include: {
        globalSku: true,
        tenantProd: {
          include: { product: true },
        },
      },
    });

    return Result.ok(updated);
  }
}
