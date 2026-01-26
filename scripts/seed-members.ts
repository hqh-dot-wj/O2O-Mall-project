import { PrismaClient, MemberStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// 中文姓名池
const SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴', '郑', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗'];
const GIVEN_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '慧'];

// 随机头像URL池 (使用 picsum)
const getRandomAvatar = (seed: number) => `https://picsum.photos/seed/${seed}/200/200`;

// 随机手机号生成
const generateMobile = (index: number) => {
    const prefixes = ['138', '139', '137', '136', '135', '188', '187', '159', '158', '152', '151', '150', '186', '185', '183', '182', '181', '180'];
    const prefix = prefixes[index % prefixes.length];
    const suffix = String(10000000 + Math.floor(Math.random() * 89999999)).slice(1); // 8位随机数
    return prefix + suffix;
};

// 随机中文昵称
export const generateNickname = () => {
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const givenName = GIVEN_NAMES[Math.floor(Math.random() * GIVEN_NAMES.length)];
    return surname + givenName;
};

export async function seedMembers(prisma: PrismaClient, tenantIds: string[], countPerTenant: number = 10) {
    console.log(`--- Seeding UmsMember Data for ${tenantIds.length} tenants ---`);

    const totalCount = tenantIds.length * countPerTenant;
    const members: any[] = [];

    for (const tenantId of tenantIds) {
        // 先为每个租户生成成员ID，用于建立推荐关系
        const memberIds: string[] = [];
        for (let i = 0; i < countPerTenant; i++) {
            memberIds.push(`mem-${tenantId}-${String(i + 1).padStart(3, '0')}-${Date.now().toString().slice(-6)}${i}`);
        }

        for (let i = 0; i < countPerTenant; i++) {
            // 推荐人逻辑：前2个没有推荐人，其他随机选择前面的人作为推荐人
            let referrerId: string | null = null;
            if (i >= 2) {
                const referrerIndex = Math.floor(Math.random() * i);
                referrerId = memberIds[referrerIndex];
            }

            members.push({
                memberId: memberIds[i],
                tenantId: tenantId,
                nickname: generateNickname(),
                avatar: getRandomAvatar(1000 + i + parseInt(tenantId.slice(-3) || '0')),
                mobile: generateMobile(i + parseInt(tenantId.slice(-3) || '0')),
                password: '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS', // 123456
                status: MemberStatus.NORMAL,
                levelId: Math.floor(Math.random() * 5) + 1,
                balance: new Decimal(Math.floor(Math.random() * 100000) / 100),
                frozenBalance: new Decimal(Math.floor(Math.random() * 20000) / 100),
                points: Math.floor(Math.random() * 20000),
                referrerId,
            });
        }
    }

    // 批量插入，分两次处理推荐关系
    const firstBatch = members.filter(m => !m.referrerId);
    const secondBatch = members.filter(m => m.referrerId);

    console.log(`Creating ${firstBatch.length} members without referrer...`);
    await prisma.umsMember.createMany({
        data: firstBatch,
        skipDuplicates: true,
    });

    console.log(`Creating ${secondBatch.length} members with referrer...`);
    await prisma.umsMember.createMany({
        data: secondBatch,
        skipDuplicates: true,
    });

    console.log(`--- Seeded ${members.length} UmsMember records successfully! ---`);
    return members;
}

async function main() {

    const tenantIds = ['000000', '100001', '100002', '100003', '100004', '100005', '100006', '100007', '100008', '100009'];
    await seedMembers(prisma, tenantIds, 6);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
