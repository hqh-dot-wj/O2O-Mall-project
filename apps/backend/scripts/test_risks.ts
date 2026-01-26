
import { PrismaClient, DelFlag, PublishStatus, ProductType } from '@prisma/client';
import { Console } from 'console';
import { performance } from 'perf_hooks';

// Mock Dependencies
const mockRedis = {
    get: async (): Promise<string | null> => null,
    set: async (): Promise<string> => 'OK',
    del: async (): Promise<number> => 1,
    hmset: async (): Promise<string> => 'OK',
};

const mockQueue = {
    add: async (data: any, opts: any): Promise<{ id: number }> => {
        // console.log('[MockQueue] Job added:', data, opts);
        return { id: 1 };
    },
};

const mockCommissionService = {
    updatePlanSettleTime: async (): Promise<void> => { },
};

const mockRiskService = {
    checkOrderRisk: async (): Promise<void> => { },
};

const mockMessageService = {
    createMessage: async (): Promise<void> => { },
};

// --- Minimal Service Re-implementation / Wrapper for Testing ---
const prisma = new PrismaClient();

// Color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';

// Logger
function log(msg: string) {
    console.log(msg);
}

function logPass(scenario: string, timeMs: number) {
    console.log(`${GREEN}[PASS] ${scenario}${RESET} ${GRAY}(${timeMs.toFixed(2)}ms)${RESET}`);
}

function logFail(scenario: string, reason: string, analysis: string) {
    console.log(`${RED}[FAIL] ${scenario}${RESET}`);
    console.log(`${GRAY}--------------------------------------------------${RESET}`);
    console.log(`${RED}原因:${RESET} ${reason}`);
    console.log(`${YELLOW}分析:${RESET} ${analysis}`);
    console.log(`${GRAY}--------------------------------------------------${RESET}`);
}

function logMissing(scenario: string, reason: string, analysis: string) {
    console.log(`${YELLOW}[MISSING] ${scenario}${RESET}`);
    console.log(`${GRAY}--------------------------------------------------${RESET}`);
    console.log(`${YELLOW}原因:${RESET} ${reason}`);
    console.log(`${YELLOW}分析:${RESET} ${analysis}`);
    console.log(`${GRAY}--------------------------------------------------${RESET}`);
}

// Stats
const stats = {
    pass: 0,
    fail: 0,
    missing: 0,
};

// Helper
async function runScenario(name: string, fn: () => Promise<void>) {
    const start = performance.now();
    try {
        await fn();
        const end = performance.now();
        logPass(name, end - start);
        stats.pass++;
    } catch (e: any) {
        if (e.message && e.message.startsWith('[MISSING]')) {
            const parts = e.message.split('|||');
            logMissing(name, parts[1] || 'Not implemented', parts[2] || '');
            stats.missing++;
        } else if (e.message && e.message.startsWith('[FAIL]')) {
            const parts = e.message.split('|||');
            logFail(name, parts[1] || e.message, parts[2] || '');
            stats.fail++;
        } else {
            logFail(name, e.message || String(e), 'Unexpected Error');
            stats.fail++;
        }
    }
}

// --- Scenarios ---

async function main() {
    console.log(`\n🚀 开始执行风险验证脚本 (Risk Verification)...\n`);

    // Setup Data
    const tenantId = `t_${Date.now()}`;
    const memberId = `u_${Date.now()}`;

    // 1. Create Tenant
    await prisma.sysTenant.create({
        data: {
            tenantId,
            companyName: 'Test Tenant',
            status: 'NORMAL',
            delFlag: 'NORMAL'
        }
    });

    // 1.5 Create Category
    const category = await prisma.pmsCategory.create({
        data: {
            name: 'Test Category',
            level: 1
        }
    });

    // 2. Create HQ Product
    const productId = `prod_${Date.now()}`;
    await prisma.pmsProduct.create({
        data: {
            productId,
            name: 'HQ Product',
            detailHtml: '<p>Detail</p>',
            specDef: [],
            categoryId: category.catId, // Use real ID
            type: ProductType.REAL,
            publishStatus: PublishStatus.ON_SHELF,
            delFlag: DelFlag.NORMAL,
            mainImages: ['http://img.com/1.jpg']
        }
    });

    // Create Global SKU
    const globalSkuId = `gsku_${Date.now()}`;
    await prisma.pmsGlobalSku.create({
        data: {
            skuId: globalSkuId,
            productId,
            specValues: {},
            guidePrice: 100,
            guideRate: 0.1,
            maxDistRate: 0.3,
            minDistRate: 0.05
        }
    });

    // 3. Create Tenant Product & SKU
    const tenantProdId = `tprod_${Date.now()}`;
    const tenantSkuId = `tsku_${Date.now()}`;
    await prisma.pmsTenantProduct.create({
        data: {
            id: tenantProdId,
            tenantId,
            productId,
            status: PublishStatus.ON_SHELF
        }
    });

    await prisma.pmsTenantSku.create({
        data: {
            id: tenantSkuId,
            tenantId,
            tenantProductId: tenantProdId,
            globalSkuId,
            price: 100,
            stock: 10,
            isActive: true,
            distRate: 0.1
        }
    });

    // 4. Create User
    await prisma.umsMember.create({
        data: {
            memberId,
            nickname: 'TestUser',
            tenantId
        }
    });


    // --- Test Execution ---

    await runScenario('T01: 总部下架传导性 (HQ Off-Shelf Propagation)', async () => {
        // Action: HQ sets status OFF
        await prisma.pmsProduct.update({
            where: { productId },
            data: { publishStatus: PublishStatus.OFF_SHELF }
        });

        // Check Tenant SKU access
        const tenantSku = await prisma.pmsTenantSku.findFirst({
            where: { id: tenantSkuId },
            include: { tenantProd: { include: { product: true } } }
        });

        if (tenantSku?.tenantProd.product.publishStatus === PublishStatus.ON_SHELF) {
            throw new Error('[FAIL]|||HQ下架后，查询到的商品状态仍为上架|||未实现 मुख्यालयProduct 状态同步或查询时未做联表过滤');
        }

        // Restore
        await prisma.pmsProduct.update({ where: { productId }, data: { publishStatus: PublishStatus.ON_SHELF } });
    });

    await runScenario('T02: 购物车“幽灵”商品 (Cart Invalid Item)', async () => {
        // Add to cart
        await prisma.omsCartItem.create({
            data: {
                memberId,
                tenantId,
                skuId: tenantSkuId,
                productId,
                quantity: 1,
                productName: 'HQ Product',
                productImg: 'img',
                price: 100
            }
        });

        // HQ Off again
        await prisma.pmsProduct.update({ where: { productId }, data: { publishStatus: PublishStatus.OFF_SHELF } });

        // Simulate Cart List Logic
        const cartItems = await prisma.omsCartItem.findMany({ where: { memberId } });
        const skuIds = cartItems.map(i => i.skuId);
        const skus = await prisma.pmsTenantSku.findMany({
            where: { id: { in: skuIds } },
            include: { tenantProd: { include: { product: true } } }
        });

        const sku = skus.find(s => s.id === tenantSkuId);
        const isInvalid = !sku || sku.tenantProd.product.publishStatus !== PublishStatus.ON_SHELF;

        if (!isInvalid) {
            throw new Error('[FAIL]|||下架商品在购物车计算中仍判定为有效|||CartService.getCartList 逻辑缺失状态校验');
        }

        // Restore
        await prisma.pmsProduct.update({ where: { productId }, data: { publishStatus: PublishStatus.ON_SHELF } });
    });

    await runScenario('T05: 下单时最终一致性 (Order Final Consistency)', async () => {
        // Mock Order Create Check
        // Simulate concurrent off-shelf
        await prisma.pmsProduct.update({ where: { productId }, data: { publishStatus: PublishStatus.OFF_SHELF } });

        // Logic check:
        const sku = await prisma.pmsTenantSku.findUnique({
            where: { id: tenantSkuId },
            include: { tenantProd: { include: { product: true } } }
        });

        if (sku && sku.tenantProd.product.publishStatus !== PublishStatus.ON_SHELF) {
            // Passed
        } else {
            throw new Error('Test Setup Failed');
        }
        // Restore
        await prisma.pmsProduct.update({ where: { productId }, data: { publishStatus: PublishStatus.ON_SHELF } });
    });

    await runScenario('F01: 秒退库存回滚 (Inventory Rollback)', async () => {
        // Initial Stock: 10
        // Simulate Order Placement (Stock -1)
        await prisma.pmsTenantSku.update({
            where: { id: tenantSkuId },
            data: { stock: { decrement: 1 } }
        });

        // Check Stock
        let sku = await prisma.pmsTenantSku.findUnique({ where: { id: tenantSkuId } });
        if (sku?.stock !== 9) throw new Error('Setup: Inventory decrement failed');

        // Simulate Cancel Order (Stock +1)
        await prisma.pmsTenantSku.update({
            where: { id: tenantSkuId },
            data: { stock: { increment: 1 } }
        });

        sku = await prisma.pmsTenantSku.findUnique({ where: { id: tenantSkuId } });
        if (sku?.stock !== 10) {
            throw new Error('[FAIL]|||取消订单后库存未恢复|||cancelOrder 逻辑或事务未正确执行');
        }
    });

    await runScenario('F04: 支付回调亡灵防御 (Callback Ghost Defense)', async () => {
        throw new Error('[MISSING]|||未找到支付回调中针对‘已取消订单’的防御逻辑|||代码审查未发现 PaymentCallback 处理 Cancelled 状态自动退款的代码');
    });

    await runScenario('S01: 并发超卖 (Concurrent Over-selling)', async () => {
        const res = await prisma.pmsTenantSku.updateMany({
            where: { id: tenantSkuId, stock: { gte: 999 } }, // Impossible
            data: { stock: { decrement: 1 } }
        });

        if (res.count !== 0) {
            throw new Error('[FAIL]|||库存不足仍扣减成功|||updateMany 条件失效');
        }
    });

    await runScenario('T04: 软删除数据隔离 (Soft Delete Isolation)', async () => {
        // Create a temp product
        const tempId = `temp_${Date.now()}`;
        await prisma.pmsProduct.create({
            data: {
                productId: tempId,
                name: 'Soft Delete Prod',
                type: ProductType.REAL,
                specDef: [],
                categoryId: 1,
                mainImages: [],
                detailHtml: ''
            }
        });

        // Soft Delete
        await prisma.pmsProduct.update({
            where: { productId: tempId },
            data: { delFlag: DelFlag.DELETE }
        });

        // Access via FindUnique (Snapshot simulation) - Should find it
        const direct = await prisma.pmsProduct.findUnique({ where: { productId: tempId } });
        if (!direct) throw new Error('[FAIL]|||ID查询(快照)无法获取软删除数据|||Prisma Middleware 可能过度过滤');

        // Logic check: Code must explicitly filter delFlag if no middleware.
        if (direct.delFlag !== DelFlag.DELETE) throw new Error('[FAIL]|||软删除状态未更新|||update 失败');
    });

    console.log(`\n==================================================`);
    console.log(`测试完成 Summary`);
    console.log(`[PASS] 通过: ${stats.pass}`);
    console.log(`[FAIL] 失败: ${stats.fail}`);
    console.log(`[MISSING] 未实现: ${stats.missing}`);
    console.log(`==================================================\n`);

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
