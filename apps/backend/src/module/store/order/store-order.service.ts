import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { FormatDateFields } from 'src/common/utils';
import { Prisma, OrderStatus, OrderType } from '@prisma/client';
import { ListStoreOrderDto, ReassignWorkerDto, VerifyServiceDto } from './dto/store-order.dto';
import { CommissionService } from 'src/module/finance/commission/commission.service';
import { TenantContext } from 'src/common/tenant/tenant.context';

/**
 * Store端订单服务
 * 提供租户后台的订单管理功能
 */
@Injectable()
export class StoreOrderService {
    private readonly logger = new Logger(StoreOrderService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly commissionService: CommissionService,
    ) { }

    /**
     * 查询订单列表
     * @param tenantId 租户ID
     * @param query 查询参数
     */
    async findAll(query: ListStoreOrderDto) {
        const tenantId = TenantContext.getTenantId();
        const where: Prisma.OmsOrderWhereInput = {
            tenantId,
            deleteTime: null,
        };

        // 构建查询条件
        if (query.orderSn) {
            where.orderSn = { contains: query.orderSn };
        }

        if (query.receiverPhone) {
            where.receiverPhone = { contains: query.receiverPhone };
        }

        if (query.status) {
            where.status = query.status;
        }

        if (query.orderType) {
            where.orderType = query.orderType;
        }

        // 使用 PageQueryDto 的便捷方法处理时间范围
        const dateRange = query.getDateRange('createTime');
        if (dateRange) {
            Object.assign(where, dateRange);
        }

        const [list, total] = await this.prisma.$transaction([
            this.prisma.omsOrder.findMany({
                where,
                include: {
                    items: true,
                },
                skip: query.skip,
                take: query.take,
                orderBy: query.getOrderBy('createTime') || { createTime: 'desc' },
            }),
            this.prisma.omsOrder.count({ where }),
        ]);

        return Result.page(FormatDateFields(list), total);
    }

    /**
     * 查询订单详情（含佣金分配）
     * @param orderId 订单ID
     * @param canViewCommission 是否有权查看佣金明细
     */
    async findOne(orderId: string, canViewCommission: boolean = false) {
        const tenantId = TenantContext.getTenantId();
        const order = await this.prisma.omsOrder.findFirst({
            where: {
                id: orderId,
                tenantId,
                deleteTime: null,
            },
            include: {
                items: true,
            },
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
                referrerId: true,
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
        if (member?.referrerId) {
            referrer = await this.prisma.umsMember.findUnique({
                where: { memberId: member.referrerId },
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
            const totalCommission = commissions.reduce((sum, item) => sum.add(new Prisma.Decimal(item.amount)), new Prisma.Decimal(0));
            remainingAmount = remainingAmount.sub(totalCommission);
        }

        return Result.ok(FormatDateFields({
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
        }));
    }

    /**
     * 获取待派单列表
     * @param query 分页参数
     */
    async getDispatchList(query: ListStoreOrderDto) {
        const tenantId = TenantContext.getTenantId();
        const where: Prisma.OmsOrderWhereInput = {
            tenantId,
            orderType: 'SERVICE',
            status: 'PAID',
            workerId: null,
            deleteTime: null,
        };

        const [list, total] = await this.prisma.$transaction([
            this.prisma.omsOrder.findMany({
                where,
                include: {
                    items: true,
                },
                skip: query.skip,
                take: query.take,
                orderBy: { bookingTime: 'asc' },
            }),
            this.prisma.omsOrder.count({ where }),
        ]);

        return Result.page(FormatDateFields(list), total);
    }

    /**
     * 改派技师
     * @param dto 改派参数
     * @param operatorId 操作人ID
     */
    async reassignWorker(dto: ReassignWorkerDto, operatorId: string) {
        const tenantId = TenantContext.getTenantId();
        // 查询订单
        const order = await this.prisma.omsOrder.findFirst({
            where: {
                id: dto.orderId,
                tenantId,
                orderType: 'SERVICE',
                deleteTime: null,
            },
        });

        BusinessException.throwIfNull(order, '订单不存在');
        BusinessException.throwIf(
            order!.status !== 'PAID' && order!.status !== 'SHIPPED',
            '订单状态不允许改派',
        );

        // 验证技师存在
        const worker = await this.prisma.srvWorker.findFirst({
            where: {
                workerId: dto.newWorkerId,
                tenantId,
            },
        });

        BusinessException.throwIfNull(worker, '技师不存在');

        // 更新订单
        await this.prisma.omsOrder.update({
            where: { id: dto.orderId },
            data: { workerId: dto.newWorkerId },
        });

        this.logger.log(`订单 ${dto.orderId} 改派给技师 ${dto.newWorkerId}, 操作人: ${operatorId}`);
        return Result.ok(null, '改派成功');
    }

    /**
     * 强制核销订单
     * @param dto 核销参数
     * @param operatorId 操作人ID
     */
    async verifyService(dto: VerifyServiceDto, operatorId: string) {
        const tenantId = TenantContext.getTenantId();
        // 查询订单
        const order = await this.prisma.omsOrder.findFirst({
            where: {
                id: dto.orderId,
                tenantId,
                orderType: 'SERVICE',
                deleteTime: null,
            },
        });

        BusinessException.throwIfNull(order, '订单不存在');
        BusinessException.throwIf(
            order!.status !== 'SHIPPED',
            '订单状态不允许核销',
        );

        // 更新订单状态为已完成
        await this.prisma.omsOrder.update({
            where: { id: dto.orderId },
            data: {
                status: 'COMPLETED',
                remark: dto.remark ? `强制核销: ${dto.remark}` : '强制核销',
            },
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
    async refundOrder(orderId: string, remark: string, operatorId: string) {
        const tenantId = TenantContext.getTenantId();
        const order = await this.prisma.omsOrder.findFirst({
            where: { id: orderId, tenantId },
        });

        BusinessException.throwIfNull(order, '订单不存在');

        // 简单校验：只有已支付、已发货、已完成的订单可以退款 (且没退款过)
        if (order.status === 'PENDING_PAY' || order.status === 'CANCELLED' || order.status === 'REFUNDED') {
            throw new BusinessException(ResponseCode.BUSINESS_ERROR, '当前订单状态不可退款');
        }

        // 更新订单状态
        await this.prisma.omsOrder.update({
            where: { id: orderId },
            data: {
                status: 'REFUNDED',
                remark: remark ? `退款: ${remark}` : '订单退款',
            },
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
