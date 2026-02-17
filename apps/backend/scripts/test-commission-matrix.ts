
import { PrismaClient, DelFlag, PublishStatus, ProductType, OrderType, CommissionStatus } from '@prisma/client';
import { performance } from 'perf_hooks';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

// Logger
function logPass(scenario: string, timeMs: number) {
    console.log(`${GREEN}[PASS] ${scenario}${RESET} ${GRAY}(${timeMs.toFixed(2)}ms)${RESET}`);
}
function logFail(scenario: string, reason: string, analysis: string) {
    console.log(`${RED}[FAIL] ${scenario}${RESET}`);
    console.log(`${YELLOW}原因:${RESET} ${reason}`);
    console.log(`${GRAY}--------------------------------------------------${RESET}`);
}

const stats = { pass: 0, fail: 0 };

async function runScenario(name: string, fn: () => Promise<void>) {
    const start = performance.now();
    try {
        await fn();
        stats.pass++;
        logPass(name, performance.now() - start);
    } catch (e: any) {
        stats.fail++;
        logFail(name, e.message || String(e), 'Logic/Assertion Error');
    }
}

/**
 * 模拟 CommissionService 的核心逻辑 (Enhanced for Phase 2)
 */
class TestCommissionLogic {
    async calculateCommission(orderId: string, tenantId: string) {
        // 1. Get Order
        const order = await prisma.omsOrder.findUnique({
            where: { id: orderId },
            include: { items: true }
        });
        if (!order) return;

        // 2. Self Purchase Check
        if (order.shareUserId && order.memberId === order.shareUserId) return 'SELF_PURCHASE';
        if (order.referrerId && order.memberId === order.referrerId) return 'SELF_PURCHASE';

        // 3. Base Calc (Updated for C06 SKU Priority)
        let totalBase = new Decimal(0);
        for (const item of order.items) {
            const sku = await prisma.pmsTenantSku.findUnique({ where: { id: item.skuId } });
            if (sku) {
                if (sku.distMode === 'RATIO') {
                    totalBase = totalBase.add(item.totalAmount.mul(sku.distRate));
                } else if (sku.distMode === 'FIXED') {
                    // Fixed amount per item
                    totalBase = totalBase.add(new Decimal(sku.distRate).mul(item.quantity));
                }
            }
        }
        if (totalBase.lte(0)) return 'NO_BASE';

        // 4. Get Member & Referrer
        const member = await prisma.umsMember.findUnique({
            where: { memberId: order.memberId },
            include: { referrer: { include: { referrer: true } } }
        });
        if (!member) return;

        // 5. Config
        const config = await prisma.sysDistConfig.findUnique({ where: { tenantId } }) || {
            level1Rate: new Decimal(0.6),
            level2Rate: new Decimal(0.4),
            enableCrossTenant: false,
            crossTenantRate: new Decimal(1.0),
            crossMaxDaily: new Decimal(500)
        };

        const results = [];

        // 6. L1 Calc
        const beneficiaryId = order.shareUserId || member.referrerId;
        if (beneficiaryId && beneficiaryId !== order.memberId) {
            // Blacklist check
            const blacklist = await prisma.sysDistBlacklist.findUnique({ where: { tenantId_userId: { tenantId, userId: beneficiaryId } } });
            if (!blacklist) {
                // Cross Tenant Check
                const benMember = await prisma.umsMember.findUnique({ where: { memberId: beneficiaryId } });
                const isCross = benMember?.tenantId !== tenantId;

                if (!isCross || config.enableCrossTenant) {
                    let rate = new Decimal(config.level1Rate);
                    if (isCross && config.crossTenantRate) rate = rate.mul(config.crossTenantRate);

                    const amount = totalBase.mul(rate);
                    const isLimitExceeded = await this.checkDailyLimit(tenantId, beneficiaryId, amount, config.crossMaxDaily);

                    if (!isLimitExceeded) {
                        results.push({ level: 1, beneficiaryId, amount });
                    } else {
                        results.push({ level: 1, status: 'LIMIT_EXCEEDED' });
                    }
                } else {
                    results.push({ level: 1, status: 'CROSS_DISABLED' });
                }
            } else {
                results.push({ level: 1, status: 'BLACKLISTED' });
            }
        }

        // 7. L2 Calc
        const l2Id = member.referrer?.referrerId;
        if (l2Id && l2Id !== order.memberId && l2Id !== beneficiaryId) {
            if (await this.checkCircular(l2Id, order.memberId)) {
                results.push({ level: 2, status: 'CIRCULAR_DETECTED' });
            } else {
                const rate = new Decimal(config.level2Rate);
                results.push({ level: 2, beneficiaryId: l2Id, amount: totalBase.mul(rate) });
            }
        }

        return results;
    }

    async checkDailyLimit(tenantId: string, userId: string, amount: Decimal, limit: any) {
        if (!limit) return false;
        // Mock Aggregation: Sum up existing commissions for today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const aggregate = await prisma.finCommission.aggregate({
            where: {
                tenantId,
                beneficiaryId: userId,
                createTime: { gte: startOfDay },
            },
            _sum: { amount: true }
        });

        const current = aggregate._sum.amount ? new Decimal(aggregate._sum.amount) : new Decimal(0);
        return current.add(amount).gt(limit);
    }

    async checkCircular(startId: string, targetId: string) {
        let curr = await prisma.umsMember.findUnique({ where: { memberId: startId } });
        let depth = 0;
        while (curr?.referrerId && depth < 5) {
            if (curr.referrerId === targetId) return true;
            curr = await prisma.umsMember.findUnique({ where: { memberId: curr.referrerId } });
            depth++;
        }
        return false;
    }

    // Logic for C07: Refund Rollback
    async simulateRefund(commissionId: any) {
        const comm = await prisma.finCommission.findUnique({ where: { id: commissionId } });
        if (!comm) return 'NOT_FOUND';

        if (comm.status === 'FROZEN') {
            await prisma.finCommission.update({ where: { id: commissionId }, data: { status: 'CANCELLED' } });
            return 'CANCELLED_DIRECTLY';
        } else if (comm.status === 'SETTLED') {
            // Deduct Logic
            await prisma.finCommission.update({ where: { id: commissionId }, data: { status: 'CANCELLED' } });
            return 'ROLLED_BACK';
        }
        return 'UNKNOWN_STATUS';
    }
}


async function main() {
    console.log(`\n🚀 开始执行分销风险验证矩阵 (Commission Risk Matrix)...\n`);

    // --- Data Setup ---
    const tenantA = `tA_${Date.now()}`;
    const tenantB = `tB_${Date.now()}`;

    await prisma.sysTenant.createMany({
        data: [
            { tenantId: tenantA, companyName: 'Store A', status: 'NORMAL', delFlag: 'NORMAL' },
            { tenantId: tenantB, companyName: 'Store B', status: 'NORMAL', delFlag: 'NORMAL' }
        ]
    });

    // Config A: Cross Limit 100
    await prisma.sysDistConfig.create({
        data: { tenantId: tenantA, enableCrossTenant: true, crossTenantRate: 0.8, crossMaxDaily: 100, level1Rate: 0.1, level2Rate: 0.05 }
    });
    // Config B
    await prisma.sysDistConfig.create({
        data: { tenantId: tenantB, enableCrossTenant: false, level1Rate: 0.1 }
    });

    const uSelf = `uSelf_${Date.now()}`;
    const u1 = `u1_${Date.now()}`;
    const u2 = `u2_${Date.now()}`; // L2 to u1
    const u3 = `u3_${Date.now()}`; // L3 (Buyer)
    const uBlack = `uBlack_${Date.now()}`;
    const uCrossLimit = `uCL_${Date.now()}`; // For Limit Test (Tenant B user)

    await prisma.umsMember.createMany({
        data: [
            { memberId: uSelf, nickname: 'SelfBuyer', tenantId: tenantA },
            { memberId: u1, nickname: 'User1', tenantId: tenantA },
            { memberId: u2, nickname: 'User2', tenantId: tenantA, referrerId: u1 },
            { memberId: u3, nickname: 'User3', tenantId: tenantA, referrerId: u2 },
            { memberId: uBlack, nickname: 'BlackUser', tenantId: tenantA },
            { memberId: uCrossLimit, nickname: 'LimitUser', tenantId: tenantB }
        ]
    });

    await prisma.sysDistBlacklist.create({
        data: { tenantId: tenantA, userId: uBlack, reason: 'Spy', createBy: 'admin' }
    });

    const prodId = `p_${Date.now()}`;
    const skuId = `s_${Date.now()}`;
    const skuFixedId = `sF_${Date.now()}`;

    const category = await prisma.pmsCategory.create({ data: { name: 'TestCat', level: 1 } });

    await prisma.pmsProduct.create({
        data: {
            productId: prodId, name: 'TestItem', categoryId: category.catId, type: 'REAL',
            publishStatus: 'ON_SHELF', delFlag: 'NORMAL', detailHtml: '', specDef: [], mainImages: []
        }
    });

    const gskuId = `gsku_${Date.now()}`;
    await prisma.pmsGlobalSku.create({
        data: { skuId: gskuId, productId: prodId, specValues: {}, guidePrice: 100, guideRate: 10, maxDistRate: 20, minDistRate: 5 }
    });

    const tpIdA = `tpA_${Date.now()}`;
    await prisma.pmsTenantProduct.create({
        data: { id: tpIdA, tenantId: tenantA, productId: prodId, status: 'ON_SHELF' }
    });

    // SKU A (Ratio)
    await prisma.pmsTenantSku.create({
        data: {
            id: skuId, tenantId: tenantA, tenantProd: { connect: { id: tpIdA } }, globalSku: { connect: { skuId: gskuId } },
            price: 100, stock: 100, isActive: true, distMode: 'RATIO', distRate: 0.5
        }
    });

    // SKU Fixed (Fixed)
    await prisma.pmsTenantSku.create({
        data: {
            id: skuFixedId, tenantId: tenantA, tenantProd: { connect: { id: tpIdA } }, globalSku: { connect: { skuId: gskuId } },
            price: 100, stock: 100, isActive: true, distMode: 'FIXED', distRate: 20
        }
    });

    // Create Tenant Product B & SKU B
    const tpIdB = `tpB_${Date.now()}`;
    await prisma.pmsTenantProduct.create({
        data: { id: tpIdB, tenantId: tenantB, productId: prodId, status: 'ON_SHELF' }
    });

    await prisma.pmsTenantSku.create({
        data: {
            id: skuId + '_B', tenantId: tenantB, tenantProd: { connect: { id: tpIdB } }, globalSku: { connect: { skuId: gskuId } },
            price: 100, stock: 100, isActive: true, distMode: 'RATIO', distRate: 0.5
        }
    });

    const logic = new TestCommissionLogic();

    // --- Scenarios ---

    await runScenario('C01: 自购不返佣 (Self-Purchase)', async () => {
        const orderId = `o1_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: orderId, orderSn: orderId, tenantId: tenantA, memberId: uSelf,
                orderType: 'PRODUCT', totalAmount: 100, payAmount: 100, status: 'PAID', shareUserId: uSelf,
                items: { create: { skuId, quantity: 1, price: 100, totalAmount: 100, productId: prodId, productName: 'T', productImg: '' } }
            }
        });
        const result = await logic.calculateCommission(orderId, tenantA);
        if (result !== 'SELF_PURCHASE') throw new Error(`Expected SELF_PURCHASE, got ${JSON.stringify(result)}`);
    });

    await runScenario('C02: 跨店分销开关 (Cross-Tenant Toggle)', async () => {
        const orderId = `o2_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: orderId, orderSn: orderId, tenantId: tenantA, memberId: u1,
                orderType: 'PRODUCT', totalAmount: 100, payAmount: 100, status: 'PAID',
                shareUserId: uCrossLimit, // Reference a Store B user
                items: { create: { skuId, quantity: 1, price: 100, totalAmount: 100, productId: prodId, productName: 'T', productImg: '' } }
            }
        });
        const resA = await logic.calculateCommission(orderId, tenantA) as any[];
        const l1 = resA.find(r => r.level === 1);
        // Base=50. L1=0.1. Cross=0.8. Total=4.
        if (!l1 || l1.amount.toNumber() !== 4) throw new Error(`Store A (Cross ON): Expected 4, got ${l1?.amount}`);
    });

    await runScenario('C02-B: 跨店分销关闭 (Cross-Tenant OFF)', async () => {
        const orderId = `o3_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: orderId, orderSn: orderId, tenantId: tenantB, memberId: uCrossLimit,
                orderType: 'PRODUCT', totalAmount: 100, payAmount: 100, status: 'PAID',
                shareUserId: u1, // u1 is Store A user (Cross)
                items: { create: { skuId: skuId + '_B', quantity: 1, price: 100, totalAmount: 100, productId: prodId, productName: 'T', productImg: '' } }
            }
        });
        const resB = await logic.calculateCommission(orderId, tenantB) as any[];
        const l1 = resB.find(r => r.level === 1);
        if (l1?.status !== 'CROSS_DISABLED') throw new Error(`Store B (Cross OFF): Expected CROSS_DISABLED, got ${JSON.stringify(l1)}`);
    });

    await runScenario('C03: 黑名单拦截 (Blacklist)', async () => {
        const orderId = `o4_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: orderId, orderSn: orderId, tenantId: tenantA, memberId: uSelf,
                orderType: 'PRODUCT', totalAmount: 100, payAmount: 100, status: 'PAID', shareUserId: uBlack,
                items: { create: { skuId, quantity: 1, price: 100, totalAmount: 100, productId: prodId, productName: 'T', productImg: '' } }
            }
        });
        const res = await logic.calculateCommission(orderId, tenantA) as any[];
        const l1 = res.find(r => r.level === 1);
        if (l1?.status !== 'BLACKLISTED') throw new Error(`Expected BLACKLISTED, got ${JSON.stringify(l1)}`);
    });

    await runScenario('C04: 循环推荐死锁 (Circular Referral)', async () => {
        await prisma.umsMember.update({ where: { memberId: uSelf }, data: { referrerId: u1 } });
        await prisma.umsMember.update({ where: { memberId: u1 }, data: { referrerId: u2 } });
        await prisma.umsMember.update({ where: { memberId: u2 }, data: { referrerId: uSelf } });
        const isCircular = await logic.checkCircular(u1, uSelf);
        if (!isCircular) throw new Error('Failed to detect circular A->B->C->A');
    });

    await runScenario('C05: 跨店佣金日限额 (Daily Limit)', async () => {
        // Create Dummy Order for Historical Commission
        const oDummyId = `oLim_Dummy_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: oDummyId, orderSn: oDummyId, tenantId: tenantA, memberId: uSelf,
                orderType: 'PRODUCT', totalAmount: 0, payAmount: 0, status: 'PAID',
                items: { create: { skuId, quantity: 1, price: 0, totalAmount: 0, productId: prodId, productName: 'T', productImg: '' } }
            }
        });

        // Pre-fill existing commissions to 98
        await prisma.finCommission.create({
            data: {
                tenantId: tenantA, orderId: oDummyId, beneficiaryId: uCrossLimit, level: 1, amount: 98, rateSnapshot: 10, status: 'FROZEN', planSettleTime: new Date()
            }
        });

        // New order commission = 4 (from C02 logic). 98+4 = 102 > 100.
        const orderId = `o5_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: orderId, orderSn: orderId, tenantId: tenantA, memberId: uSelf,
                orderType: 'PRODUCT', totalAmount: 100, payAmount: 100, status: 'PAID', shareUserId: uCrossLimit,
                items: { create: { skuId, quantity: 1, price: 100, totalAmount: 100, productId: prodId, productName: 'T', productImg: '' } }
            }
        });

        const res = await logic.calculateCommission(orderId, tenantA);
        const l1 = (res as any[]).find(r => r.level === 1);
        if (l1?.status !== 'LIMIT_EXCEEDED') throw new Error(`Expected LIMIT_EXCEEDED, got ${JSON.stringify(l1)}`);
    });

    await runScenario('C06: SKU独立分销策略优先级 (SKU Priority)', async () => {
        const orderId = `o6_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: orderId, orderSn: orderId, tenantId: tenantA, memberId: u1,
                orderType: 'PRODUCT', totalAmount: 100, payAmount: 100, status: 'PAID', shareUserId: u2,
                items: { create: { skuId: skuFixedId, quantity: 1, price: 100, totalAmount: 100, productId: prodId, productName: 'T', productImg: '' } }
            }
        });

        const res = await logic.calculateCommission(orderId, tenantA) as any[];
        const l1 = res.find(r => r.level === 1);
        if (l1?.amount.toNumber() !== 2) throw new Error(`Expected 2.00 (Fixed 20 * 0.1), got ${l1?.amount}`);
    });

    await runScenario('C07: 退款佣金倒扣 (Refund Rollback)', async () => {
        // Create Dummy Order
        const oDummyId = `oRef_Dummy_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: oDummyId, orderSn: oDummyId, tenantId: tenantA, memberId: uSelf,
                orderType: 'PRODUCT', totalAmount: 0, payAmount: 0, status: 'PAID',
                items: { create: { skuId, quantity: 1, price: 0, totalAmount: 0, productId: prodId, productName: 'T', productImg: '' } }
            }
        });

        const comm = await prisma.finCommission.create({
            data: { tenantId: tenantA, orderId: oDummyId, beneficiaryId: u1, level: 1, amount: 10, rateSnapshot: 10, status: 'SETTLED', planSettleTime: new Date() }
        });
        const status = await logic.simulateRefund(comm.id as any);
        if (status !== 'ROLLED_BACK') throw new Error(`Expected ROLLED_BACK, got ${status}`);
    });

    await runScenario('C08: L1/L2 多级分佣正确性 (Multi-Level)', async () => {
        // Use fresh users ISOLATED from previous circular tests
        const m1 = `m1_${Date.now()}`;
        const m2 = `m2_${Date.now()}`;
        const m3 = `m3_${Date.now()}`;

        await prisma.umsMember.createMany({
            data: [
                { memberId: m1, nickname: 'M1', tenantId: tenantA },
                { memberId: m2, nickname: 'M2', tenantId: tenantA, referrerId: m1 },
                { memberId: m3, nickname: 'M3', tenantId: tenantA, referrerId: m2 }
            ]
        });

        // m3 buys. referrer m2. m2 referrer m1.
        const orderId = `o8_${Date.now()}`;
        await prisma.omsOrder.create({
            data: {
                id: orderId, orderSn: orderId, tenantId: tenantA, memberId: m3,
                orderType: 'PRODUCT', totalAmount: 100, payAmount: 100, status: 'PAID',
                items: { create: { skuId, quantity: 1, price: 100, totalAmount: 100, productId: prodId, productName: 'T', productImg: '' } }
            }
        });

        const res = await logic.calculateCommission(orderId, tenantA) as any[];
        const l1 = res.find(r => r.level === 1);
        const l2 = res.find(r => r.level === 2);

        // Base=50. 
        // L1 (m2): 50 * 0.1 = 5.
        // L2 (m1): 50 * 0.05 = 2.5.

        if (l1?.beneficiaryId !== m2 || l1?.amount.toNumber() !== 5) throw new Error(`L1 mismatch: Expected m2/5, got ${l1?.beneficiaryId}/${l1?.amount}`);
        if (l2?.beneficiaryId !== m1 || l2?.amount.toNumber() !== 2.5) throw new Error(`L2 mismatch: Expected m1/2.5, got ${l2?.beneficiaryId}/${l2?.amount}`);
    });

    console.log(`\n==================================================`);
    console.log(`[PASS] 通过: ${stats.pass}`);
    console.log(`[FAIL] 失败: ${stats.fail}`);
    console.log(`==================================================\n`);

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
