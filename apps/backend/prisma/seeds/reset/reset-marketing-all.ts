import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

/**
 * 营销系统完整重置脚本
 * 
 * 功能：
 * 1. 删除所有营销实例（用户参与记录）
 * 2. 删除所有门店营销配置
 * 3. 删除所有营销玩法模板
 * 4. 重新创建标准营销玩法模板
 * 
 * ⚠️ 警告：此操作会删除所有营销相关数据，请谨慎使用！
 * 
 * 使用方法：
 * ```bash
 * cd apps/backend
 * npx ts-node prisma/reset-marketing-all.ts
 * ```
 */

// 创建命令行交互接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log('⚠️  营销系统完整重置脚本\n');
  console.log('此操作将：');
  console.log('  1. 删除所有营销实例（用户参与记录）');
  console.log('  2. 删除所有门店营销配置');
  console.log('  3. 删除所有营销玩法模板');
  console.log('  4. 重新创建标准营销玩法模板\n');

  const answer = await question('⚠️  确认要继续吗？这将删除所有营销数据！(yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ 操作已取消');
    rl.close();
    return;
  }

  console.log('\n🚀 开始重置营销系统...\n');

  // ==========================================
  // 第一步：删除营销实例
  // ==========================================
  console.log('🗑️  第一步：删除营销实例...');
  
  try {
    const instanceCount = await prisma.playInstance.count();
    console.log(`   发现 ${instanceCount} 个营销实例`);
    
    if (instanceCount > 0) {
      const deleteInstances = await prisma.playInstance.deleteMany({});
      console.log(`   ✅ 已删除 ${deleteInstances.count} 个营销实例\n`);
    } else {
      console.log('   ℹ️  没有营销实例需要删除\n');
    }
  } catch (error: any) {
    console.error('   ❌ 删除营销实例失败:', error.message);
    throw error;
  }

  // ==========================================
  // 第二步：删除门店营销配置
  // ==========================================
  console.log('🗑️  第二步：删除门店营销配置...');
  
  try {
    const configCount = await prisma.storePlayConfig.count();
    console.log(`   发现 ${configCount} 个门店配置`);
    
    if (configCount > 0) {
      const deleteConfigs = await prisma.storePlayConfig.deleteMany({});
      console.log(`   ✅ 已删除 ${deleteConfigs.count} 个门店配置\n`);
    } else {
      console.log('   ℹ️  没有门店配置需要删除\n');
    }
  } catch (error: any) {
    console.error('   ❌ 删除门店配置失败:', error.message);
    throw error;
  }

  // ==========================================
  // 第三步：删除营销玩法模板
  // ==========================================
  console.log('🗑️  第三步：删除营销玩法模板...');
  
  try {
    const templateCount = await prisma.playTemplate.count();
    console.log(`   发现 ${templateCount} 个模板`);
    
    if (templateCount > 0) {
      const deleteTemplates = await prisma.playTemplate.deleteMany({});
      console.log(`   ✅ 已删除 ${deleteTemplates.count} 个模板\n`);
    } else {
      console.log('   ℹ️  没有模板需要删除\n');
    }
  } catch (error: any) {
    console.error('   ❌ 删除模板失败:', error.message);
    throw error;
  }

  // ==========================================
  // 第四步：创建标准营销玩法模板
  // ==========================================
  console.log('📝 第四步：创建标准营销玩法模板...\n');

  const templates = [
    // 1. 普通拼团
    {
      code: 'GROUP_BUY',
      name: '普通拼团',
      unitName: '个',
      ruleSchema: {
        fields: [
          { key: 'price', label: '拼团价', type: 'number', required: true },
          { key: 'minCount', label: '成团人数', type: 'number', required: true },
          { key: 'duration', label: '拼团有效时长(小时)', type: 'number', required: true },
          { key: 'startTime', label: '活动开始时间', type: 'datetime', required: false },
          { key: 'endTime', label: '活动结束时间', type: 'datetime', required: false },
        ],
      },
    },

    // 2. 课程拼团
    {
      code: 'COURSE_GROUP_BUY',
      name: '课程拼团',
      unitName: '节',
      ruleSchema: {
        fields: [
          { key: 'price', label: '课程价格', type: 'number', required: true },
          { key: 'minCount', label: '最低开班人数', type: 'number', required: true },
          { key: 'maxCount', label: '最高招生人数', type: 'number', required: true },
          { key: 'leaderDiscount', label: '团长优惠金额', type: 'number', required: false },
          { key: 'joinDeadline', label: '报名截止时间', type: 'datetime', required: true },
          { key: 'classStartTime', label: '开课时间', type: 'datetime', required: true },
          { key: 'address', label: '上课地址', type: 'address', required: true },
          { key: 'totalLessons', label: '总课时数', type: 'number', required: true },
          { key: 'dayLessons', label: '每日课时', type: 'number', required: true },
          { key: 'classTime', label: '上课时间段', type: 'string', required: true },
          { key: 'validDays', label: '课程有效期(天)', type: 'number', required: true },
        ],
      },
    },

    // 3. 限时秒杀
    {
      code: 'FLASH_SALE',
      name: '限时秒杀',
      unitName: '个',
      ruleSchema: {
        fields: [
          { key: 'price', label: '秒杀价', type: 'number', required: true },
          { key: 'stock', label: '秒杀库存', type: 'number', required: true },
          { key: 'startTime', label: '秒杀开始时间', type: 'datetime', required: true },
          { key: 'endTime', label: '秒杀结束时间', type: 'datetime', required: true },
          { key: 'limitPerUser', label: '每人限购数量', type: 'number', required: false },
        ],
      },
    },

    // 4. 满减活动
    {
      code: 'FULL_REDUCTION',
      name: '满减活动',
      unitName: '元',
      ruleSchema: {
        fields: [
          { key: 'threshold', label: '满减门槛金额', type: 'number', required: true },
          { key: 'reduction', label: '减免金额', type: 'number', required: true },
          { key: 'startTime', label: '活动开始时间', type: 'datetime', required: false },
          { key: 'endTime', label: '活动结束时间', type: 'datetime', required: false },
        ],
      },
    },

    // 5. 会员升级
    {
      code: 'MEMBER_UPGRADE',
      name: '会员升级',
      unitName: '个',
      ruleSchema: {
        fields: [
          { key: 'price', label: '会员价格', type: 'number', required: true },
          { key: 'validDays', label: '会员有效期(天)', type: 'number', required: true },
          { key: 'commission', label: '推荐佣金比例(%)', type: 'number', required: false },
          { key: 'benefits', label: '会员权益说明', type: 'string', required: false },
        ],
      },
    },
  ];

  // 批量创建模板
  let successCount = 0;
  for (const template of templates) {
    try {
      await prisma.playTemplate.create({
        data: template,
      });
      console.log(`   ✅ ${template.name} (${template.code})`);
      successCount++;
    } catch (error: any) {
      console.error(`   ❌ 创建 ${template.name} 失败:`, error.message);
    }
  }

  console.log(`\n   成功创建 ${successCount}/${templates.length} 个模板\n`);

  // ==========================================
  // 第五步：验证结果
  // ==========================================
  console.log('🔍 第五步：验证结果...\n');
  
  const stats = {
    templates: await prisma.playTemplate.count(),
    configs: await prisma.storePlayConfig.count(),
    instances: await prisma.playInstance.count(),
  };

  console.log('📊 当前系统状态：');
  console.log(`   营销模板: ${stats.templates} 个`);
  console.log(`   门店配置: ${stats.configs} 个`);
  console.log(`   营销实例: ${stats.instances} 个\n`);

  // 显示所有模板详情
  const allTemplates = await prisma.playTemplate.findMany({
    orderBy: { code: 'asc' },
  });

  console.log('📋 营销玩法模板列表：\n');
  allTemplates.forEach((template, index) => {
    console.log(`   ${index + 1}. ${template.name} (${template.code})`);
    console.log(`      单位: ${template.unitName}`);
    console.log(`      字段数: ${(template.ruleSchema as any)?.fields?.length || 0}`);
    console.log('');
  });

  console.log('🎉 营销系统重置完成！\n');
  
  rl.close();
}

main()
  .catch((e) => {
    console.error('\n❌ 脚本执行失败:', e);
    rl.close();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
