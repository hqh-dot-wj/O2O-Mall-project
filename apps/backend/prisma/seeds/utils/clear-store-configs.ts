import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  清除所有门店营销配置...\n');

  // 删除所有门店营销配置
  const result = await prisma.storePlayConfig.deleteMany({});
  
  console.log(`✅ 已删除 ${result.count} 个门店营销配置\n`);
  
  // 验证
  const remaining = await prisma.storePlayConfig.count();
  console.log(`📊 剩余配置: ${remaining} 个\n`);
  
  if (remaining === 0) {
    console.log('🎉 清除完成！\n');
  } else {
    console.log('⚠️  仍有配置未删除\n');
  }
}

main()
  .catch((e) => {
    console.error('❌ 执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
