import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { PrepayDto } from './dto/payment.dto';
import * as crypto from 'crypto';
import { OrderStatus } from '@prisma/client';
import { CommissionService } from '../../finance/commission/commission.service';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly commissionService: CommissionService,
    ) { }

    /**
     * 预下单，获取微信支付参数 (Mock版)
     */
    async prepay(memberId: string, dto: PrepayDto) {
        // 1. 校验订单
        const order = await this.prisma.omsOrder.findFirst({
            where: { id: dto.orderId, memberId },
        });

        BusinessException.throwIfNull(order, '订单不存在');
        BusinessException.throwIf(order.status !== 'PENDING_PAY', '订单状态不正确');

        // 2. 如果是生产环境，这里应该调用微信 API
        // const wxParams = await this.wechatPay.transactions.jsapi(...)

        // 3. Mock 返回
        return {
            timeStamp: Math.floor(Date.now() / 1000).toString(),
            nonceStr: this.randomString(32),
            package: `prepay_id=wx${this.randomString(20)}`,
            signType: 'RSA',
            paySign: 'mock_signature',
            // 透传一些用于调试的参数
            _debug_orderId: order.id,
        };
    }

    /**
     * 模拟支付成功 (Dev Only)
     */
    async mockSuccess(memberId: string, orderId: string) {
        const order = await this.prisma.omsOrder.findFirst({
            where: { id: orderId, memberId },
        });

        BusinessException.throwIfNull(order, '订单不存在');

        if (order.status !== 'PENDING_PAY') {
            return { status: order.status };
        }

        // 更新状态
        const nextStatus = OrderStatus.PAID;

        await this.prisma.omsOrder.update({
            where: { id: orderId },
            data: {
                status: nextStatus,
                payStatus: 'PAID',
                payTime: new Date(),
            },
        });

        // 触发佣金计算
        try {
            await this.commissionService.triggerCalculation(orderId, order.tenantId);
        } catch (error) {
            this.logger.error(`Trigger commission calculation failed for order ${orderId}`, error);
        }

        return { status: nextStatus };
    }

    // ============ Helper ============

    private randomString(len: number) {
        return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
    }
}
