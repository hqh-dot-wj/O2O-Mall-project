import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. 普通拼团
    await prisma.playTemplate.upsert({
        where: { code: 'GROUP_BUY' },
        update: {
            name: '普通拼团',
            unitName: '个',
            ruleSchema: {
                fields: [
                    { key: 'targetCount', label: '成团人数', type: 'number', required: true },
                    { key: 'price', label: '拼团价', type: 'number', required: true },
                    { key: 'duration', label: '有效时长(小时)', type: 'number', required: true }
                ]
            }
        },
        create: {
            code: 'GROUP_BUY',
            name: '普通拼团',
            unitName: '个',
            ruleSchema: {
                fields: [
                    { key: 'targetCount', label: '成团人数', type: 'number', required: true },
                    { key: 'price', label: '拼团价', type: 'number', required: true },
                    { key: 'duration', label: '有效时长(小时)', type: 'number', required: true }
                ]
            }
        }
    });

    // 2. 拼团课程
    await prisma.playTemplate.upsert({
        where: { code: 'COURSE_GROUP_BUY' },
        update: {
            name: '拼团课程',
            unitName: '节',
            ruleSchema: {
                fields: [
                    { key: 'minCount', label: '最低开班人数', type: 'number', required: true },
                    { key: 'maxCount', label: '最高招生人数', type: 'number', required: true },
                    { key: 'price', label: '课程价格', type: 'number', required: true },
                    { key: 'leaderDiscount', label: '团长优惠金额', type: 'number', required: false },
                    { key: 'joinDeadline', label: '报名截止时间', type: 'string', required: true },
                    { key: 'address', label: '上课地址', type: 'string', required: true },
                    { key: 'totalLessons', label: '总课时数', type: 'number', required: true },
                    { key: 'dayLessons', label: '每日课时', type: 'number', required: true },
                    { key: 'classTime', label: '上课时间段', type: 'string', required: true },
                    { key: 'validDays', label: '课程有效期(天)', type: 'number', required: true }
                ]
            }
        },
        create: {
            code: 'COURSE_GROUP_BUY',
            name: '拼团课程',
            unitName: '节',
            ruleSchema: {
                fields: [
                    { key: 'minCount', label: '最低开班人数', type: 'number', required: true },
                    { key: 'maxCount', label: '最高招生人数', type: 'number', required: true },
                    { key: 'price', label: '课程价格', type: 'number', required: true },
                    { key: 'leaderDiscount', label: '团长优惠金额', type: 'number', required: false },
                    { key: 'joinDeadline', label: '报名截止时间', type: 'string', required: true },
                    { key: 'address', label: '上课地址', type: 'string', required: true },
                    { key: 'totalLessons', label: '总课时数', type: 'number', required: true },
                    { key: 'dayLessons', label: '每日课时', type: 'number', required: true },
                    { key: 'classTime', label: '上课时间段', type: 'string', required: true },
                    { key: 'validDays', label: '课程有效期(天)', type: 'number', required: true }
                ]
            }
        }
    });

    console.log('✅ All PlayTemplates seeded successfully');
}

main()
    .catch(e => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
