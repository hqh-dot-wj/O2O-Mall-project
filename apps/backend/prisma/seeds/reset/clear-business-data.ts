/**
 * 清理业务数据，保留系统基础数据
 *
 * 删除：会员、订单、分佣、营销、商品、购物车等业务表数据
 * 保留：sys_tenant、sys_user、sys_role、sys_menu、sys_dict、sys_config、sys_client、
 *       sys_dept、sys_post、sys_tenant_package、role_menu、user_role、user_post、role_dept 等
 *
 * 运行方式:
 *   cd apps/backend && npx tsx prisma/seeds/reset/clear-business-data.ts
 *
 * 或从根目录:
 *   pnpm exec tsx apps/backend/prisma/seeds/reset/clear-business-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始清理业务数据...');

  // 按外键依赖顺序删除，子表在前

  // 1. 金融/分佣
  console.log('清理分佣/金融数据...');
  await prisma.finCommission.deleteMany();
  await prisma.finTransaction.deleteMany();
  await prisma.finWithdrawal.deleteMany();
  await prisma.finUserDailyQuota.deleteMany();
  await prisma.finSettlementLog.deleteMany();
  await prisma.finWallet.deleteMany();

  // 2. 订单
  console.log('清理订单数据...');
  await prisma.omsOrderItem.deleteMany();
  await prisma.omsOrder.deleteMany();
  await prisma.omsCartItem.deleteMany();

  // 3. 营销 - 用户相关
  console.log('清理营销数据...');
  await prisma.mktCouponUsage.deleteMany();
  await prisma.mktUserCoupon.deleteMany();
  await prisma.mktPointsTransaction.deleteMany();
  await prisma.mktUserTaskCompletion.deleteMany();
  await prisma.mktPointsGrantFailure.deleteMany();
  await prisma.mktPointsAccount.deleteMany();

  // MaaS 营销履约
  await prisma.mktUserAsset.deleteMany();

  // 4. 商品/库存
  console.log('清理商品/库存数据...');
  await prisma.pmsStockLog.deleteMany();
  await prisma.pmsTenantSku.deleteMany();
  await prisma.pmsTenantProduct.deleteMany();
  await prisma.pmsGlobalSku.deleteMany();
  await prisma.pmsProductAttrValue.deleteMany();
  await prisma.pmsProduct.deleteMany();

  // 5. 会员相关（需在会员主表前删除有外键的表）
  console.log('清理会员相关数据...');
  await prisma.umsAddress.deleteMany();
  await prisma.umsUpgradeApply.deleteMany();
  await prisma.umsReferralCode.deleteMany();

  // SrvWorker 及子表（依赖 memberId，按外键顺序）
  await prisma.srvWorkerSchedule.deleteMany();
  await prisma.srvWorkerWork.deleteMany();
  await prisma.srvWorkerSkill.deleteMany();
  await prisma.srvWorkerCert.deleteMany();
  await prisma.srvWorkerProfile.deleteMany();
  await prisma.srvWorker.deleteMany();

  await prisma.sysSocialUser.deleteMany();

  // 区域代理商绑定（可选 memberId）
  await prisma.sysRegionAgent.deleteMany();

  await prisma.umsMember.deleteMany();

  // 6. 营销模板/规则（无会员依赖的可选保留，按需清理）
  console.log('清理营销模板/规则...');
  await prisma.mktCouponTemplate.deleteMany();
  await prisma.mktPointsTask.deleteMany();
  await prisma.mktPointsRule.deleteMany();

  // 7. 商品基础数据（类目/品牌 - 按需清理）
  console.log('清理商品类目/品牌...');
  await prisma.pmsCategory.deleteMany();
  await prisma.pmsBrand.deleteMany();

  console.log('✅ 业务数据清理完成。系统基础数据（租户、用户、角色、菜单等）已保留。');
}

main()
  .catch((e) => {
    console.error('清理失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
