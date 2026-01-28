/**
 * 字典数据同步工具 (Dictionary Sync script)
 * 
 * 功能说明：
 * 1. 自动将代码中的 TypeScript 枚举同步到数据库的 SysDictData 表。
 * 2. 如果数据库中不存在对应的字典类型 (DictType)，则会自动创建。
 * 3. 保持代码枚举 (Enum) 作为“唯一事实来源”，确保前后端语义一致。
 * 
 * 使用方式：
 * pnpm ts-node scripts/sync-dict.ts
 */

import { PrismaClient, Status } from '@prisma/client';
import * as AllEnums from '../libs/common-types/src/enum';

const prisma = new PrismaClient();

/**
 * 字典定义映射配置
 * 在此处定义代码枚举与数据库字典的对应关系
 */
const DICT_CONFIG = [
  // --- 系统基础类 ---
  {
    type: 'sys_status',
    name: '系统启用状态',
    enum: AllEnums.StatusEnum,
    labels: { NORMAL: '正常', STOP: '停用' },
    colors: { NORMAL: 'success', STOP: 'danger' }
  },
  {
    type: 'sys_user_gender',
    name: '用户性别',
    enum: AllEnums.GenderEnum,
    labels: { UNKNOWN: '未知', MALE: '男', FEMALE: '女' },
    colors: { UNKNOWN: 'default', MALE: 'info', FEMALE: 'error' }
  },
  {
    type: 'sys_audit_status',
    name: '审核状态',
    enum: AllEnums.AuditStatusEnum,
    labels: { PENDING: '待审核', APPROVED: '通过', REJECTED: '驳回' },
    colors: { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' }
  },
  {
    type: 'sys_media_type',
    name: '媒体类型',
    enum: AllEnums.MediaTypeEnum,
    labels: { IMAGE: '图片', VIDEO: '视频' }
  },

  // --- 业务核心类 ---
  {
    type: 'sys_member_status',
    name: '会员状态',
    enum: AllEnums.MemberStatusEnum,
    labels: { NORMAL: '正常', DISABLED: '禁用' },
    colors: { NORMAL: 'success', DISABLED: 'danger' }
  },
  {
    type: 'sys_worker_status',
    name: '技师工作状态',
    enum: AllEnums.WorkerStatusEnum,
    labels: { WORKING: '接单中', RESTING: '休息中', FROZEN: '已冻结', RESIGNED: '已离职' },
    colors: { WORKING: 'success', RESTING: 'warning', FROZEN: 'error', RESIGNED: 'default' }
  },
  {
    type: 'sys_worker_level',
    name: '技师等级',
    enum: AllEnums.WorkerLevelEnum,
    labels: { PRIMARY: '初级', MIDDLE: '中级', SENIOR: '高级', GOLD: '金牌' },
    colors: { PRIMARY: 'default', MIDDLE: 'info', SENIOR: 'warning', GOLD: 'error' }
  },
  {
    type: 'sys_skill_level',
    name: '技能熟练度',
    enum: AllEnums.SkillLevelEnum,
    labels: { GENERAL: '一般', MASTER: '精通' }
  },
  {
    type: 'sys_wage_type',
    name: '薪资结算方式',
    enum: AllEnums.WageTypeEnum,
    labels: { HOURLY: '时薪制', PERCENTAGE: '分成制', FIXED: '一口价' }
  },

  // --- 订单交易类 ---
  {
    type: 'sys_order_status',
    name: '订单状态',
    enum: AllEnums.OrderStatusEnum,
    labels: { 
      PENDING_PAY: '待支付', 
      PAID: '已支付/待服务', 
      SHIPPED: '服务中/已发货', 
      COMPLETED: '已完成', 
      CANCELLED: '已取消', 
      REFUNDED: '已退款' 
    },
    colors: { PENDING_PAY: 'warning', PAID: 'info', SHIPPED: 'primary', COMPLETED: 'success', CANCELLED: 'default', REFUNDED: 'error' }
  },
  {
    type: 'sys_order_type',
    name: '订单类型',
    enum: AllEnums.OrderTypeEnum,
    labels: { PRODUCT: '实物订单', SERVICE: '服务订单', MIXED: '混合订单' }
  },
  {
    type: 'sys_pay_status',
    name: '支付状态',
    enum: AllEnums.PayStatusEnum,
    labels: { UNPAID: '未支付', PAID: '已支付', REFUNDED: '已退款' },
    colors: { UNPAID: 'warning', PAID: 'success', REFUNDED: 'error' }
  }
];

async function sync() {
  console.log('🚀 开始同步字典数据...');

  for (const config of DICT_CONFIG) {
    console.log(`\n正在同步字典类型: ${config.type} (${config.name})...`);

    // 1. 确保字典类型是否存在 (SysDictType)
    // 根据 prisma 定义，联合主键名称为 unique_tenant_dict_type
    await prisma.sysDictType.upsert({
      where: { 
        unique_tenant_dict_type: { 
           tenantId: '000000', 
           dictType: config.type 
        } 
      },
      update: { dictName: config.name },
      create: {
        tenantId: '000000',
        dictName: config.name,
        dictType: config.type,
        status: Status.NORMAL,
        createBy: 'system'
      }
    });

    // 2. 遍历枚举值，同步字典数据 (SysDictData)
    const enumEntries = Object.entries(config.enum);
    
    for (const [key, value] of enumEntries) {
      if (typeof value !== 'string') continue;

      const label = (config.labels as any)?.[key] || key;
      const cssClass = (config.colors as any)?.[key] || 'default';

      console.log(`  - 映射项: ${key} -> ${value} (${label})`);

      // 根据 prisma 定义，联合主键名称为 unique_tenant_dict_data
      await prisma.sysDictData.upsert({
        where: { 
            unique_tenant_dict_data: { 
                tenantId: '000000', 
                dictType: config.type, 
                dictValue: value 
            } 
        },
        update: {
          dictLabel: label,
          cssClass: cssClass,
          dictSort: 0
        },
        create: {
          tenantId: '000000',
          dictSort: 0,
          dictLabel: label,
          dictValue: value,
          dictType: config.type,
          cssClass: cssClass,
          status: Status.NORMAL,
          createBy: 'system'
        }
      });
    }
  }

  console.log('\n✅ 字典同步完成！');
}

sync()
  .catch((e) => {
    console.error('❌ 同步失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
