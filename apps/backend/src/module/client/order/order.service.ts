import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { CommissionService } from 'src/module/finance/commission/commission.service';
import { RiskService } from 'src/module/risk/risk.service';
import { ClientInfoDto } from 'src/common/decorators/common.decorator';
import { CreateOrderDto, ListOrderDto, CancelOrderDto, OrderItemDto } from './dto/order.dto';
import { OrderDetailVo, OrderListItemVo, CheckoutPreviewVo, OrderItemVo } from './vo/order.vo';
import { Decimal } from '@prisma/client/runtime/library';
import { nanoid } from 'nanoid';

/**
 * C端订单服务
 * 提供订单的创建、查询、取消等功能
 */
@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly commissionService: CommissionService,
        private readonly riskService: RiskService,
    ) { }

    /**
     * 计算两点距离 (Haversine Formula) return meters
     */
    private calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371e3; // Earth radius in meters
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

        const a =
            Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * 获取最终归因人 (优先级: 参数 > Redis > 绑定)
     */
    private async getFinalShareUserId(memberId: string, inputShareId?: string): Promise<string | null> {
        // 0. 如果 memberId 为空，直接返回 inputShareId 或 null
        if (!memberId) return inputShareId || null;

        // 1. 优先使用本次参数
        if (inputShareId) return inputShareId;

        // 2. 其次查询 Redis (7天点击归因)
        const redisKey = `attr:member:${memberId}`;
        const cachedId = await this.redis.get(redisKey);
        if (cachedId) return cachedId;

        // 3. 最后使用永久绑定
        const member = await this.prisma.umsMember.findUnique({
            where: { memberId },
            select: { referrerId: true },
        });
        return member?.referrerId || null;
    }

    /**
     * 结算预览 - 从购物车或直接购买获取结算信息
     */
    async getCheckoutPreview(
        memberId: string,
        tenantId: string,
        items: OrderItemDto[],
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

        for (const item of items) {
            const sku = skuMap.get(item.skuId);
            BusinessException.throwIfNull(sku, `商品 ${item.skuId} 不存在或已下架`);
            BusinessException.throwIf(
                sku.tenantProd.tenantId !== tenantId,
                '商品不属于该门店',
            );

            // 校验库存
            if (sku.stock >= 0 && sku.stock < item.quantity) {
                BusinessException.throwIf(true, `${sku.tenantProd.product.name} 库存不足`);
            }

            const itemTotal = sku.price.mul(item.quantity);
            totalAmount = totalAmount.add(itemTotal);

            previewItems.push({
                productId: sku.tenantProd.productId,
                productName: sku.tenantProd.product.name,
                productImg: sku.tenantProd.product.mainImages?.[0] || '',
                skuId: sku.id,
                specData: sku.globalSku?.specValues as Record<string, string> || null,
                price: sku.price.toNumber(),
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

        // 4. 获取用户默认地址 (从会员表)
        // 4. 获取用户默认地址 (从会员表)
        // const member = await this.prisma.umsMember.findUnique({
        //     where: { memberId },
        // });

        let outOfRange = false;

        // 修正: 查询用户的默认收货地址
        let defaultAddress = null;
        if (memberId) {
            defaultAddress = await this.prisma.umsAddress.findFirst({
                where: { memberId, isDefault: true },
            });
        }

        if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude && tenant?.geoConfig?.latitude) {
            const dist = this.calcDistance(
                tenant.geoConfig.latitude, tenant.geoConfig.longitude,
                defaultAddress.latitude, defaultAddress.longitude
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
            outOfRange
        };
    }

    /**
     * 创建订单 (事务)
     */
    @Transactional()
    async createOrder(memberId: string, dto: CreateOrderDto, clientInfo?: ClientInfoDto) {
        // 0. 校验用户登录
        BusinessException.throwIf(!memberId, '请先登录');

        // 0.1 风控检测
        if (clientInfo) {
            await this.riskService.checkOrderRisk(memberId, dto.tenantId, clientInfo.ipaddr, clientInfo.deviceType);
        }

        // 1. 获取结算预览 (校验商品)
        const preview = await this.getCheckoutPreview(memberId, dto.tenantId, dto.items);

        // 2. 确定订单类型
        const hasService = await this.checkHasService(dto.items);
        const orderType = hasService ? 'SERVICE' : 'PRODUCT';

        // 2.1 LBS 校验 (创建时强制校验)
        if (dto.receiverLat && dto.receiverLng) {
            const tenant = await this.prisma.sysTenant.findUnique({
                where: { tenantId: dto.tenantId },
                include: { geoConfig: true }
            });

            if (tenant?.geoConfig?.latitude && tenant?.geoConfig?.longitude) {
                const dist = this.calcDistance(
                    Number(tenant.geoConfig.latitude), Number(tenant.geoConfig.longitude),
                    Number(dto.receiverLat), Number(dto.receiverLng)
                );
                // 允许 100米 误差? 还是严格? 严格.
                if (tenant.geoConfig.serviceRadius && dist > tenant.geoConfig.serviceRadius) {
                    throw new BusinessException(ResponseCode.BUSINESS_ERROR, '超出服务范围，无法配送/服务');
                }
            }
        }

        // 3. 获取用户归因信息 (优先级逻辑)
        // 获取商品分享人 (第一个有分享人的商品)
        const itemShareId = dto.items.find((i) => i.shareUserId)?.shareUserId || null;
        const shareUserId = await this.getFinalShareUserId(memberId, itemShareId || dto.shareUserId); // DTO should have generic shareUserId too? Or just item level? Usually order level.

        // DTO 定义里 createOrderDto 有 shareUserId 吗? 检查 DTO.
        // 如果 DTO 没有, 可以在 items 里找.
        // 假设 CreateOrderDto 应该有 shareUserId (Page Load captured).

        // 4. 获取 Referrer (永久绑定)
        const member = await this.prisma.umsMember.findUnique({ where: { memberId } });
        const referrerId = member?.referrerId || null;

        // 5. 生成订单号
        const orderSn = this.generateOrderSn();

        // 6. 创建订单
        const order = await this.prisma.omsOrder.create({
            data: {
                orderSn,
                memberId,
                tenantId: dto.tenantId,
                orderType: orderType as any,
                totalAmount: preview.totalAmount,
                freightAmount: preview.freightAmount,
                discountAmount: preview.discountAmount,
                payAmount: preview.payAmount,
                receiverName: dto.receiverName,
                receiverPhone: dto.receiverPhone,
                receiverAddress: dto.receiverAddress,
                receiverLat: dto.receiverLat,
                receiverLng: dto.receiverLng,
                bookingTime: dto.bookingTime,
                serviceRemark: dto.serviceRemark,
                shareUserId, // 最终归因
                referrerId,
                remark: dto.remark,

                items: {
                    create: preview.items.map((item) => ({
                        productId: item.productId,
                        productName: item.productName,
                        productImg: item.productImg,
                        skuId: item.skuId,
                        specData: item.specData || undefined,
                        price: item.price,
                        quantity: item.quantity,
                        totalAmount: item.totalAmount,
                    })),
                },
            },
            include: { items: true },
        });

        // 6. 扣减库存
        for (const item of dto.items) {
            const result = await this.prisma.pmsTenantSku.updateMany({
                where: {
                    id: item.skuId,
                    stock: { gte: item.quantity }, // 确保库存 >= 购买数量
                },
                data: { stock: { decrement: item.quantity } },
            });

            if (result.count === 0) {
                const skuName = preview.items.find((i) => i.skuId === item.skuId)?.productName || item.skuId;
                throw new BusinessException(ResponseCode.BUSINESS_ERROR, `商品 ${skuName} 库存不足`);
            }
        }

        // 7. 清除购物车中已下单的商品
        await this.prisma.omsCartItem.deleteMany({
            where: {
                memberId,
                tenantId: dto.tenantId,
                skuId: { in: dto.items.map((i) => i.skuId) },
            },
        });

        // 8. 同步购物车到 Redis
        await this.syncCartToRedis(memberId, dto.tenantId);

        this.logger.log(`订单创建成功: ${orderSn}, 会员: ${memberId}`);

        return Result.ok(
            {
                orderId: order.id,
                orderSn: order.orderSn,
                payAmount: order.payAmount,
            },
            '订单创建成功',
        );
    }

    /**
     * 获取订单列表
     */
    async getOrderList(memberId: string, dto: ListOrderDto) {
        const where: any = { memberId, deleteTime: null };
        if (dto.status) {
            where.status = dto.status;
        }

        const [total, orders] = await Promise.all([
            this.prisma.omsOrder.count({ where }),
            this.prisma.omsOrder.findMany({
                where,
                include: { items: { take: 1 } },
                orderBy: { createTime: 'desc' },
                skip: (dto.pageNum - 1) * dto.pageSize,
                take: dto.pageSize,
            }),
        ]);

        const list: OrderListItemVo[] = orders.map((order) => ({
            id: order.id,
            orderSn: order.orderSn,
            status: order.status,
            payAmount: order.payAmount.toNumber(),
            itemCount: order.items.length,
            coverImage: order.items[0]?.productImg || '',
            productName: order.items[0]?.productName || '',
            createTime: order.createTime,
        }));

        return Result.ok({ rows: list, total });
    }

    /**
     * 获取订单详情
     */
    async getOrderDetail(memberId: string, orderId: string): Promise<OrderDetailVo> {
        const order = await this.prisma.omsOrder.findFirst({
            where: { id: orderId, memberId, deleteTime: null },
            include: { items: true },
        });

        BusinessException.throwIfNull(order, '订单不存在');

        return {
            id: order.id,
            orderSn: order.orderSn,
            status: order.status,
            payStatus: order.payStatus,
            orderType: order.orderType,
            totalAmount: order.totalAmount.toNumber(),
            freightAmount: order.freightAmount.toNumber(),
            discountAmount: order.discountAmount.toNumber(),
            payAmount: order.payAmount.toNumber(),
            receiverName: order.receiverName || undefined,
            receiverPhone: order.receiverPhone || undefined,
            receiverAddress: order.receiverAddress || undefined,
            bookingTime: order.bookingTime || undefined,
            serviceRemark: order.serviceRemark || undefined,
            payTime: order.payTime || undefined,
            createTime: order.createTime,
            items: order.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                productImg: item.productImg,
                skuId: item.skuId,
                specData: item.specData as Record<string, string> | null,
                price: item.price.toNumber(),
                quantity: item.quantity,
                totalAmount: item.totalAmount.toNumber(),
            })),
        };
    }

    /**
     * 取消订单
     */
    async cancelOrder(memberId: string, dto: CancelOrderDto) {
        const order = await this.prisma.omsOrder.findFirst({
            where: { id: dto.orderId, memberId, deleteTime: null },
            include: { items: true },
        });

        BusinessException.throwIfNull(order, '订单不存在');
        BusinessException.throwIf(order.status !== 'PENDING_PAY', '只能取消待支付订单');

        // 1. 更新订单状态
        await this.prisma.omsOrder.update({
            where: { id: dto.orderId },
            data: { status: 'CANCELLED', remark: dto.reason || order.remark },
        });

        // 2. 恢复库存
        for (const item of order.items) {
            await this.prisma.pmsTenantSku.updateMany({
                where: { id: item.skuId },
                data: { stock: { increment: item.quantity } },
            });
        }

        this.logger.log(`订单取消: ${order.orderSn}`);

        return Result.ok(null, '订单已取消');
    }

    /**
     * 确认收货
     */
    async confirmReceipt(memberId: string, orderId: string) {
        const order = await this.prisma.omsOrder.findFirst({
            where: { id: orderId, memberId, deleteTime: null },
        });

        BusinessException.throwIfNull(order, '订单不存在');
        BusinessException.throwIf(order.status !== 'SHIPPED', '订单状态不正确');

        // 更新状态
        await this.prisma.omsOrder.update({
            where: { id: orderId },
            data: { status: 'COMPLETED', remark: '用户确认收货' },
        });

        // 触发佣金结算时间更新
        try {
            await this.commissionService.updatePlanSettleTime(orderId, 'CONFIRM');
        } catch (error) {
            this.logger.error(`Update commission settle time failed for order ${orderId}`, error);
        }

        return Result.ok(null, '确认收货成功');
    }

    // ============ 私有方法 ============

    /**
     * 生成订单号
     */
    private generateOrderSn(): string {
        const date = new Date();
        const prefix = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0'),
        ].join('');
        return `${prefix}${nanoid(8).toUpperCase()}`;
    }

    /**
     * 检查是否包含服务类商品
     */
    private async checkHasService(items: OrderItemDto[]): Promise<boolean> {
        const skuIds = items.map((i) => i.skuId);
        const serviceCount = await this.prisma.pmsTenantSku.count({
            where: {
                id: { in: skuIds },
                tenantProd: { product: { type: 'SERVICE' } },
            },
        });
        return serviceCount > 0;
    }

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
                await this.redis.hmset(key, data, 7 * 24 * 60 * 60);
            }
        } catch (error) {
            this.logger.warn('同步购物车到Redis失败', error);
        }
    }
}
