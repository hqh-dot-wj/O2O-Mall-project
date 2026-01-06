import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();

async function main() {
  Logger.log('🔍 查询验证码配置...', 'CaptchaConfig');

  const configs = await prisma.sysConfig.findMany({
    where: {
      configKey: 'sys.account.captchaEnabled'
    },
    orderBy: {
      tenantId: 'asc'
    }
  });

  Logger.log('找到的配置记录:', 'CaptchaConfig');
  configs.forEach(config => {
    Logger.log(`租户ID: ${config.tenantId}`, 'CaptchaConfig');
    Logger.log(`配置ID: ${config.configId}`, 'CaptchaConfig');
    Logger.log(`配置值: ${config.configValue}`, 'CaptchaConfig');
    Logger.log(`状态: ${config.status}`, 'CaptchaConfig');
    Logger.log(`删除标记: ${config.delFlag}`, 'CaptchaConfig');
    Logger.log('---', 'CaptchaConfig');
  });

  Logger.log(`总计: ${configs.length} 条记录`, 'CaptchaConfig');
}

main()
  .catch((e) => {
    Logger.error(e, 'CaptchaConfig');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
