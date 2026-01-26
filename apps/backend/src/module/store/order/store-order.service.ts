import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { FormatDateFields } from 'src/common/utils';
import { Prisma, OrderStatus, OrderType } from '@prisma/client';
import { ListStoreOrderDto, ReassignWorkerDto, VerifyServiceDto } from './dto/store-order.dto';
import { CommissionService } from 'src/module/finance/commission/commission.service';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { StoreOrderRepository } from './store-order.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';

/**
 * Store端订单服务
 * 提供租户后台的订单管理功能
 */
@Injectable()
export class StoreOrderService {
  private readonly logger = new Logger(StoreOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepo: StoreOrderRepository,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * 查询订单列表
   */
  async findAll(query: ListStoreOrderDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.OmsOrderWhereInput = {
      deleteTime: null,
    };

    // 非超级管理员，严格过滤租户
    if (!isSuper) {
      where.tenantId = tenantId;
    }

    // 构建查询条件
    if (query.orderSn) where.orderSn = { contains: query.orderSn };
    if (query.receiverPhone) where.receiverPhone = { contains: query.receiverPhone };
    if (query.status) where.status = query.status;
    if (query.orderType) where.orderType = query.orderType;
    if (query.memberId) where.memberId = query.memberId;

    // 使用 PageQueryDto 的便捷方法处理时间范围
    const dateRange = query.getDateRange('createTime');
    if (dateRange) Object.assign(where, dateRange);

    // 使用 Repository 进行查询
    const result = await this.orderRepo.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      include: {
        items: true,
        commissions: true, // 关联查询佣金
      },
      orderBy: query.orderByColumn || 'createTime',
      order: query.isAsc || 'desc',
    });

    const list = result.rows;
    const total = result.total;

    // 获取租户名称映射
    const tenantMap = new Map<string, string>();
    if (isSuper && list.length > 0) {
      const tenantIds = [...new Set(list.map((item) => item.tenantId))];
      const tenants = await this.prisma.sysTenant.findMany({
        where: { tenantId: { in: tenantIds } },
        select: { tenantId: true, companyName: true },
      });
      tenants.forEach((t) => tenantMap.set(t.tenantId, t.companyName));
    } else if (!isSuper) {
      // 普通租户查单条
      const tenant = await this.prisma.sysTenant.findUnique({
        where: { tenantId },
        select: { companyName: true },
      });
      if (tenant) {
        tenantMap.set(tenantId!, tenant.companyName);
      }
    }

    // 转换数据格式
    const resultList = list.map((item: any) => {
      // 计算总佣金
      const commissionAmount =
        item.commissions?.reduce(
          (sum: Prisma.Decimal, c: any) => sum.add(new Prisma.Decimal(c.amount)),
          new Prisma.Decimal(0),
        ) || new Prisma.Decimal(0);

      return {
        ...item,
        // 取第一个商品的图片作为列表展示图
        productImg: item.items?.[0]?.productImg || '',
        // 佣金金额
        commissionAmount: commissionAmount.toFixed(2),
        // 所属租户
        tenantName: tenantMap.get(item.tenantId) || '',
      };
    });

    return Result.page(FormatDateFields(resultList), total);
  }

  /**
   * 查询订单详情（含佣金分配）
   */
  async findOne(orderId: string, canViewCommission: boolean = false) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.OmsOrderWhereInput = {
      id: orderId,
      deleteTime: null,
    };

    if (!isSuper) {
      where.tenantId = tenantId;
    }

    const order = await this.orderRepo.findOne(where, {
      include: { items: true },
    });

    BusinessException.throwIfNull(order, '订单不存在');

    // 查询客户信息
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId: order!.memberId },
      select: {
        memberId: true,
        nickname: true,
        avatar: true,
        mobile: true,
        parentId: true,
      },
    });

    // 查询技师信息（服务类订单）
    let worker = null;
    if (order!.workerId) {
      worker = await this.prisma.srvWorker.findUnique({
        where: { workerId: order!.workerId },
        select: {
          workerId: true,
          name: true,
          phone: true,
          avatar: true,
          rating: true,
        },
      });
    }

    // 查询佣金明细（需权限）
    let commissions = null;
    if (canViewCommission) {
      commissions = await this.commissionService.getCommissionsByOrder(orderId);
    }

    // 查询归因信息
    let shareUser = null;
    if (order!.shareUserId) {
      shareUser = await this.prisma.umsMember.findUnique({
        where: { memberId: order!.shareUserId },
        select: {
          memberId: true,
          nickname: true,
        },
      });
    }

    let referrer = null;
    if (member?.parentId) {
      referrer = await this.prisma.umsMember.findUnique({
        where: { memberId: member.parentId },
        select: {
          memberId: true,
          nickname: true,
        },
      });
    }

    // 查询所属商户
    const merchant = await this.prisma.sysTenant.findUnique({
      where: { tenantId: order!.tenantId },
      select: {
        tenantId: true,
        companyName: true,
      },
    });

    // 计算商户分润后剩余金额
    let remainingAmount = new Prisma.Decimal(order!.payAmount);
    if (commissions && commissions.length > 0) {
      const totalCommission = commissions.reduce(
        (sum, item) => sum.add(new Prisma.Decimal(item.amount)),
        new Prisma.Decimal(0),
      );
      remainingAmount = remainingAmount.sub(totalCommission);
    }

    return Result.ok(
      FormatDateFields({
        order,
        customer: member,
        worker,
        commissions,
        attribution: {
          shareUser,
          referrer,
        },
        business: {
          ...merchant,
          remainingAmount: remainingAmount.toFixed(2),
        },
      }),
    );
  }

  /**
   * 获取待派单列表
   */
  async getDispatchList(query: ListStoreOrderDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.OmsOrderWhereInput = {
      orderType: 'SERVICE',
      status: 'PAID',
      workerId: null,
      deleteTime: null,
    };

    if (!isSuper) {
      where.tenantId = tenantId;
    }

    const result = await this.orderRepo.findPage({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      where,
      include: { items: true },
      orderBy: 'bookingTime',
      order: 'asc',
    });

    return Result.page(FormatDateFields(result.rows), result.total);
  }

  /**
   * 改派技师
   */
  @Transactional()
  async reassignWorker(dto: ReassignWorkerDto, operatorId: string) {
    const tenantId = TenantContext.getTenantId();
    // 查询订单
    const order = await this.orderRepo.findOne({
      id: dto.orderId,
      tenantId,
      orderType: 'SERVICE',
      deleteTime: null,
    });

    BusinessException.throwIfNull(order, '订单不存在');
    BusinessException.throwIf(order!.status !== 'PAID' && order!.status !== 'SHIPPED', '订单状态不允许改派');

    // 验证技师存在
    const worker = await this.prisma.srvWorker.findFirst({
      where: {
        workerId: dto.newWorkerId,
        tenantId,
      },
    });

    BusinessException.throwIfNull(worker, '技师不存在');

    // 更新订单
    await this.orderRepo.update(dto.orderId, { workerId: dto.newWorkerId });

    this.logger.log(`订单 ${dto.orderId} 改派给技师 ${dto.newWorkerId}, 操作人: ${operatorId}`);
    return Result.ok(null, '改派成功');
  }

  /**
   * 强制核销订单
   */
  @Transactional()
  async verifyService(dto: VerifyServiceDto, operatorId: string) {
    const tenantId = TenantContext.getTenantId();
    // 查询订单
    const order = await this.orderRepo.findOne({
      id: dto.orderId,
      tenantId,
      orderType: 'SERVICE',
      deleteTime: null,
    });

    BusinessException.throwIfNull(order, '订单不存在');
    BusinessException.throwIf(order!.status !== 'SHIPPED', '订单状态不允许核销');

    // 更新订单状态为已完成
    await this.orderRepo.update(dto.orderId, {
      status: 'COMPLETED',
      remark: dto.remark ? `强制核销: ${dto.remark}` : '强制核销',
    });

    // 触发佣金结算时间更新
    try {
      await this.commissionService.updatePlanSettleTime(dto.orderId, 'VERIFY');
    } catch (error) {
      this.logger.error(`Update commission settle time failed for order ${dto.orderId}`, error);
    }

    this.logger.log(`订单 ${dto.orderId} 强制核销, 操作人: ${operatorId}`);
    return Result.ok(null, '核销成功');
  }

  /**
   * 订单退款
   */
  @Transactional()
  async refundOrder(orderId: string, remark: string, operatorId: string) {
    const tenantId = TenantContext.getTenantId();
    const order = await this.orderRepo.findOne({ id: orderId, tenantId });

    BusinessException.throwIfNull(order, '订单不存在');

    // 简单校验
    BusinessException.throwIf(
      order!.status === 'PENDING_PAY' || order!.status === 'CANCELLED' || order!.status === 'REFUNDED',
      '当前订单状态不可退款',
    );

    // 更新订单状态
    await this.orderRepo.update(orderId, {
      status: 'REFUNDED',
      remark: remark ? `退款: ${remark}` : '订单退款',
    });

    // 触发佣金取消/回滚
    try {
      await this.commissionService.cancelCommissions(orderId);
    } catch (error) {
      this.logger.error(`Cancel commission failed for order ${orderId}`, error);
    }

    this.logger.log(`订单 ${orderId} 退款, 操作人: ${operatorId}`);
    return Result.ok(null, '退款处理成功');
  }
}
