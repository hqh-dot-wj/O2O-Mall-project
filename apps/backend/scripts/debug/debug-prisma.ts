
import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('Resolving @prisma/client...');
    console.log('Path:', require.resolve('@prisma/client'));

    const prisma = new PrismaClient();
    // Access DMMF via internal property (dmmf is usually on Prisma.dmmf or client._dmmf)
    // dmmf is available on the Prisma class construct
    const dmmf = (prisma as any)._runtimeDataModel || (prisma as any)._dmmf || ((prisma as any).constructor).dmmf;

    if (!dmmf) {
        console.log('Cannot find DMMF on instance.');
        const P = PrismaClient as any;
        if (P.dmmf) {
            console.log('Found DMMF on Static Class');
            checkDmmf(P.dmmf);
        } else {
            console.log('No DMMF found.');
        }
    } else {
        console.log('Found DMMF on instance');
        checkDmmf(dmmf);
    }
}

function checkDmmf(dmmf: any) {
    const model = dmmf.datamodel.models.find((m: any) => m.name === 'OmsOrderItem');
    if (model) {
        const field = model.fields.find((f: any) => f.name === 'tenantId');
        console.log('OmsOrderItem has tenantId:', !!field);
        if (field) console.log('Field:', field);
    } else {
        console.log('OmsOrderItem model not found');
    }

    const model2 = dmmf.datamodel.models.find((m: any) => m.name === 'PmsTenantSku');
    if (model2) {
        const field = model2.fields.find((f: any) => f.name === 'tenantId');
        console.log('PmsTenantSku has tenantId:', !!field);
    }
}

main();
