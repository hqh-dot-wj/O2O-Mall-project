import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const ruleSchema = {
        fields: [
            {
                key: 'minCount',
                label: '最低开班人数',
                type: 'number',
                required: true,
                min: 1,
                help: '达到此人数才算拼团成功',
            },
            {
                key: 'maxCount',
                label: '最高招生人数',
                type: 'number',
                required: true,
                min: 1,
                help: '超过此人数停止报名',
            },
            {
                key: 'price',
                label: '课程价格',
                type: 'number',
                required: true,
                min: 0.01,
            },
            {
                key: 'leaderDiscount',
                label: '团长优惠金额',
                type: 'number',
                required: false,
                min: 0,
                help: '团长可减免多少钱',
            },
            {
                key: 'joinDeadline',
                label: '报名截止时间',
                type: 'date', // Frontend need to render DatePicker
                required: true,
            },
            {
                key: 'address',
                label: '上课地址',
                type: 'string',
                required: true,
            },
            {
                key: 'totalLessons',
                label: '总课时数',
                type: 'number',
                required: true,
            },
            {
                key: 'dayLessons',
                label: '每日课时',
                type: 'number',
                required: true,
            },
            {
                key: 'classTime',
                label: '上课时间段',
                type: 'string', // e.g. "19:00-21:00"
                required: true,
                placeholder: '例: 每周六 19:00-21:00',
            },
            {
                key: 'validDays',
                label: '课程有效期(天)',
                type: 'number',
                required: true,
                min: 1,
            },
        ],
    };

    const template = await prisma.playTemplate.upsert({
        where: { code: 'COURSE_GROUP_BUY' },
        update: {
            name: '拼团课程',
            ruleSchema: ruleSchema,
        },
        create: {
            code: 'COURSE_GROUP_BUY',
            name: '拼团课程',
            ruleSchema: ruleSchema,
            description: '凑人开班，团长优惠，含课时与排期管理',
        },
    });

    console.log('✅ Seeded Template: ', template.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
