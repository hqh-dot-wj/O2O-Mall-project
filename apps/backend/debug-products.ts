import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const globalCount = await prisma.pmsProduct.count();
    console.log('--- Global Products (pms_product) Count:', globalCount);

    const tenantProducts = await prisma.pmsTenantProduct.findMany({
        include: { product: true }
    });
    console.log('--- Tenant Products (pms_tenant_product) Count:', tenantProducts.length);
    console.log('--- Data Sample:', JSON.stringify(tenantProducts.map(tp => ({ id: tp.id, tenantId: tp.tenantId, name: tp.product.name })), null, 2));

    const tenants = await prisma.sysTenant.findMany();
    console.log('--- Tenants in System:', tenants.map(t => t.tenantId));
}
main().finally(() => prisma.$disconnect());
