import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { CommissionService } from 'src/module/finance/commission/commission.service';
import { RiskService } from 'src/module/risk/risk.service';
import { MessageService } from 'src/module/admin/system/message/message.service';
import { ClientInfoDto } from 'src/common/decorators/common.decorator';
import { CreateOrderDto, ListOrderDto, CancelOrderDto } from './dto/order.dto';
import { OrderDetailVo, OrderListItemVo } from './vo/order.vo';
import { nanoid } from 'nanoid';
import { OrderRepository } from './order.repository';
import { CartRepository } from '../cart/cart.repository';
import { OrderCheckoutService } from './services/order-checkout.service';
import { AttributionService } from './services/attribution.service';
import { CartService } from '../cart/cart.service';
import { OrderIntegrationService } from 'src/module/marketing/integration/integration.service';
import { getErrorMessage } from 'src/common/utils/error';

/**
 * C端订单服务
 * 提供订单的创建、查询、取消等功能
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
    private readonly riskService: RiskService,
    private readonly messageService: MessageService,
    @InjectQueue('ORDER_NOTIFICATION') private readonly notificationQueue: Queue,
    @InjectQueue('ORDER_DELAY') private readonly orderDelayQueue: Queue,
    // [NEW] Repositories & Services
    private readonly orderRepo: OrderRepository,
    private readonly cartRepo: CartRepository,
    private readonly checkoutService: OrderCheckoutService,
    private readonly attributionService: AttributionService,
    private readonly cartService: CartService,
    private readonly orderIntegrationService: OrderIntegrationService,
  ) {}

  /**
   * 结算预览 - 从购物车或直接购买获取结算信息
   */
  async getCheckoutPreview(memberId: string, tenantId: string, items: any[], marketingConfigId?: string) {
    return this.checkoutService.getCheckoutPreview(memberId, tenantId, items, marketingConfigId);
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

    // 1. 获取结算预览 (校验商品、库存、价格、LBS距离)
    const preview = await this.checkoutService.getCheckoutPreview(
      memberId,
      dto.tenantId,
      dto.items,
      dto.marketingConfigId,
    );

    // 1.1 LBS 二次校验 (创建时强制校验，使用前端传入的最新坐标)
    if (dto.receiverLat && dto.receiverLng) {
      await this.checkoutService.checkLocation(dto.tenantId, Number(dto.receiverLat), Number(dto.receiverLng));
    } else if (preview.outOfRange) {
      // 如果前端没传坐标，且预览结果显示超出范围 (基于默认地址)
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '超出服务范围，无法配送/服务');
    }

    // 2. 确定订单类型
    const orderType = preview.hasService ? 'SERVICE' : 'PRODUCT';

    // 3. 获取用户归因信息
    // 获取商品分享人 (第一个有分享人的商品)
    const itemShareId = dto.items.find((i) => i.shareUserId)?.shareUserId || null;
    const shareUserId = await this.attributionService.getFinalShareUserId(memberId, itemShareId || dto.shareUserId);

    // 4. 获取 ParentId (永久绑定)
    const member = await this.prisma.umsMember.findUnique({ where: { memberId } });
    const referrerId = member?.parentId || null;

    // 5. 生成订单号
    const orderSn = this.generateOrderSn();

    // 5.1 计算优惠券和积分抵扣
    let couponDiscount = 0;
    let pointsDiscount = 0;
    let finalPayAmount = Number(preview.payAmount);

    if (dto.userCouponId || (dto.pointsUsed && dto.pointsUsed > 0)) {
      try {
        const discountResult = await this.orderIntegrationService.calculateOrderDiscount(memberId, {
          items: dto.items.map((item) => {
            const previewItem = preview.items.find((p) => p.skuId === item.skuId);
            return {
              productId: previewItem?.productId || '',
              productName: previewItem?.productName || '',
              price: Number(previewItem?.price || 0),
              quantity: item.quantity,
            };
          }),
          userCouponId: dto.userCouponId,
          pointsUsed: dto.pointsUsed,
        });

        if (discountResult.data) {
          couponDiscount = discountResult.data.couponDiscount;
          pointsDiscount = discountResult.data.pointsDiscount;
          finalPayAmount = discountResult.data.finalAmount;
        }
      } catch (error) {
        const msg = getErrorMessage(error);
        this.logger.error(`计算优惠失败: ${msg}`);
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, `优惠计算失败: ${msg}`);
      }
    }

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
        payAmount: finalPayAmount,
        // 优惠券相关
        userCouponId: dto.userCouponId,
        couponDiscount,
        // 积分相关
        pointsUsed: dto.pointsUsed || 0,
        pointsDiscount,
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
          create: await Promise.all(
            preview.items.map(async (item) => {
              // 查询SKU的积分比例
              const sku = await this.prisma.pmsTenantSku.findUnique({
                where: { id: item.skuId },
                select: { pointsRatio: true },
              });

              return {
                productId: item.productId,
                productName: item.productName,
                productImg: item.productImg,
                skuId: item.skuId,
                specData: item.specData || undefined,
                price: item.price,
                quantity: item.quantity,
                totalAmount: item.totalAmount,
                pointsRatio: sku?.pointsRatio || 100, // 保存积分比例快照
              };
            }),
          ),
        },
      },
      include: { items: true },
    });

    // 6.1 锁定优惠券和冻结积分
    if (dto.userCouponId || (dto.pointsUsed && dto.pointsUsed > 0)) {
      try {
        await this.orderIntegrationService.handleOrderCreated(
          order.id,
          memberId,
          dto.userCouponId,
          dto.pointsUsed,
        );
      } catch (error) {
        const msg = getErrorMessage(error);
        this.logger.error(`锁定优惠券/冻结积分失败: ${msg}`);
        // 如果锁定失败，需要回滚订单创建
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, `优惠券或积分处理失败: ${msg}`);
      }
    }

    // 7. 扣减库存
    for (const item of dto.items) {
      const result = await this.prisma.pmsTenantSku.updateMany({
        where: {
          id: item.skuId,
          stock: { gte: item.quantity }, // 确保库存 >= 购买数量
          isActive: true, // 确保 SKU 启用
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (result.count === 0) {
        const skuName = preview.items.find((i) => i.skuId === item.skuId)?.productName || item.skuId;
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, `商品 ${skuName} 库存不足`);
      }
    }

    // 8. 清除购物车中已下单的商品 (Hard Delete)
    await this.cartRepo.deleteByMemberAndTenant(
      memberId,
      dto.tenantId,
      dto.items.map((i) => i.skuId),
    );

    // 9. 同步购物车到 Redis
    await this.cartService.syncCartToRedis(memberId, dto.tenantId);

    // 10. 发送新订单通知 (延迟队列)
    try {
      await this.notificationQueue.add(
        { orderId: order.id },
        { delay: 1000 * 60 * 2 }, // 延迟 2 分钟 (避开秒退)
      );
    } catch (error) {
      this.logger.error('Add notification job failed for ' + orderSn, error);
    }

    // 11. 添加超时自动关闭任务 (30分钟)
    try {
      await this.orderDelayQueue.add(
        'cancel_unpaid',
        { orderId: order.id },
        { delay: 30 * 60 * 1000 }, // 30 分钟
      );
    } catch (error) {
      this.logger.error('Add auto - cancel job failed for ' + orderSn, error);
    }

    this.logger.log(`订单创建成功: ${orderSn}, 会员: ${memberId} `);

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
      this.orderRepo.count(where),
      this.orderRepo.findMany({
        where,
        include: { items: { take: 1 } },
        orderBy: { createTime: 'desc' },
        skip: (dto.pageNum - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
    ]);

    const list: OrderListItemVo[] = orders.map((order: any) => ({
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
    const order = (await this.orderRepo.findOne(
      { id: orderId, memberId, deleteTime: null },
      { include: { items: true } },
    )) as any;

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
      items: order.items.map((item: any) => ({
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
    const order = (await this.orderRepo.findOne(
      { id: dto.orderId, memberId, deleteTime: null },
      { include: { items: true } },
    )) as any;

    BusinessException.throwIfNull(order, '订单不存在');
    BusinessException.throwIf(order.status !== 'PENDING_PAY', '只能取消待支付订单');

    // 1. 更新订单状态
    await this.orderRepo.update(dto.orderId, {
      status: 'CANCELLED',
      remark: dto.reason || order.remark,
    });

    // 2. 恢复库存
    for (const item of order.items) {
      await this.prisma.pmsTenantSku.updateMany({
        where: { id: item.skuId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // 3. 触发订单取消事件处理（优惠券和积分）
    try {
      await this.orderIntegrationService.handleOrderCancelled(dto.orderId, memberId);
    } catch (error) {
      this.logger.error(`Handle order cancelled event failed for order ${dto.orderId}`, error);
      // 不抛出异常，避免影响取消流程
    }

    this.logger.log(`订单取消: ${order.orderSn} `);

    return Result.ok(null, '订单已取消');
  }

  /**
   * 确认收货
   */
  async confirmReceipt(memberId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      id: orderId,
      memberId,
      deleteTime: null,
    });

    BusinessException.throwIfNull(order, '订单不存在');
    BusinessException.throwIf(order.status !== 'SHIPPED', '订单状态不正确');

    // 更新状态
    await this.orderRepo.updateStatus(orderId, 'COMPLETED', '用户确认收货');

    // 触发佣金结算时间更新
    try {
      await this.commissionService.updatePlanSettleTime(orderId, 'CONFIRM');
    } catch (error) {
      this.logger.error(`Update commission settle time failed for order ${orderId}`, error);
    }

    return Result.ok(null, '确认收货成功');
  }

  /**
   * 系统自动关闭订单
   */
  async cancelOrderBySystem(orderId: string, reason: string) {
    const order = (await this.orderRepo.findById(orderId, { include: { items: true } })) as any;

    if (!order) {
      this.logger.warn(`Auto - cancel failed: Order ${orderId} not found`);
      return;
    }

    // 必须是待支付状态
    if (order.status !== 'PENDING_PAY') {
      this.logger.log(`Auto - cancel skipped: Order ${orderId} status is ${order.status} `);
      return;
    }

    // 1. 更新订单状态
    await this.orderRepo.updateStatus(orderId, 'CANCELLED', order.remark ? `${order.remark} (${reason})` : reason);

    // 2. 恢复库存
    for (const item of order.items) {
      await this.prisma.pmsTenantSku.updateMany({
        where: { id: item.skuId },
        data: { stock: { increment: item.quantity } },
      });
    }

    // 3. 触发订单取消事件处理（优惠券和积分）
    try {
      await this.orderIntegrationService.handleOrderCancelled(orderId, order.memberId);
    } catch (error) {
      this.logger.error(`Handle order cancelled event failed for order ${orderId}`, error);
      // 不抛出异常，避免影响取消流程
    }

    this.logger.log(`Order ${orderId} auto - cancelled: ${reason} `);
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
}
