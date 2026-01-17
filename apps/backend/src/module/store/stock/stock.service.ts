import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { ListStockDto, UpdateStockDto } from './dto';

/**
 * 库存管理服务层
 * 处理库存的查询和更新逻辑
 */
@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) { }

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
          name: productName ? { contains: productName } : undefined
        }
      }
    };

    // 并行执行查询和计数
    const [records, total] = await Promise.all([
      this.prisma.pmsTenantSku.findMany({
        where,
        skip: query.skip,          // 使用 DTO 的 skip 计算属性
        take: query.take,          // 使用 DTO 的 take 计算属性
        include: {
          tenantProd: {
            include: {
              product: true
            }
          },
          globalSku: true
        }
      }),
      this.prisma.pmsTenantSku.count({ where }),
    ]);

    // 返回标准分页结果
    return Result.page(records, total);
  }

  /**
   * 更新库存数量
   * 
   * @param tenantId - 当前租户ID
   * @param dto - 更新参数 DTO
   * @returns 更新后的 SKU 信息
   */
  async updateStock(tenantId: string, dto: UpdateStockDto) {
    const { skuId, stockChange } = dto;

    // 查询当前 SKU 信息，确保属于当前租户
    const sku = await this.prisma.pmsTenantSku.findFirst({
      where: { id: skuId, tenantProd: { tenantId } }
    });

    // 如果 SKU 不存在，抛出业务异常
    BusinessException.throwIfNull(sku, 'SKU不存在或无权访问');

    // 计算新库存
    const newStock = sku.stock + Number(stockChange);

    // 检查库存是否不足
    BusinessException.throwIf(newStock < 0, '库存不足');

    // 更新数据库
    const res = await this.prisma.pmsTenantSku.update({
      where: { id: skuId },
      data: { stock: newStock }
    });

    // 返回成功结果
    return Result.ok(res);
  }
}
