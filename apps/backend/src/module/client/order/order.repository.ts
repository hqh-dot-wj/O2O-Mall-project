import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SoftDeleteRepository } from 'src/common/repository/soft-delete.repository';
import { OmsOrder, Prisma, OrderStatus } from '@prisma/client';

import { ClsService } from 'nestjs-cls';

@Injectable()
export class OrderRepository extends SoftDeleteRepository<OmsOrder, Prisma.OmsOrderCreateInput> {
    constructor(
        prisma: PrismaService,
        private readonly clsService: ClsService,
    ) {
        super(prisma, clsService, 'omsOrder', 'id', 'deleteTime');
    }

    /**
     * 根据订单号查询
     */
    async findBySn(orderSn: string) {
        return this.prisma.omsOrder.findUnique({
            where: { orderSn },
        });
    }

    /**
     * 更新订单状态
     */
    async updateStatus(orderId: string, status: OrderStatus, remark?: string) {
        return this.prisma.omsOrder.update({
            where: { id: orderId },
            data: {
                status,
                remark: remark ? remark : undefined,
            },
        });
    }
}
