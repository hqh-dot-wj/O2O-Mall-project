import { PrismaClient } from '@prisma/client';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();

async function main() {
  Logger.log('🔍 测试多租户验证码配置问题...', 'DebugCaptcha');

  // 检查是否有多个租户的配置
  const allConfigs = await prisma.sysConfig.findMany({
    select: {
      tenantId: true
    },
    distinct: ['tenantId'],
    orderBy: {
      tenantId: 'asc'
    }
  });

  Logger.log(`所有有配置的租户: ${allConfigs.map(c => c.tenantId).join(', ')}`, 'DebugCaptcha');

  // 查询所有验证码配置
  const configs = await prisma.sysConfig.findMany({
    where: {
      configKey: 'sys.account.captchaEnabled'
    },
    orderBy: {
      tenantId: 'asc'
    }
  });

  Logger.log('验证码配置:', 'DebugCaptcha');
  configs.forEach(config => {
    Logger.log(`  租户: ${config.tenantId}, 值: ${config.configValue}, 状态: ${config.status}`, 'DebugCaptcha');
  });

  Logger.log('📋 缓存键分析:', 'DebugCaptcha');
  Logger.log('  当前缓存键格式: SYS_CONFIG:{configKey}', 'DebugCaptcha');
  Logger.log('  问题: 没有包含 tenantId，导致不同租户共享同一个缓存', 'DebugCaptcha');
  Logger.log('  建议: 改为 SYS_CONFIG:{tenantId}:{configKey}', 'DebugCaptcha');
}

main()
  .catch((e) => {
    Logger.error(e, 'DebugCaptcha');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
