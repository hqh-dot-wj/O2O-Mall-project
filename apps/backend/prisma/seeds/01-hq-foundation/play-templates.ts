/**
 * 营销玩法模板：项目已有的 5 种全部补齐
 */
import { PrismaClient, Status, DelFlag } from '@prisma/client';

export async function seedPlayTemplates(prisma: PrismaClient) {
  console.log('[01-HQ] 营销玩法模板...');

  const templates = [
    { code: 'GROUP_BUY', name: '普通拼团', unitName: '个', ruleSchema: { fields: [{ key: 'targetCount', label: '成团人数', type: 'number', required: true }, { key: 'price', label: '拼团价', type: 'number', required: true }, { key: 'duration', label: '有效时长(小时)', type: 'number', required: true }] } },
    { code: 'COURSE_GROUP_BUY', name: '拼班课程', unitName: '节', ruleSchema: { fields: [{ key: 'minCount', label: '最低开班人数', type: 'number', required: true }, { key: 'maxCount', label: '最高招生人数', type: 'number', required: true }, { key: 'price', label: '课程价格', type: 'number', required: true }, { key: 'joinDeadline', label: '报名截止时间', type: 'string', required: true }, { key: 'address', label: '上课地址', type: 'string', required: true }, { key: 'totalLessons', label: '总课时数', type: 'number', required: true }, { key: 'dayLessons', label: '每日课时', type: 'number', required: true }, { key: 'classTime', label: '上课时间段', type: 'string', required: true }, { key: 'validDays', label: '课程有效期(天)', type: 'number', required: true }] } },
    { code: 'FLASH_SALE', name: '限时秒杀', unitName: '件', ruleSchema: { fields: [{ key: 'flashPrice', label: '秒杀价格', type: 'number', required: true }, { key: 'totalStock', label: '总库存数量', type: 'number', required: true }, { key: 'limitPerUser', label: '每人限购数量', type: 'number', required: false }, { key: 'startTime', label: '秒杀开始时间', type: 'string', required: true }, { key: 'endTime', label: '秒杀结束时间', type: 'string', required: true }] } },
    { code: 'FULL_REDUCTION', name: '满减活动', unitName: '单', ruleSchema: { fields: [{ key: 'tiers', label: '满减档位', type: 'array', required: true }, { key: 'applicableScope', label: '适用范围', type: 'string', required: true }, { key: 'startTime', label: '活动开始时间', type: 'string', required: true }, { key: 'endTime', label: '活动结束时间', type: 'string', required: true }] } },
    { code: 'MEMBER_UPGRADE', name: '会员升级', unitName: '次', ruleSchema: { fields: [{ key: 'targetLevel', label: '目标等级', type: 'number', required: true }, { key: 'price', label: '升级价格', type: 'number', required: true }, { key: 'autoApprove', label: '是否自动通过审批', type: 'boolean', required: false }] } },
  ];

  for (const t of templates) {
    await prisma.playTemplate.upsert({
      where: { code: t.code },
      update: { name: t.name, unitName: t.unitName, ruleSchema: t.ruleSchema, status: Status.NORMAL, delFlag: DelFlag.NORMAL },
      create: {
        code: t.code,
        name: t.name,
        unitName: t.unitName,
        ruleSchema: t.ruleSchema,
        uiComponentId: null,
        productId: null,
        skuId: null,
        productName: null,
        status: Status.NORMAL,
        delFlag: DelFlag.NORMAL,
      },
    });
  }
  console.log(`  ✓ ${templates.length} 个玩法模板`);
}
