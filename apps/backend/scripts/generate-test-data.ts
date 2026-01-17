
import { PrismaClient, Status, DelFlag, MemberStatus } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

async function main() {
    console.log('🚀 Starting test data generation...');

    // --- 1. Tenant & Admin Generation ---
    console.log('\nChecking existing tenants...');
    const existingTenants = await prisma.sysTenant.count({
        where: { delFlag: DelFlag.NORMAL },
    });

    const createdTenants: any[] = [];

    if (existingTenants < 5) {
        const needed = 5 - existingTenants;
        console.log(`Found ${existingTenants} tenants. Generating ${needed} new tenants...`);

        const baseId = 200000;
        for (let i = 1; i <= needed; i++) {
            const idNum = baseId + i;
            const tenantId = idNum.toString();
            const companyName = `Test Company ${idNum}`;
            const username = `admin_${idNum}`;
            const password = '123456';
            const hashedPassword = hashSync(password, 10);

            // Check if exists (avoid crash on re-run)
            const exists = await prisma.sysTenant.findUnique({ where: { tenantId } });
            if (exists) {
                console.log(`Tenant ${tenantId} already exists, skipping creation.`);
                continue;
            }

            // Create Tenant
            await prisma.sysTenant.create({
                data: {
                    tenantId,
                    companyName,
                    contactUserName: 'Test Admin',
                    contactPhone: '13800138000',
                    status: Status.NORMAL,
                    delFlag: DelFlag.NORMAL,
                    accountCount: -1,
                    expireTime: new Date('2099-12-31T23:59:59Z'), // Forever
                },
            });

            // Create Admin User
            await prisma.sysUser.create({
                data: {
                    userName: username,
                    nickName: 'Tenant Admin',
                    userType: '1', // System User
                    password: hashedPassword,
                    status: Status.NORMAL,
                    delFlag: DelFlag.NORMAL,
                    tenantId,
                },
            });

            createdTenants.push({ username, password, tenantId, companyName });
            console.log(`✅ Created Tenant: ${companyName} | Admin: ${username} / ${password}`);
        }
    } else {
        console.log('Enough tenants exist. Skipping tenant generation.');
    }

    // --- 2. Member Generation ---
    console.log('\nGenerating Members...');

    // Get all valid tenant IDs
    const allTenants = await prisma.sysTenant.findMany({
        where: { delFlag: DelFlag.NORMAL, status: Status.NORMAL },
        select: { tenantId: true },
    });

    if (allTenants.length === 0) {
        console.error('❌ No active tenants found to assign members to!');
        return;
    }

    const tenantIds = allTenants.map(t => t.tenantId);
    const MEMBER_COUNT = 100;
    const memberData = [];

    const randomPhone = () => {
        const prefix = ['130', '131', '132', '133', '135', '138', '150', '158', '186', '189'];
        const p = prefix[Math.floor(Math.random() * prefix.length)];
        const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        return p + suffix;
    };

    const randomName = () => {
        const names = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'Tom', 'Jerry', 'Alice', 'Bob'];
        const n = names[Math.floor(Math.random() * names.length)];
        return `${n}_${Math.floor(Math.random() * 1000)}`;
    };

    for (let i = 0; i < MEMBER_COUNT; i++) {
        const tenantId = tenantIds[Math.floor(Math.random() * tenantIds.length)];
        memberData.push({
            memberId: (Date.now() + i).toString(), // Simple ID gen
            nickname: randomName(),
            mobile: randomPhone(),
            avatar: 'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png', // Default avatar
            status: Math.random() > 0.1 ? MemberStatus.NORMAL : MemberStatus.DISABLED, // 90% active
            tenantId,
            createTime: new Date(),
        });
    }

    // Bulk create
    // createMany is supported in recent Prisma versions for Postgres
    const result = await prisma.umsMember.createMany({
        data: memberData,
        skipDuplicates: true,
    });

    console.log(`✅ Successfully generated ${result.count} members.`);

    // --- Summary ---
    console.log('\n=============================================');
    console.log('🎉 Test Data Generation Complete!');
    if (createdTenants.length > 0) {
        console.log('New Tenant Admin Credentials:');
        createdTenants.forEach(t => {
            console.log(`- Tenant: ${t.companyName} (${t.tenantId}) | User: ${t.username} | Pass: ${t.password}`);
        });
    } else {
        console.log('No new tenants created (existing ones used).');
    }
    console.log(`Added ${result.count} new members.`);
    console.log('=============================================');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
