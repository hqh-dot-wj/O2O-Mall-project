import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorePlayConfigService } from 'src/module/marketing/config/config.service';
import { PlayStrategyFactory } from 'src/module/marketing/play/play.factory';
import { IMarketingStrategy } from 'src/module/marketing/play/strategy.interface';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { Decimal } from '@prisma/client/runtime/library';
import { PublishStatus, DelFlag, StorePlayConfig, ProductType } from '@prisma/client';
import { OrderItemDto } from '../dto/order.dto';
import { OrderItemVo, CheckoutPreviewVo } from '../vo/order.vo';
import { AddressRepository } from '../../address/address.repository';
import { AdmissionService } from 'src/module/lbs/admission/admission.service';

@Injectable()
export class OrderCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storePlayConfigService: StorePlayConfigService,
    private readonly playStrategyFactory: PlayStrategyFactory,
    // [Dependency] AddressRepository for default address check
    private readonly addressRepo: AddressRepository,
    // [Dependency] AdmissionService for unified location check
    private readonly admissionService: AdmissionService,
  ) {}

  /**
   * 校验配送范围（使用统一准入服务）
   */
  async checkLocation(tenantId: string, lat: number, lng: number) {
    await this.admissionService.checkLocationAdmission(tenantId, lat, lng);
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
    let marketingConfig: StorePlayConfig | null = null;
    let marketingStrategy: IMarketingStrategy | null = null;
    if (marketingConfigId) {
      const configRes = await this.storePlayConfigService.findOne(marketingConfigId);
      if (configRes && configRes.data) {
        marketingConfig = configRes.data as StorePlayConfig;
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

    // 验证 LBS 距离（使用统一准入服务）
    let outOfRange = false;
    let defaultAddress = null;

    if (memberId) {
      // Use Repository
      defaultAddress = await this.addressRepo.findDefault(memberId);
    }

    if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude) {
      outOfRange = !(await this.admissionService.isLocationInRange(
        tenantId,
        defaultAddress.latitude,
        defaultAddress.longitude,
      ));
    }

    // 5. 判断是否包含服务商品
    const hasService = skus.some((s) => s.tenantProd.product.type === ProductType.SERVICE);

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
