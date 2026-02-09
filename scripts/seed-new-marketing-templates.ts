import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding New Marketing Templates...');

  // 1. 更新课程拼团模板 - 添加新字段到 ruleSchema
  console.log('📝 Updating COURSE_GROUP_BUY template...');
  const courseGroupBuyTemplate = await prisma.playTemplate.findUnique({
    where: { code: 'COURSE_GROUP_BUY' },
  });

  if (courseGroupBuyTemplate) {
    await prisma.playTemplate.update({
      where: { code: 'COURSE_GROUP_BUY' },
      data: {
        ruleSchema: {
          fields: [
            { name: 'price', label: '拼团价格', type: 'number', required: true, min: 0.01 },
            { name: 'minCount', label: '最小成团人数', type: 'number', required: true, min: 2, default: 2 },
            { name: 'maxCount', label: '最大成团人数', type: 'number', required: false },
            { name: 'totalLessons', label: '总课时数', type: 'number', required: true, min: 1 },
            { name: 'dayLessons', label: '每天课时数', type: 'number', required: false, default: 1 },
            { name: 'validDays', label: '有效期(天)', type: 'number', required: false },
            { name: 'joinDeadline', label: '报名截止时间', type: 'datetime', required: false },
            { name: 'classStartTime', label: '上课开始时间', type: 'datetime', required: false },
            { name: 'classEndTime', label: '上课结束时间', type: 'datetime', required: false },
            { name: 'classAddress', label: '上课地址', type: 'text', required: false },
            { name: 'leaderDiscount', label: '团长优惠金额', type: 'number', required: false, min: 0 },
            { name: 'leaderFree', label: '团长是否免单', type: 'boolean', required: false, default: false },
            {
              name: 'leaderMustBeDistributor',
              label: '团长必须是分销员',
              type: 'boolean',
              required: false,
              default: false,
            },
          ],
        },
      },
    });
    console.log('✅ COURSE_GROUP_BUY template updated');
  } else {
    console.log('⚠️  COURSE_GROUP_BUY template not found, skipping update');
  }

  // 2. 创建限时秒杀模板
  console.log('📝 Creating FLASH_SALE template...');
  const flashSaleExists = await prisma.playTemplate.findUnique({
    where: { code: 'FLASH_SALE' },
  });

  if (!flashSaleExists) {
    await prisma.playTemplate.create({
      data: {
        code: 'FLASH_SALE',
        name: '限时秒杀',
        unitName: '件',
        uiComponentId: 'FlashSaleCard',
        ruleSchema: {
          fields: [
            { name: 'flashPrice', label: '秒杀价格', type: 'number', required: true, min: 0.01 },
            { name: 'totalStock', label: '总库存数量', type: 'number', required: true, min: 1 },
            { name: 'limitPerUser', label: '每人限购数量', type: 'number', required: false, default: 1, min: 1 },
            { name: 'startTime', label: '秒杀开始时间', type: 'datetime', required: true },
            { name: 'endTime', label: '秒杀结束时间', type: 'datetime', required: true },
          ],
          tips: [
            '秒杀活动必须使用强锁定库存模式',
            '开始时间不能早于当前时间',
            '结束时间必须晚于开始时间',
            '建议设置合理的限购数量防止恶意抢购',
          ],
        },
      },
    });
    console.log('✅ FLASH_SALE template created');
  } else {
    console.log('⚠️  FLASH_SALE template already exists, skipping');
  }

  // 3. 创建满减活动模板
  console.log('📝 Creating FULL_REDUCTION template...');
  const fullReductionExists = await prisma.playTemplate.findUnique({
    where: { code: 'FULL_REDUCTION' },
  });

  if (!fullReductionExists) {
    await prisma.playTemplate.create({
      data: {
        code: 'FULL_REDUCTION',
        name: '满减活动',
        unitName: '元',
        uiComponentId: 'FullReductionCard',
        ruleSchema: {
          fields: [
            {
              name: 'tiers',
              label: '满减档位',
              type: 'array',
              required: true,
              itemSchema: {
                threshold: { label: '满足金额', type: 'number', required: true, min: 0.01 },
                discount: { label: '减免金额', type: 'number', required: true, min: 0.01 },
              },
              example: [
                { threshold: 300, discount: 50 },
                { threshold: 500, discount: 100 },
              ],
            },
            {
              name: 'applicableScope',
              label: '适用范围',
              type: 'select',
              required: true,
              options: [
                { value: 'ALL', label: '全场通用' },
                { value: 'CATEGORY', label: '指定分类' },
                { value: 'PRODUCT', label: '指定商品' },
              ],
              default: 'ALL',
            },
            { name: 'categoryIds', label: '适用分类ID', type: 'array', required: false },
            { name: 'productIds', label: '适用商品ID', type: 'array', required: false },
            { name: 'stackable', label: '是否可叠加', type: 'boolean', required: false, default: false },
            { name: 'startTime', label: '活动开始时间', type: 'datetime', required: true },
            { name: 'endTime', label: '活动结束时间', type: 'datetime', required: true },
          ],
          tips: [
            '满减档位必须按金额递增配置',
            '选择分类范围时必须指定分类ID',
            '选择商品范围时必须指定商品ID',
            '满减活动通常在订单结算时应用',
          ],
        },
      },
    });
    console.log('✅ FULL_REDUCTION template created');
  } else {
    console.log('⚠️  FULL_REDUCTION template already exists, skipping');
  }

  console.log('\n🎉 Marketing templates seeding completed!');
  console.log('\n📋 Summary:');
  console.log('   ✅ COURSE_GROUP_BUY - 已更新（添加上课时间、地址等字段）');
  console.log('   ✅ FLASH_SALE - 限时秒杀模板');
  console.log('   ✅ FULL_REDUCTION - 满减活动模板');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
