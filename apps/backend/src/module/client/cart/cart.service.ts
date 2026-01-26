import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { AddCartDto, UpdateCartQuantityDto } from './dto/cart.dto';
import { CartItemVo } from './vo/cart.vo';
import { Decimal } from '@prisma/client/runtime/library';
import { DelFlag, PublishStatus } from '@prisma/client';

/**
 * C端购物车服务
 * 提供购物车的增删改查功能
 * 数据存储在 PostgreSQL，同时同步到 Redis 缓存
 */
@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 添加商品到购物车
   * @param memberId 会员ID
   * @param dto 加购参数
   */
  async addToCart(memberId: string, dto: AddCartDto) {
    BusinessException.throwIf(!memberId, '请先登录');

    // 1. 查询 TenantSku 及关联的商品信息
    const tenantSku = await this.prisma.pmsTenantSku.findFirst({
      where: { id: dto.skuId, isActive: true },
      include: {
        tenantProd: {
          include: {
            product: true,
          },
        },
        globalSku: true,
      },
    });
    BusinessException.throwIfNull(tenantSku, '商品不存在或已下架');

    // 1.1 校验总部商品状态 (新增)
    const product = tenantSku.tenantProd.product;
    BusinessException.throwIf(
      product.delFlag === DelFlag.DELETE || product.publishStatus !== PublishStatus.ON_SHELF,
      '商品已下架或暂停销售',
    );

    // 2. 校验租户归属
    BusinessException.throwIf(tenantSku.tenantProd.tenantId !== dto.tenantId, '商品不属于该门店');

    // 3. 校验库存 (stock = -1 表示不限库存)
    if (tenantSku.stock >= 0) {
      const existingCart = await this.prisma.omsCartItem.findUnique({
        where: {
          memberId_tenantId_skuId: {
            memberId,
            tenantId: dto.tenantId,
            skuId: dto.skuId,
          },
        },
      });
      const totalQuantity = (existingCart?.quantity || 0) + dto.quantity;
      BusinessException.throwIf(tenantSku.stock < totalQuantity, '库存不足');
    }

    // 4. Upsert 购物车记录
    // product 已经在上面查询过了
    const cartItem = await this.prisma.omsCartItem.upsert({
      where: {
        memberId_tenantId_skuId: {
          memberId,
          tenantId: dto.tenantId,
          skuId: dto.skuId,
        },
      },
      create: {
        memberId,
        tenantId: dto.tenantId,
        productId: tenantSku.tenantProd.productId,
        skuId: dto.skuId,
        quantity: dto.quantity,
        productName: product.name,
        productImg: product.mainImages?.[0] || '',
        price: tenantSku.price,
        specData: tenantSku.globalSku?.specValues || null,
        shareUserId: dto.shareUserId || null,
      },
      update: {
        quantity: { increment: dto.quantity },
        updateTime: new Date(),
      },
    });

    // 5. 同步 Redis 缓存
    await this.syncCartToRedis(memberId, dto.tenantId);

    this.logger.log(`会员 ${memberId} 添加商品 ${dto.skuId} 到购物车`);
    return Result.ok(cartItem, '添加成功');
  }

  /**
   * 获取购物车列表
   * @param memberId 会员ID
   * @param tenantId 租户ID
   */
  async getCartList(memberId: string, tenantId: string) {
    // 1. 查询购物车记录
    const cartItems = await this.prisma.omsCartItem.findMany({
      where: { memberId, tenantId },
      orderBy: { createTime: 'desc' },
    });

    if (cartItems.length === 0) {
      return Result.ok({ items: [], invalidItems: [] });
    }

    // 2. 批量查询当前 SKU 状态
    const skuIds = cartItems.map((item) => item.skuId);
    const currentSkus = await this.prisma.pmsTenantSku.findMany({
      where: { id: { in: skuIds } },
      include: {
        tenantProd: {
          include: { product: true },
        },
      },
    });

    // 3. 构建返回数据
    const items: CartItemVo[] = [];
    const invalidItems: CartItemVo[] = [];

    for (const cartItem of cartItems) {
      const currentSku = currentSkus.find((s) => s.id === cartItem.skuId);

      const vo: CartItemVo = {
        id: cartItem.id,
        skuId: cartItem.skuId,
        productId: cartItem.productId,
        productName: cartItem.productName,
        productImg: cartItem.productImg,
        specData: cartItem.specData as Record<string, string> | null,
        addPrice: cartItem.price,
        currentPrice: currentSku?.price || cartItem.price,
        priceChanged: currentSku ? !currentSku.price.equals(cartItem.price) : false,
        quantity: cartItem.quantity,
        stockStatus: this.getStockStatus(currentSku, cartItem.quantity),
        shareUserId: cartItem.shareUserId || undefined,
      };

      // 区分有效和无效商品
      const product = currentSku?.tenantProd?.product;
      const isInvalid =
        !currentSku ||
        !currentSku.isActive ||
        currentSku.tenantProd.status !== PublishStatus.ON_SHELF ||
        !product ||
        product.delFlag === DelFlag.DELETE ||
        product.publishStatus !== PublishStatus.ON_SHELF;

      if (isInvalid) {
        invalidItems.push(vo);
      } else {
        items.push(vo);
      }
    }

    return Result.ok({ items, invalidItems });
  }

  /**
   * 更新购物车商品数量
   */
  async updateQuantity(memberId: string, tenantId: string, dto: UpdateCartQuantityDto) {
    // 1. 查询购物车记录
    const cartItem = await this.prisma.omsCartItem.findUnique({
      where: {
        memberId_tenantId_skuId: {
          memberId,
          tenantId,
          skuId: dto.skuId,
        },
      },
    });
    BusinessException.throwIfNull(cartItem, '购物车商品不存在');

    // 2. 校验库存
    const sku = await this.prisma.pmsTenantSku.findFirst({
      where: { id: dto.skuId },
    });
    if (sku && sku.stock >= 0 && sku.stock < dto.quantity) {
      BusinessException.throwIf(true, `库存不足，当前库存: ${sku.stock}`);
    }

    // 3. 更新数量
    const updated = await this.prisma.omsCartItem.update({
      where: { id: cartItem.id },
      data: { quantity: dto.quantity },
    });

    // 4. 同步 Redis
    await this.syncCartToRedis(memberId, tenantId);

    return Result.ok(updated, '更新成功');
  }

  /**
   * 删除购物车商品
   */
  async removeItem(memberId: string, tenantId: string, skuId: string) {
    const deleted = await this.prisma.omsCartItem.deleteMany({
      where: { memberId, tenantId, skuId },
    });

    BusinessException.throwIf(deleted.count === 0, '商品不存在');

    // 同步 Redis
    await this.syncCartToRedis(memberId, tenantId);

    return Result.ok(null, '删除成功');
  }

  /**
   * 清空购物车
   */
  async clearCart(memberId: string, tenantId: string) {
    await this.prisma.omsCartItem.deleteMany({
      where: { memberId, tenantId },
    });

    // 清除 Redis 缓存
    await this.redis.del(`cart:${memberId}:${tenantId}`);

    return Result.ok(null, '清空成功');
  }

  /**
   * 获取购物车商品数量 (用于 Tabbar 角标)
   */
  async getCartCount(memberId: string, tenantId: string): Promise<number> {
    const result = await this.prisma.omsCartItem.aggregate({
      where: { memberId, tenantId },
      _sum: { quantity: true },
    });
    return result._sum.quantity || 0;
  }

  // ============ 私有方法 ============

  /**
   * 同步购物车到 Redis
   */
  private async syncCartToRedis(memberId: string, tenantId: string) {
    try {
      const cartItems = await this.prisma.omsCartItem.findMany({
        where: { memberId, tenantId },
        select: { skuId: true, quantity: true },
      });

      const key = `cart:${memberId}:${tenantId}`;
      if (cartItems.length === 0) {
        await this.redis.del(key);
      } else {
        const data: Record<string, string> = {};
        cartItems.forEach((item) => {
          data[item.skuId] = String(item.quantity);
        });
        await this.redis.hmset(key, data, 7 * 24 * 60 * 60); // 7天过期
      }
    } catch (error) {
      this.logger.warn('同步购物车到Redis失败', error);
    }
  }

  /**
   * 判断库存状态
   */
  private getStockStatus(
    sku: { stock: number; isActive: boolean } | null,
    quantity: number,
  ): 'normal' | 'insufficient' | 'soldOut' {
    if (!sku || !sku.isActive) return 'soldOut';
    if (sku.stock === -1) return 'normal'; // 不限库存
    if (sku.stock === 0) return 'soldOut';
    if (sku.stock < quantity) return 'insufficient';
    return 'normal';
  }
}
