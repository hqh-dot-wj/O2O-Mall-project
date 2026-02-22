import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

async function test() {
  const prisma = new PrismaClient();

  try {
    Logger.log('测试系统配置表查询...', 'TestDirect');

    // 测试1: 直接查询
    const config = await prisma.$queryRaw`
      SELECT config_key, config_value 
      FROM sys_system_config 
      WHERE config_key = 'sys.account.captchaEnabled'
        AND del_flag = '0'
        AND status = '0'
      LIMIT 1
    `;

    Logger.log(`查询结果: ${JSON.stringify(config)}`, 'TestDirect');

    // 测试2: 多次查询验证稳定性
    Logger.log('稳定性测试:', 'TestDirect');
    for (let i = 1; i <= 10; i++) {
      const result = await prisma.$queryRaw<Array<{ config_value: string }>>`
        SELECT config_value 
        FROM sys_system_config 
        WHERE config_key = 'sys.account.captchaEnabled'
          AND del_flag = '0'
          AND status = '0'
        LIMIT 1
      `;
      Logger.log(`  请求 ${i}: ${result[0]?.config_value || 'null'}`, 'TestDirect');
    }

  } catch (error) {
    Logger.error('测试失败:', error, 'TestDirect');
  } finally {
    await prisma.$disconnect();
  }
}

test();
