import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderService } from '../src/module/client/order/order.service';
import { CommissionService } from '../src/module/finance/commission/commission.service';
import { Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 模拟完整的下单 -> 分佣流程 (15个场景)
 * Enhanced with data display
 */
async function bootstrap() {
    console.log('🚀 Starting Comprehensive Simulation (Full Flow)...');
    try {
        console.log('--- DEBUG: Reading order.service.ts ---');
        console.log(fs.readFileSync(path.resolve(__dirname, '../src/module/client/order/order.service.ts'), 'utf8').substring(10000, 15000));
        console.log('--- DEBUG END ---');
    } catch (e) { console.error('Debug read failed', e); }

    // Silence NestJS logs
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
    const prisma = app.get(PrismaService);
    const orderService = app.get(OrderService);
    const commissionService = app.get(CommissionService);

    const reportLines: string[] = [];
    const logCheck = (name: string, passed: boolean, msg?: string, data?: any) => {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        const line = `[${status}] ${name} ${msg ? '- ' + msg : ''}`;
        console.log(line);
        reportLines.push(line);
        if (passed && data) {
            console.log('   📊 Data View:');
            console.dir(data, { depth: null, colors: true });
            reportLines.push(JSON.stringify(data, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
                , 2));
        }
    };

    reportLines.push(`Simulation Report - ${new Date().toISOString()}`);
    reportLines.push('------------------------------------------------');

    // Helper to create tenant
    const createTenant = async (suffix: string) => {
        const tid = `sim_t_${Date.now().toString().slice(-8)}_${suffix}`;
        await prisma.sysTenant.create({
            data: {
                tenantId: tid,
                companyName: `Sim Company ${suffix}`,
                contactUserName: 'Sim Admin',
                contactPhone: '13800000000',
                status: 'NORMAL' as any,
                expireTime: new Date('2099-01-01'),
                geoConfig: { create: { latitude: 30.000000, longitude: 120.000000, serviceRadius: 5000 } }
            }
        });
        await prisma.sysDistConfig.create({
            data: { tenantId: tid, level1Rate: new Decimal(0.6), level2Rate: new Decimal(0.4), enableLV0: true }
        });
        return tid;
    };

    // Helper to create member
    const createMember = async (suffix: string, tenantId: string, referrerId?: string) => {
        const mid = `sim_m_${Date.now().toString().slice(-6)}_${suffix}`;
        await prisma.umsMember.create({
            data: {
                memberId: mid,
                tenantId,
                nickname: suffix,
                mobile: `138${Date.now().toString().slice(-8)}`,
                referrerId,
                status: 'NORMAL' as any
            }
        });
        // Address
        await prisma.umsAddress.create({
            data: {
                memberId: mid, name: 'Addr', phone: '13800', province: 'P', city: 'C', district: 'D', detail: 'Loc',
                latitude: 30.010000, longitude: 120.000000, isDefault: true
            }
        });
        return mid;
    };

    // Helper to create Product & SKU
    const createProduct = async (tenantId: string, typeSuffix: string, price: number, distMode: 'RATIO' | 'FIXED' | 'NONE', distRate: number) => {
        // Global Prod
        const gp = await prisma.pmsProduct.create({
            data: {
                name: `Global ${typeSuffix}`,
                category: { create: { name: `Cat ${typeSuffix}`, level: 1 } },
                mainImages: ['img.png'],
                publishStatus: 'ON_SHELF' as any,
                type: 'REAL' as any,
                detailHtml: '<p>.</p>',
                specDef: []
            } as any
        });
        const gs = await prisma.pmsGlobalSku.create({
            data: {
                productId: gp.productId,
                guidePrice: new Decimal(price),
                specValues: {},
                distMode: distMode as any,
                guideRate: new Decimal(distRate)
            }
        });
        // Tenant Prod
        const tp = await prisma.pmsTenantProduct.create({
            data: { tenantId, productId: gp.productId, status: 'ON_SHELF' as any }
        });
        // Tenant SKU
        const skuId = `sku_${Date.now().toString().slice(-8)}_${typeSuffix}`;
        await prisma.pmsTenantSku.create({
            data: {
                id: skuId,
                tenantId,
                tenantProductId: tp.id,
                globalSkuId: gs.skuId,
                price: new Decimal(price),
                stock: 100,
                isActive: true,
                distMode: distMode as any,
                distRate: new Decimal(distRate)
            } as any
        });
        return { skuId, productId: gp.productId };
    };

    try {
        // --- DATA SEEDING ---
        console.log('🌱 Seeding Environment...');
        const tenantA = await createTenant('A');
        const tenantB = await createTenant('B');

        // Members in Tenant A
        const m_L2 = await createMember('L2', tenantA);
        const m_L1 = await createMember('L1', tenantA, m_L2);
        const m_Buyer = await createMember('Buyer', tenantA, m_L1); // Full Chain
        const m_NoRef = await createMember('NoRef', tenantA);
        const m_Self = await createMember('Self', tenantA); // Will try to ref himself

        console.log('User Chain Created:', { m_L2, m_L1, m_Buyer });

        // Products in Tenant A
        const prod_Ratio = await createProduct(tenantA, 'Ratio', 100, 'RATIO', 0.1); // Base 10
        const prod_Fixed = await createProduct(tenantA, 'Fixed', 100, 'FIXED', 5);   // Base 5
        const prod_None = await createProduct(tenantA, 'None', 100, 'NONE', 0);

        // Product in Tenant B (for Cross Tenant)
        const prod_TenB = await createProduct(tenantB, 'TenB', 200, 'RATIO', 0.1); // Base 20

        // --- SCENARIO EXECUTION ---

        // 1. Stock - Insufficient
        try {
            await orderService.createOrder(m_Buyer, { tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 101 }] } as any);
            logCheck('1. Stock Insufficient', false, 'Should fail');
        } catch (e: any) {
            logCheck('1. Stock Insufficient', getErrorMsg(e).includes('库存不足'), getErrorMsg(e));
        }

        // 2. LBS - Out of Range
        try {
            await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }],
                receiverLat: 31.0, receiverLng: 120.0
            } as any);
            logCheck('2. LBS Out of Range', false, 'Should fail');
        } catch (e: any) {
            logCheck('2. LBS Out of Range', getErrorMsg(e).includes('超出服务范围'), getErrorMsg(e));
        }

        // 3. LBS - No Coordinates
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }],
                receiverLat: undefined, receiverLng: undefined
            } as any);
            logCheck('3. LBS No Coords', !!res.data.orderId, 'Order created without LBS');
        } catch (e: any) {
            logCheck('3. LBS No Coords', false, getErrorMsg(e));
        }

        // 4. Cross-Tenant Purchase (Buyer A buys from Tenant B)
        let orderId_Cross = '';
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantB, items: [{ skuId: prod_TenB.skuId, quantity: 1 }],
                receiverLat: 30.0, receiverLng: 120.0
            } as any);
            orderId_Cross = res.data.orderId;
            const commissionData = await verifyCommission(orderId_Cross, tenantB, commissionService, prisma, [
                { beneficiaryId: m_L1, amount: 12.00 }
            ]);
            logCheck('4. Cross-Tenant Order', true, `Order: ${orderId_Cross}`, {
                orderId: orderId_Cross,
                buyer: m_Buyer,
                tenant: tenantB,
                commissions: commissionData
            });
        } catch (e: any) {
            logCheck('4. Cross-Tenant Order', false, getErrorMsg(e));
        }

        // 5. Self-Purchase (Share Link)
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }],
                shareUserId: m_Buyer // Buying via own link
            } as any);
            await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [], true); // Expect NO commission
            logCheck('5. Self-Purchase (Link)', true, 'Order created (No Commission)', { orderId: res.data.orderId });
        } catch (e: any) {
            logCheck('5. Self-Purchase (Link)', false, getErrorMsg(e));
        }

        // 6. Self-Purchase (Referrer is Self)
        await prisma.umsMember.update({ where: { memberId: m_Self }, data: { referrerId: m_Self } });
        try {
            const res = await orderService.createOrder(m_Self, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }]
            } as any);
            await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [], true);
            logCheck('6. Self-Purchase (Referrer)', true, 'Ref=Self Order created (No Commission)', { orderId: res.data.orderId });
        } catch (e: any) {
            logCheck('6. Self-Purchase (Referrer)', false, getErrorMsg(e));
        }

        // 7. No Referrer
        try {
            const res = await orderService.createOrder(m_NoRef, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }]
            } as any);
            await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [], true);
            logCheck('7. No Referrer', true, 'Order created (No Commission)', { orderId: res.data.orderId });
        } catch (e: any) {
            logCheck('7. No Referrer', false, getErrorMsg(e));
        }

        // 8. Only L1 Referrer
        const m_L1Only = await createMember('L1Only', tenantA, m_L2);
        try {
            const res = await orderService.createOrder(m_L1Only, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }]
            } as any);
            const comms = await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [
                { beneficiaryId: m_L2, amount: 6.00 }
            ]);
            logCheck('8. Only L1 Referrer', true, 'Order created', {
                orderId: res.data.orderId,
                user: m_L1Only,
                referrer: m_L2,
                commissions: comms
            });
        } catch (e: any) {
            logCheck('8. Only L1 Referrer', false, getErrorMsg(e));
        }

        // 9. Full Chain (L1 + L2)
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }]
            } as any);
            const comms = await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [
                { beneficiaryId: m_L1, amount: 6.00 },
                { beneficiaryId: m_L2, amount: 4.00 }
            ]);
            logCheck('9. Full Chain', true, 'Order created with Multi-Level Commission', {
                orderId: res.data.orderId,
                commissions: comms
            });
        } catch (e: any) {
            logCheck('9. Full Chain', false, getErrorMsg(e));
        }

        // 10. Commission Mode - FIXED
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Fixed.skuId, quantity: 2 }] // Qty 2
            } as any);
            const comms = await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [
                { beneficiaryId: m_L1, amount: 6.00 },
                { beneficiaryId: m_L2, amount: 4.00 }
            ]);
            logCheck('10. FIXED Mode', true, 'Order created', { commissions: comms });
        } catch (e: any) {
            logCheck('10. FIXED Mode', false, getErrorMsg(e));
        }

        // 11. Commission Mode - NONE
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_None.skuId, quantity: 1 }]
            } as any);
            await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [], true);
            logCheck('11. NONE Mode', true, 'Order created (No Commission)');
        } catch (e: any) {
            logCheck('11. NONE Mode', false, getErrorMsg(e));
        }

        // 12. Commission Threshold (< 0.01)
        const prod_Low = await createProduct(tenantA, 'Low', 0.01, 'RATIO', 0.01); // Base 0.0001
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Low.skuId, quantity: 1 }]
            } as any);
            await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [], true);
            logCheck('12. Threshold', true, 'Ignored due to threshold');
        } catch (e: any) {
            logCheck('12. Threshold', false, getErrorMsg(e));
        }

        // 13. Refund - Frozen
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }]
            } as any);
            const oid = res.data.orderId;
            await mockPayAndCalc(oid, tenantA, prisma, commissionService);
            await commissionService.cancelCommissions(oid);
            const comms = await prisma.finCommission.findMany({ where: { orderId: oid } });
            logCheck('13. Refund Frozen', comms.every(c => c.status === 'CANCELLED') && comms.length > 0, 'All Cancelled', { commissions: comms });
        } catch (e: any) {
            logCheck('13. Refund Frozen', false, getErrorMsg(e));
        }

        // 14. Refund - Settled
        try {
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }]
            } as any);
            const oid = res.data.orderId;
            await mockPayAndCalc(oid, tenantA, prisma, commissionService);
            await prisma.finCommission.updateMany({ where: { orderId: oid }, data: { status: 'SETTLED' } });
            await prisma.finWallet.upsert({ where: { memberId: m_L1 }, create: { memberId: m_L1, tenantId: tenantA, balance: 100 }, update: { balance: 100 } });
            await prisma.finWallet.upsert({ where: { memberId: m_L2 }, create: { memberId: m_L2, tenantId: tenantA, balance: 100 }, update: { balance: 100 } });
            await commissionService.cancelCommissions(oid);
            const comms = await prisma.finCommission.findMany({ where: { orderId: oid } });
            const wL1 = await prisma.finWallet.findUnique({ where: { memberId: m_L1 } });
            logCheck('14. Refund Settled', comms.every(c => c.status === 'CANCELLED') && wL1?.balance.toNumber() === 94, 'Commission Cancelled & Wallet Deducted', {
                walletL1: wL1?.balance?.toNumber(),
                commissions: comms
            });
        } catch (e: any) {
            logCheck('14. Refund Settled', false, getErrorMsg(e));
        }

        // 15. Referrer Status Abnormal
        try {
            await prisma.umsMember.update({ where: { memberId: m_L1 }, data: { status: 'DISABLED' as any } });
            const res = await orderService.createOrder(m_Buyer, {
                tenantId: tenantA, items: [{ skuId: prod_Ratio.skuId, quantity: 1 }]
            } as any);
            const comms = await verifyCommission(res.data.orderId, tenantA, commissionService, prisma, [
                { beneficiaryId: m_L1, amount: 6.00 }
            ]);
            logCheck('15. Abnormal Referrer', true, 'Order created (Commission Generated despite Disabled status)', { commissions: comms });
        } catch (e: any) {
            logCheck('15. Abnormal Referrer', false, getErrorMsg(e));
        }

    } catch (e) {
        console.error(e);
        reportLines.push(`CRITICAL ERROR: ${getErrorMsg(e)}`);
    } finally {
        fs.writeFileSync(path.resolve(__dirname, 'simulation_report.txt'), reportLines.join('\n'));
        console.log('Report saved.');
        await app.close();
    }
}

// --- HELPERS ---

function getErrorMsg(e: any): string {
    if (e.getResponse && typeof e.getResponse === 'function') {
        const res = e.getResponse();
        if (res && res.msg) return res.msg;
    }
    return e.message;
}

async function mockPayAndCalc(orderId: string, tenantId: string, prisma: PrismaService, commService: CommissionService) {
    await prisma.omsOrder.update({ where: { id: orderId }, data: { status: 'PAID', payTime: new Date() } });
    await commService.calculateCommission(orderId, tenantId);
}

async function verifyCommission(
    orderId: string,
    tenantId: string,
    commService: CommissionService,
    prisma: PrismaService,
    expected: { beneficiaryId: string, amount: number }[],
    expectEmpty = false
) {
    await mockPayAndCalc(orderId, tenantId, prisma, commService);
    const comms = await prisma.finCommission.findMany({ where: { orderId } });

    if (expectEmpty) {
        if (comms.length === 0) return [];
        throw new Error(`Expected 0 commissions, got ${comms.length}`);
    }

    if (comms.length !== expected.length) {
        throw new Error(`Expected ${expected.length} records, got ${comms.length}`);
    }

    for (const exp of expected) {
        const found = comms.find(c => c.beneficiaryId === exp.beneficiaryId);
        if (!found) throw new Error(`Beneficiary ${exp.beneficiaryId} missing`);
        if (Number(found.amount) !== exp.amount) throw new Error(`Beneficiary ${exp.beneficiaryId} expected ${exp.amount}, got ${found.amount}`);
    }
    return comms;
}

bootstrap();
