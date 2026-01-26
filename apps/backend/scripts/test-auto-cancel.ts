import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

import { OrderService } from '../src/module/client/order/order.service';
import { Logger } from '@nestjs/common';
import { CreateOrderDto } from '../src/module/client/order/dto/order.dto';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const orderService = app.get(OrderService);
    const prisma = app.get(PrismaService);
    const logger = new Logger('TestAutoCancel');

    logger.log('Starting Auto Cancel Test...');

    // 1. 获取一个用户 (假设 memberId=1)
    const member = await prisma.umsMember.findFirst();
    if (!member) {
        logger.error('No member found');
        return;
    }
    const tenant = await prisma.sysTenant.findFirst();
    if (!tenant) {
        logger.error('No tenant found');
        return;
    }

    // Find a valid SKU
    const sku = await prisma.pmsTenantSku.findFirst({
        where: { tenantId: tenant.tenantId, isActive: true, stock: { gt: 0 } },
        include: { tenantProd: { include: { product: true } }, globalSku: true }
    });

    if (!sku) {
        logger.error('No valid SKU found');
        return;
    }

    const memberId = member.memberId;
    const tenantId = tenant.tenantId;

    logger.log(`Using Member: ${memberId}, Tenant: ${tenantId}, SKU: ${sku.id}`);

    // 2. 创建订单
    const dto: CreateOrderDto = {
        tenantId: tenantId,
        items: [{
            skuId: sku.id,
            quantity: 1
        }],
        receiverName: 'Test Cancel',
        receiverPhone: '13800000000',
        receiverAddress: 'Test Address',
    };

    try {
        const result = await orderService.createOrder(memberId, dto);
        if (result.code === 200) {
            const orderId = result.data.orderId;
            logger.log(`Order created: ${orderId}`);

            // 3. 模拟触发自动关闭
            // 注意：真实延迟是30分钟，我们在测试脚本里手动调用 autoCancel 来验证逻辑
            // 验证 Queue 是否生效比较麻烦，需要长时间等待。
            // 这里我们验证 cancelOrderBySystem 逻辑本身是否正确。

            logger.log('Simulating System Auto Cancel...');
            await orderService.cancelOrderBySystem(orderId, 'Script Test Cancel');

            // 4. Check Order Status
            const order = await prisma.omsOrder.findUnique({ where: { id: orderId } });
            if (order?.status === 'CANCELLED') {
                logger.log('✅ Auto Cancel Success! Order status is CANCELLED.');
                // Check remark
                if (order.remark?.includes('Script Test Cancel')) {
                    logger.log('✅ Remark updated correctly.');
                } else {
                    logger.error(`❌ Remark not updated. Got: ${order.remark}`);
                }

                // Check Stock (Assuming stock was handling in create/cancel correctly)
                // You might want to fetch stock before and after to compare strictly.

            } else {
                logger.error(`❌ Auto Cancel Failed! Status is ${order?.status}`);
            }

        } else {
            logger.error(`Create Order Failed: ${result.msg}`);
        }
    } catch (e) {
        logger.error('Error during test', e);
    }

    await app.close();
}

bootstrap();
