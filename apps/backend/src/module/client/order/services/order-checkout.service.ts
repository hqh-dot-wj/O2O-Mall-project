import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorePlayConfigService } from 'src/module/marketing/config/config.service';
import { PlayStrategyFactory } from 'src/module/marketing/play/play.factory';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { Decimal } from '@prisma/client/runtime/library';
import { PublishStatus, DelFlag } from '@prisma/client';
import { OrderItemDto } from '../dto/order.dto';
import { OrderItemVo, CheckoutPreviewVo } from '../vo/order.vo';
import { AddressRepository } from '../../address/address.repository';

@Injectable()
export class OrderCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storePlayConfigService: StorePlayConfigService,
    private readonly playStrategyFactory: PlayStrategyFactory,
    // [Dependency] AddressRepository for default address check
    private readonly addressRepo: AddressRepository,
  ) {}

  /**
   * 校验配送范围
   */
  async checkLocation(tenantId: string, lat: number, lng: number) {
    const tenant = await this.prisma.sysTenant.findUnique({
      where: { tenantId },
      include: { geoConfig: true },
    });

    if (tenant?.geoConfig?.latitude && tenant?.geoConfig?.longitude) {
      const dist = this.calcDistance(Number(tenant.geoConfig.latitude), Number(tenant.geoConfig.longitude), lat, lng);
      if (tenant.geoConfig.serviceRadius && dist > tenant.geoConfig.serviceRadius) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '超出服务范围，无法配送/服务');
      }
    }
  }

  /**
   * 结算预览
   */
  async getCheckoutPreview(
    memberId: string,
    tenantId: string,
    items: OrderItemDto[],
    marketingConfigId?: string,
  ): Promise<CheckoutPreviewVo> {
    // 1. 批量查询 SKU 信息
    const skuIds = items.map((i) => i.skuId);
    const skus = await this.prisma.pmsTenantSku.findMany({
      where: { id: { in: skuIds }, isActive: true },
      include: {
        tenantProd: {
          include: { product: true },
        },
        globalSku: true,
      },
    });

    // 2. 校验商品有效性
    const skuMap = new Map(skus.map((s) => [s.id, s]));
    const previewItems: OrderItemVo[] = [];
    let totalAmount = new Decimal(0);

    // [Marketing] Pre-load config and strategy
    let marketingConfig: any = null;
    let marketingStrategy: any = null;
    if (marketingConfigId) {
      const configRes = await this.storePlayConfigService.findOne(marketingConfigId);
      if (configRes && configRes.data) {
        marketingConfig = configRes.data;
        marketingStrategy = this.playStrategyFactory.getStrategy(marketingConfig.templateCode);
      }
    }

    for (const item of items) {
      const sku = skuMap.get(item.skuId);
      BusinessException.throwIfNull(sku, `商品 ${item.skuId} 不存在或已下架`);
      BusinessException.throwIf(sku.tenantProd.tenantId !== tenantId, '商品不属于该门店');

      // 校验库存
      if (sku.stock >= 0 && sku.stock < item.quantity) {
        BusinessException.throwIf(true, `${sku.tenantProd.product.name} 库存不足`);
      }

      // 1.2 校验状态
      const product = sku.tenantProd.product;
      if (
        !sku.isActive ||
        sku.tenantProd.status !== PublishStatus.ON_SHELF ||
        product.delFlag === DelFlag.DELETE ||
        product.publishStatus !== PublishStatus.ON_SHELF
      ) {
        BusinessException.throw(ResponseCode.BUSINESS_ERROR, `商品 ${product.name} 已下架或暂停销售`);
      }

      let finalPrice = sku.price;
      // [Marketing] Apply Strategy Price
      if (marketingConfig && marketingStrategy && marketingConfig.serviceId === sku.tenantProd.productId) {
        if (marketingStrategy.calculatePrice) {
          finalPrice = await marketingStrategy.calculatePrice(marketingConfig, { skuId: sku.id });
        }
      }

      const itemTotal = finalPrice.mul(item.quantity);
      totalAmount = totalAmount.add(itemTotal);

      previewItems.push({
        productId: sku.tenantProd.productId,
        productName: sku.tenantProd.product.name,
        productImg: sku.tenantProd.product.mainImages?.[0] || '',
        skuId: sku.id,
        specData: (sku.globalSku?.specValues as Record<string, string>) || null,
        price: finalPrice.toNumber(),
        quantity: item.quantity,
        totalAmount: itemTotal.toNumber(),
      });
    }

    // 3. 计算运费 (简化逻辑：暂时为0)
    const freightAmount = 0;
    const discountAmount = 0;
    const payAmount = totalAmount.toNumber() + freightAmount - discountAmount;

    // 验证 LBS 距离
    const tenant = await this.prisma.sysTenant.findUnique({
      where: { tenantId },
      include: { geoConfig: true },
    });

    let outOfRange = false;
    let defaultAddress = null;

    if (memberId) {
      // Use Repository
      defaultAddress = await this.addressRepo.findDefault(memberId);

      // Fallback if no default (same logic as before? or simplified? Let's keep consistent)
      if (!defaultAddress) {
        // Maybe just simplified null if no default.
        // But OrderService logic was: if no default, find first.
        // AddressRepository doesn't expose findFirst as public API easily except findDefault.
        // But we can leave it as just findDefault for preview.
        // If user wants to check a specific address, they pass it? No preview uses default.
      }
    }

    if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude && tenant?.geoConfig?.latitude) {
      const dist = this.calcDistance(
        tenant.geoConfig.latitude,
        tenant.geoConfig.longitude,
        defaultAddress.latitude,
        defaultAddress.longitude,
      );
      if (tenant.geoConfig.serviceRadius && dist > tenant.geoConfig.serviceRadius) {
        outOfRange = true;
      }
    }

    // 5. 判断是否包含服务商品
    const hasService = skus.some((s) => (s.tenantProd.product as any).type === 'SERVICE');

    return {
      items: previewItems,
      totalAmount: totalAmount.toNumber(),
      freightAmount,
      discountAmount,
      payAmount,
      defaultAddress: defaultAddress
        ? {
            name: defaultAddress.name,
            phone: defaultAddress.phone,
            address: `${defaultAddress.province}${defaultAddress.city}${defaultAddress.district}${defaultAddress.detail}`,
          }
        : undefined,
      hasService,
      outOfRange,
    };
  }

  /**
   * Helper: Calculate Distance
   */
  calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
