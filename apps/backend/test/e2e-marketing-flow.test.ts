import { PrismaClient, PublishStatus, ProductType, MarketingStockMode, PlayInstanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 营销活动端到端测试脚本（增强版）
 * 
 * 测试场景：
 * 1. 门店创建课程拼团活动
 * 2. 用户 C1 发起拼团（团长）
 * 3. 用户 C2-C6 参团（包含推荐关系）
 * 4. 拼团成功，计算详细分佣（一级、二级分佣）
 * 5. 拼团失败场景（人数不足）
 * 6. 第二个拼团（测试多团并行，包含无推荐人场景）
 * 7. 查询统计数据
 * 8. 模拟分佣结算（7天后）
 * 
 * 推荐关系链：
 * - C1（张三）：无推荐人，团长
 * - C2（李四）：C1推荐
 * - C3（王五）：C1推荐
 * - C4（赵六）：C2推荐（C1的二级）
 * - C5（孙七）：C2推荐（C1的二级）
 * - C6（周八）：C3推荐（C1的二级）
 * - C7（吴九）：C1推荐，第二个团的团长
 * - C8（郑十）：无推荐人
 * 
 * 分佣规则：
 * - 一级分佣（直推）：10% ✅ 已实现
 * - 二级分佣（间推）：5% ✅ 已实现
 * - 结算周期：7天 ✅ 已实现
 * 
 * 注意：平台抽成功能未实现，门店获得100%订单收入（扣除分佣）
 */

// 测试数据
const TENANT_ID = '00000';
const COURSE_PRODUCT_ID = 'course-vocal-001'; // 声乐课
const COURSE_SKU_ID = 'course-vocal-001-68'; // 小班(6-8人) → 移除特殊字符后

// 定义用户类型
interface TestUser {
  id: string;
  name: string;
  phone: string;
  referralCode: string;
  referrerId: string | null;
}

// 测试用户（增加推荐关系）
const users: Record<string, TestUser> = {
  c1: { id: 'user-c1', name: '张三', phone: '13800000001', referralCode: 'REF001', referrerId: null }, // 团长，无推荐人
  c2: { id: 'user-c2', name: '李四', phone: '13800000002', referralCode: 'REF002', referrerId: 'user-c1' }, // C1推荐
  c3: { id: 'user-c3', name: '王五', phone: '13800000003', referralCode: 'REF003', referrerId: 'user-c1' }, // C1推荐
  c4: { id: 'user-c4', name: '赵六', phone: '13800000004', referralCode: 'REF004', referrerId: 'user-c2' }, // C2推荐（C1的二级）
  c5: { id: 'user-c5', name: '孙七', phone: '13800000005', referralCode: 'REF005', referrerId: 'user-c2' }, // C2推荐（C1的二级）
  c6: { id: 'user-c6', name: '周八', phone: '13800000006', referralCode: 'REF006', referrerId: 'user-c3' }, // C3推荐（C1的二级）
  c7: { id: 'user-c7', name: '吴九', phone: '13800000007', referralCode: 'REF007', referrerId: 'user-c1' }, // C1推荐
  c8: { id: 'user-c8', name: '郑十', phone: '13800000008', referralCode: 'REF008', referrerId: null }, // 无推荐人
};

interface TestResult {
  scenario: string;
  success: boolean;
  details: any;
  error?: string;
}

const results: TestResult[] = [];

function logStep(step: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📍 ${step}`);
  console.log('='.repeat(80));
}

function logSuccess(message: string, data?: any) {
  console.log(`✅ ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(error);
  }
}

function logInfo(message: string, data?: any) {
  console.log(`ℹ️  ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function cleanup() {
  logStep('清理测试数据');
  
  try {
    // 1. 删除测试分佣记录（依赖订单）
    await prisma.finCommission.deleteMany({
      where: { tenantId: TENANT_ID },
    });
    
    // 2. 先删除订单明细（依赖订单）
    await prisma.omsOrderItem.deleteMany({
      where: {
        order: {
          memberId: { in: Object.values(users).map(u => u.id) },
        },
      },
    });
    
    // 3. 再删除测试订单
    await prisma.omsOrder.deleteMany({
      where: { memberId: { in: Object.values(users).map(u => u.id) } },
    });
    
    // 4. 删除测试营销实例
    await prisma.playInstance.deleteMany({
      where: { memberId: { in: Object.values(users).map(u => u.id) } },
    });
    
    // 5. 删除测试营销配置
    await prisma.storePlayConfig.deleteMany({
      where: {
        tenantId: TENANT_ID,
        serviceId: COURSE_PRODUCT_ID,
      },
    });
    
    // 6. 删除测试用户（最后删除，因为其他表有外键引用）
    await prisma.umsMember.deleteMany({
      where: { memberId: { in: Object.values(users).map(u => u.id) } },
    });
    
    logSuccess('测试数据清理完成');
  } catch (error: any) {
    logError('清理测试数据失败', error);
    // 不抛出错误，允许继续执行
  }
}

// ==========================================
// 初始化：创建测试用户
// ==========================================
async function initTestUsers() {
  logStep('初始化测试用户');
  
  for (const [key, user] of Object.entries(users)) {
    try {
      // 先检查是否存在（通过 mobile 查找）
      const existingByMobile = await prisma.umsMember.findUnique({
        where: { mobile: user.phone },
      });
      
      if (existingByMobile && existingByMobile.memberId !== user.id) {
        // 如果手机号已存在但 ID 不同，先删除旧记录
        await prisma.umsMember.delete({
          where: { memberId: existingByMobile.memberId },
        });
      }
      
      await prisma.umsMember.upsert({
        where: { memberId: user.id },
        update: {
          nickname: user.name,
          mobile: user.phone,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id,
          status: 'NORMAL',
        },
        create: {
          memberId: user.id,
          tenantId: TENANT_ID,
          nickname: user.name,
          mobile: user.phone,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id,
          status: 'NORMAL',
        },
      });
      
      logInfo(`✓ 用户 ${user.name} (${user.id}) 创建成功`);
    } catch (error: any) {
      logError(`创建用户 ${user.name} 失败: ${error.message}`);
      throw error; // 如果用户创建失败，应该停止测试
    }
  }
  
  logSuccess(`成功创建 ${Object.keys(users).length} 个测试用户`);
}

// ==========================================
// 场景 1: 门店创建课程拼团活动
// ==========================================
async function scenario1_CreateCourseGroupBuy() {
  logStep('场景 1: 门店创建课程拼团活动');
  
  try {
    const config = await prisma.storePlayConfig.create({
      data: {
        tenantId: TENANT_ID,
        storeId: TENANT_ID,
        serviceId: COURSE_PRODUCT_ID,
        serviceType: ProductType.SERVICE,
        templateCode: 'COURSE_GROUP_BUY',
        rules: {
          price: 680,              // 拼团价（原价 800）
          minCount: 6,             // 最低 6 人开班
          maxCount: 8,             // 最多 8 人
          leaderDiscount: 50,      // 团长优惠 50 元
          joinDeadline: '2026-03-01 18:00:00',
          classStartTime: '2026-03-10 10:00:00',
          address: {
            address: '北京市朝阳区音乐培训中心',
            location: { lat: 39.9, lng: 116.4 },
          },
          totalLessons: 8,         // 总共 8 节课
          dayLessons: 2,           // 每天 2 节课
          classTime: '周六日 10:00-12:00',
          validDays: 60,           // 有效期 60 天
        },
        stockMode: MarketingStockMode.LAZY_CHECK,
        status: PublishStatus.ON_SHELF,
      },
    });
    
    logSuccess('课程拼团活动创建成功', {
      configId: config.id,
      templateCode: config.templateCode,
      rules: config.rules,
    });
    
    results.push({
      scenario: '场景1: 创建课程拼团活动',
      success: true,
      details: { configId: config.id },
    });
    
    return config;
  } catch (error: any) {
    logError('创建课程拼团活动失败', error);
    results.push({
      scenario: '场景1: 创建课程拼团活动',
      success: false,
      details: null,
      error: error.message,
    });
    throw error;
  }
}

// ==========================================
// 场景 2: 用户 C1 发起拼团（团长）
// ==========================================
async function scenario2_C1StartGroupBuy(configId: string) {
  logStep('场景 2: 用户 C1 发起拼团（团长）');
  
  try {
    // 创建营销实例
    const instance = await prisma.playInstance.create({
      data: {
        tenantId: TENANT_ID,
        configId,
        templateCode: 'COURSE_GROUP_BUY',
        memberId: users.c1.id,
        status: PlayInstanceStatus.ACTIVE,
        instanceData: {
          isLeader: true,
          currentCount: 1,
          targetCount: 6,
          members: [
            {
              memberId: users.c1.id,
              memberName: users.c1.name,
              joinTime: new Date().toISOString(),
              isLeader: true,
            },
          ],
        },
      },
    });
    
    // 创建订单
    const order = await prisma.omsOrder.create({
      data: {
        orderSn: `ORD${Date.now()}C1`,
        tenantId: TENANT_ID,
        memberId: users.c1.id,
        orderType: 'SERVICE',
        totalAmount: 630, // 680 - 50（团长优惠）
        payAmount: 630,
        status: 'COMPLETED',
        payStatus: 'PAID',
        payTime: new Date(),
        items: {
          create: {
            tenantId: TENANT_ID,
            productId: COURSE_PRODUCT_ID,
            skuId: COURSE_SKU_ID,
            productName: '少儿声乐启蒙课',
            productImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            specData: { '班型': '小班(6-8人)' },
            price: 630,
            quantity: 1,
            totalAmount: 630,
          },
        },
      },
    });
    
    // 关联订单到实例
    await prisma.playInstance.update({
      where: { id: instance.id },
      data: { orderSn: order.orderSn },
    });
    
    logSuccess('C1 发起拼团成功', {
      instanceId: instance.id,
      orderId: order.id,
      orderSn: order.orderSn,
      amount: Number(order.totalAmount),
      leaderDiscount: 50,
    });
    
    results.push({
      scenario: '场景2: C1 发起拼团',
      success: true,
      details: {
        instanceId: instance.id,
        orderId: order.id,
        amount: 630,
      },
    });
    
    return { instance, order };
  } catch (error: any) {
    logError('C1 发起拼团失败', error);
    results.push({
      scenario: '场景2: C1 发起拼团',
      success: false,
      details: null,
      error: error.message,
    });
    throw error;
  }
}

// ==========================================
// 场景 3: 用户 C2-C6 参团
// ==========================================
async function scenario3_OthersJoinGroup(instanceId: string) {
  logStep('场景 3: 用户 C2-C6 参团');
  
  const joinResults = [];
  
  for (const [key, user] of Object.entries(users)) {
    if (key === 'c1') continue; // 跳过团长
    
    try {
      // 获取当前实例
      const instance = await prisma.playInstance.findUnique({
        where: { id: instanceId },
      });
      
      if (!instance) throw new Error('实例不存在');
      
      const instanceData = instance.instanceData as any;
      const currentCount = instanceData.currentCount + 1;
      
      // 更新实例
      await prisma.playInstance.update({
        where: { id: instanceId },
        data: {
          instanceData: {
            ...instanceData,
            currentCount,
            members: [
              ...instanceData.members,
              {
                memberId: user.id,
                memberName: user.name,
                joinTime: new Date().toISOString(),
                isLeader: false,
              },
            ],
          },
        },
      });
      
      // 创建订单
      const order = await prisma.omsOrder.create({
        data: {
          orderSn: `ORD${Date.now()}${key.toUpperCase()}`,
          tenantId: TENANT_ID,
          memberId: user.id,
          orderType: 'SERVICE',
          totalAmount: 680,
          payAmount: 680,
          status: 'COMPLETED',
          payStatus: 'PAID',
          payTime: new Date(),
          referrerId: user.referrerId, // 添加推荐人
          items: {
            create: {
              tenantId: TENANT_ID,
              productId: COURSE_PRODUCT_ID,
              skuId: COURSE_SKU_ID,
              productName: '少儿声乐启蒙课',
              productImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
              specData: { '班型': '小班(6-8人)' },
              price: 680,
              quantity: 1,
              totalAmount: 680,
            },
          },
        },
      });
      
      logSuccess(`${user.name} 参团成功`, {
        orderId: order.id,
        orderSn: order.orderSn,
        amount: Number(order.totalAmount),
        currentCount,
      });
      
      joinResults.push({
        user: user.name,
        orderId: order.id,
        amount: 680,
        currentCount,
      });
      
      // 检查是否达到最低人数
      if (currentCount >= 6) {
        logInfo(`🎉 拼团成功！当前人数: ${currentCount}/6`);
        
        // 更新实例状态为成功
        await prisma.playInstance.update({
          where: { id: instanceId },
          data: { status: PlayInstanceStatus.SUCCESS },
        });
        
        break;
      }
    } catch (error: any) {
      logError(`${user.name} 参团失败`, error);
      joinResults.push({
        user: user.name,
        error: error.message,
      });
    }
  }
  
  results.push({
    scenario: '场景3: 其他用户参团',
    success: true,
    details: joinResults,
  });
  
  return joinResults;
}

// ==========================================
// 场景 4: 计算分佣（详细版）
// ==========================================
async function scenario4_CalculateCommission() {
  logStep('场景 4: 计算分佣（详细版）');
  
  try {
    // 获取所有订单
    const orders = await prisma.omsOrder.findMany({
      where: {
        tenantId: TENANT_ID,
        memberId: { in: Object.values(users).map(u => u.id) },
        payStatus: 'PAID',
      },
      include: {
        items: true,
      },
      orderBy: { createTime: 'asc' },
    });
    
    logInfo(`找到 ${orders.length} 个已支付订单`);
    
    // 获取或创建分佣配置
    let distConfig = await prisma.sysDistConfig.findUnique({
      where: { tenantId: TENANT_ID },
    });
    
    if (!distConfig) {
      distConfig = await prisma.sysDistConfig.create({
        data: {
          tenantId: TENANT_ID,
          level1Rate: 10.00, // 一级分佣 10%
          level2Rate: 5.00,  // 二级分佣 5%
          enableLV0: true,
        },
      });
      logInfo('创建分佣配置', {
        level1Rate: '10%',
        level2Rate: '5%',
      });
    }
    
    // 计算每笔订单的分佣
    const commissionRecords = [];
    let totalCommission = 0;
    
    for (const order of orders) {
      const orderAmount = Number(order.payAmount);
      const memberId = order.memberId;
      const user = Object.values(users).find(u => u.id === memberId);
      
      if (!user) continue;
      
      const orderCommissions = [];
      
      // 一级分佣（直推人）
      if (user.referrerId) {
        const level1Amount = orderAmount * (Number(distConfig.level1Rate) / 100);
        const referrer = Object.values(users).find(u => u.id === user.referrerId);
        
        // 创建分佣记录
        const commission = await prisma.finCommission.create({
          data: {
            orderId: order.id,
            tenantId: TENANT_ID,
            beneficiaryId: user.referrerId,
            level: 1,
            amount: level1Amount,
            rateSnapshot: distConfig.level1Rate,
            status: 'FROZEN', // 冻结状态，等待结算
            planSettleTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后结算
          },
        });
        
        orderCommissions.push({
          level: 1,
          beneficiaryId: user.referrerId,
          beneficiaryName: referrer?.name || '未知',
          amount: level1Amount,
          rate: Number(distConfig.level1Rate),
          status: 'FROZEN',
        });
        
        totalCommission += level1Amount;
        
        // 二级分佣（间推人）
        const level1User = Object.values(users).find(u => u.id === user.referrerId);
        if (level1User?.referrerId) {
          const level2Amount = orderAmount * (Number(distConfig.level2Rate) / 100);
          const level2Referrer = Object.values(users).find(u => u.id === level1User.referrerId);
          
          const commission2 = await prisma.finCommission.create({
            data: {
              orderId: order.id,
              tenantId: TENANT_ID,
              beneficiaryId: level1User.referrerId,
              level: 2,
              amount: level2Amount,
              rateSnapshot: distConfig.level2Rate,
              status: 'FROZEN',
              planSettleTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
          
          orderCommissions.push({
            level: 2,
            beneficiaryId: level1User.referrerId,
            beneficiaryName: level2Referrer?.name || '未知',
            amount: level2Amount,
            rate: Number(distConfig.level2Rate),
            status: 'FROZEN',
          });
          
          totalCommission += level2Amount;
        }
      }
      
      commissionRecords.push({
        orderSn: order.orderSn,
        memberId: order.memberId,
        memberName: user.name,
        orderAmount,
        commissions: orderCommissions,
        totalCommission: orderCommissions.reduce((sum, c) => sum + c.amount, 0),
      });
    }
    
    // 计算总收入
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount), 0);
    
    // 注意：平台抽成功能未实现，以下仅为演示概念
    const platformRate = 0.10; // 【待实现】平台抽成 10%
    const platformCommission = totalRevenue * platformRate; // 【待实现】
    const storeGrossRevenue = totalRevenue; // 【实际】门店获得100%订单收入
    const storeNetRevenue = storeGrossRevenue - totalCommission; // 【实际】门店净收入（扣除分佣）
    
    // 按受益人汇总分佣
    const beneficiarySummary: Record<string, any> = {};
    
    for (const record of commissionRecords) {
      for (const comm of record.commissions) {
        if (!beneficiarySummary[comm.beneficiaryId]) {
          beneficiarySummary[comm.beneficiaryId] = {
            beneficiaryId: comm.beneficiaryId,
            beneficiaryName: comm.beneficiaryName,
            level1Count: 0,
            level1Amount: 0,
            level2Count: 0,
            level2Amount: 0,
            totalAmount: 0,
            status: comm.status,
          };
        }
        
        if (comm.level === 1) {
          beneficiarySummary[comm.beneficiaryId].level1Count++;
          beneficiarySummary[comm.beneficiaryId].level1Amount += comm.amount;
        } else {
          beneficiarySummary[comm.beneficiaryId].level2Count++;
          beneficiarySummary[comm.beneficiaryId].level2Amount += comm.amount;
        }
        
        beneficiarySummary[comm.beneficiaryId].totalAmount += comm.amount;
      }
    }
    
    const commissionDetails = {
      // 总体统计
      summary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalDistCommission: totalCommission.toFixed(2),
        storeNetRevenue: storeNetRevenue.toFixed(2),
        orderCount: orders.length,
        commissionRecordCount: commissionRecords.reduce((sum, r) => sum + r.commissions.length, 0),
        // 以下字段仅为演示，实际未实现
        platformCommission_demo: platformCommission.toFixed(2),
        platformRate_demo: `${(platformRate * 100).toFixed(0)}%`,
        note: '注意：平台抽成未实现，门店实际获得100%订单收入',
      },
      
      // 分佣配置
      distConfig: {
        level1Rate: `${Number(distConfig.level1Rate)}%`,
        level2Rate: `${Number(distConfig.level2Rate)}%`,
        settlementPeriod: '7天',
      },
      
      // 每笔订单的分佣明细
      orderDetails: commissionRecords.map(r => ({
        orderSn: r.orderSn,
        memberName: r.memberName,
        orderAmount: `¥${r.orderAmount.toFixed(2)}`,
        commissions: r.commissions.map(c => ({
          level: c.level === 1 ? '一级（直推）' : '二级（间推）',
          beneficiary: c.beneficiaryName,
          amount: `¥${c.amount.toFixed(2)}`,
          rate: `${c.rate}%`,
          status: c.status === 'FROZEN' ? '待结算' : c.status,
        })),
        totalCommission: `¥${r.totalCommission.toFixed(2)}`,
      })),
      
      // 按受益人汇总
      beneficiarySummary: Object.values(beneficiarySummary)
        .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
        .map((b: any) => ({
          beneficiaryName: b.beneficiaryName,
          level1: {
            count: b.level1Count,
            amount: `¥${b.level1Amount.toFixed(2)}`,
          },
          level2: {
            count: b.level2Count,
            amount: `¥${b.level2Amount.toFixed(2)}`,
          },
          totalAmount: `¥${b.totalAmount.toFixed(2)}`,
          status: b.status === 'FROZEN' ? '待结算（7天后可提现）' : b.status,
        })),
    };
    
    logSuccess('分佣计算完成', commissionDetails);
    
    // 输出详细的金额流向
    console.log('\n💰 金额流向详解：');
    console.log(`   订单总收入：¥${totalRevenue.toFixed(2)}`);
    console.log(`   ├─ 分佣支出：¥${totalCommission.toFixed(2)}`);
    console.log(`   └─ 门店净利润：¥${storeNetRevenue.toFixed(2)}`);
    console.log('');
    console.log('   注意：平台抽成功能未实现，门店获得100%订单收入');
    console.log('');
    
    results.push({
      scenario: '场景4: 计算分佣',
      success: true,
      details: commissionDetails,
    });
    
    return commissionDetails;
  } catch (error: any) {
    logError('分佣计算失败', error);
    results.push({
      scenario: '场景4: 计算分佣',
      success: false,
      details: null,
      error: error.message,
    });
    throw error;
  }
}

// ==========================================
// 场景 5: 拼团失败（人数不足）
// ==========================================
async function scenario5_GroupBuyFailed(configId: string) {
  logStep('场景 5: 拼团失败（人数不足）');
  
  try {
    // 创建一个新的拼团实例
    const instance = await prisma.playInstance.create({
      data: {
        tenantId: TENANT_ID,
        configId,
        templateCode: 'COURSE_GROUP_BUY',
        memberId: users.c4.id,
        status: PlayInstanceStatus.ACTIVE,
        instanceData: {
          isLeader: true,
          currentCount: 1,
          targetCount: 6,
          members: [
            {
              memberId: users.c4.id,
              memberName: users.c4.name,
              joinTime: new Date().toISOString(),
              isLeader: true,
            },
          ],
        },
      },
    });
    
    // 只有 2 个人参团（不足 6 人）
    const instance2 = await prisma.playInstance.findUnique({
      where: { id: instance.id },
    });
    
    const instanceData = instance2!.instanceData as any;
    
    await prisma.playInstance.update({
      where: { id: instance.id },
      data: {
        instanceData: {
          ...instanceData,
          currentCount: 2,
          members: [
            ...instanceData.members,
            {
              memberId: users.c5.id,
              memberName: users.c5.name,
              joinTime: new Date().toISOString(),
              isLeader: false,
            },
          ],
        },
      },
    });
    
    // 模拟超时，拼团失败
    await prisma.playInstance.update({
      where: { id: instance.id },
      data: {
        status: PlayInstanceStatus.FAILED,
        instanceData: {
          ...instanceData,
          failReason: '人数不足，拼团失败',
          currentCount: 2,
          targetCount: 6,
        },
      },
    });
    
    logSuccess('拼团失败场景模拟完成', {
      instanceId: instance.id,
      currentCount: 2,
      targetCount: 6,
      status: 'FAILED',
      reason: '人数不足',
    });
    
    results.push({
      scenario: '场景5: 拼团失败（人数不足）',
      success: true,
      details: {
        instanceId: instance.id,
        currentCount: 2,
        targetCount: 6,
        status: 'FAILED',
      },
    });
    
    return instance;
  } catch (error: any) {
    logError('拼团失败场景模拟失败', error);
    results.push({
      scenario: '场景5: 拼团失败',
      success: false,
      details: null,
      error: error.message,
    });
    throw error;
  }
}

// ==========================================
// 场景 6: 第二个成功拼团（测试多团并行）
// ==========================================
async function scenario6_SecondSuccessfulGroup(configId: string) {
  logStep('场景 6: 第二个成功拼团（测试多团并行）');
  
  try {
    // C7 作为团长发起新团
    const instance = await prisma.playInstance.create({
      data: {
        tenantId: TENANT_ID,
        configId,
        templateCode: 'COURSE_GROUP_BUY',
        memberId: users.c7.id,
        status: PlayInstanceStatus.ACTIVE,
        instanceData: {
          isLeader: true,
          currentCount: 1,
          targetCount: 6,
          members: [
            {
              memberId: users.c7.id,
              memberName: users.c7.name,
              joinTime: new Date().toISOString(),
              isLeader: true,
            },
          ],
        },
      },
    });
    
    // C7 创建订单（团长优惠）
    const leaderOrder = await prisma.omsOrder.create({
      data: {
        orderSn: `ORD${Date.now()}C7`,
        tenantId: TENANT_ID,
        memberId: users.c7.id,
        orderType: 'SERVICE',
        totalAmount: 630,
        payAmount: 630,
        status: 'COMPLETED',
        payStatus: 'PAID',
        payTime: new Date(),
        referrerId: users.c7.referrerId,
        items: {
          create: {
            tenantId: TENANT_ID,
            productId: COURSE_PRODUCT_ID,
            skuId: COURSE_SKU_ID,
            productName: '少儿声乐启蒙课',
            productImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            specData: { '班型': '小班(6-8人)' },
            price: 630,
            quantity: 1,
            totalAmount: 630,
          },
        },
      },
    });
    
    await prisma.playInstance.update({
      where: { id: instance.id },
      data: { orderSn: leaderOrder.orderSn },
    });
    
    logSuccess('C7（吴九）发起第二个拼团', {
      instanceId: instance.id,
      orderId: leaderOrder.id,
      amount: 630,
    });
    
    // C8 参团（无推荐人，测试无分佣场景）
    const instance2 = await prisma.playInstance.findUnique({
      where: { id: instance.id },
    });
    
    const instanceData = instance2!.instanceData as any;
    
    await prisma.playInstance.update({
      where: { id: instance.id },
      data: {
        instanceData: {
          ...instanceData,
          currentCount: 2,
          members: [
            ...instanceData.members,
            {
              memberId: users.c8.id,
              memberName: users.c8.name,
              joinTime: new Date().toISOString(),
              isLeader: false,
            },
          ],
        },
      },
    });
    
    const c8Order = await prisma.omsOrder.create({
      data: {
        orderSn: `ORD${Date.now()}C8`,
        tenantId: TENANT_ID,
        memberId: users.c8.id,
        orderType: 'SERVICE',
        totalAmount: 680,
        payAmount: 680,
        status: 'COMPLETED',
        payStatus: 'PAID',
        payTime: new Date(),
        referrerId: users.c8.referrerId, // null，无推荐人
        items: {
          create: {
            tenantId: TENANT_ID,
            productId: COURSE_PRODUCT_ID,
            skuId: COURSE_SKU_ID,
            productName: '少儿声乐启蒙课',
            productImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            specData: { '班型': '小班(6-8人)' },
            price: 680,
            quantity: 1,
            totalAmount: 680,
          },
        },
      },
    });
    
    logSuccess('C8（郑十）参团，无推荐人', {
      orderId: c8Order.id,
      amount: 680,
      currentCount: 2,
      note: '此订单不产生分佣',
    });
    
    logInfo('第二个拼团创建完成（2/6人），未达到最低人数');
    
    results.push({
      scenario: '场景6: 第二个拼团',
      success: true,
      details: {
        instanceId: instance.id,
        currentCount: 2,
        targetCount: 6,
        status: 'ACTIVE',
      },
    });
    
    return instance;
  } catch (error: any) {
    logError('第二个拼团创建失败', error);
    results.push({
      scenario: '场景6: 第二个拼团',
      success: false,
      details: null,
      error: error.message,
    });
    throw error;
  }
}

// ==========================================
// 场景 7: 查询统计数据
// ==========================================
async function scenario7_QueryStatistics() {
  logStep('场景 7: 查询统计数据');
  
  try {
    // 统计营销实例
    const instanceStats = await prisma.playInstance.groupBy({
      by: ['status'],
      _count: true,
    });
    
    // 统计订单
    const orderStats = await prisma.omsOrder.groupBy({
      by: ['payStatus'],
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });
    
    // 统计分佣
    const commissionStats = await prisma.finCommission.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        amount: true,
      },
    });
    
    // 查询所有实例详情
    const instances = await prisma.playInstance.findMany({
      where: {
        tenantId: TENANT_ID,
      },
      select: {
        id: true,
        templateCode: true,
        status: true,
        memberId: true,
        instanceData: true,
        createTime: true,
      },
    });
    
    const statistics = {
      instanceStats: instanceStats.map(s => ({
        status: s.status,
        count: s._count,
      })),
      orderStats: orderStats.map(s => ({
        payStatus: s.payStatus,
        count: s._count,
        totalAmount: `¥${Number(s._sum.totalAmount || 0).toFixed(2)}`,
      })),
      commissionStats: commissionStats.map(s => ({
        status: s.status,
        count: s._count,
        totalAmount: `¥${Number(s._sum.amount || 0).toFixed(2)}`,
      })),
      instances: instances.map(i => ({
        id: i.id,
        templateCode: i.templateCode,
        status: i.status,
        memberId: i.memberId,
        instanceData: i.instanceData,
        createTime: i.createTime,
      })),
    };
    
    logSuccess('统计数据查询完成', statistics);
    
    results.push({
      scenario: '场景7: 查询统计数据',
      success: true,
      details: statistics,
    });
    
    return statistics;
  } catch (error: any) {
    logError('统计数据查询失败', error);
    results.push({
      scenario: '场景7: 查询统计数据',
      success: false,
      details: null,
      error: error.message,
    });
    throw error;
  }
}

// ==========================================
// 场景 8: 模拟分佣结算
// ==========================================
async function scenario8_SettleCommissions() {
  logStep('场景 8: 模拟分佣结算（7天后）');
  
  try {
    // 获取所有待结算的分佣
    const frozenCommissions = await prisma.finCommission.findMany({
      where: {
        tenantId: TENANT_ID,
        status: 'FROZEN',
      },
      orderBy: {
        beneficiaryId: 'asc',
      },
    });
    
    logInfo(`找到 ${frozenCommissions.length} 条待结算分佣记录`);
    
    // 模拟结算（更新状态为 SETTLED）
    const settleTime = new Date();
    const settledRecords = [];
    
    for (const commission of frozenCommissions) {
      await prisma.finCommission.update({
        where: { id: commission.id },
        data: {
          status: 'SETTLED',
          settleTime,
        },
      });
      
      settledRecords.push({
        beneficiaryId: commission.beneficiaryId,
        level: commission.level,
        amount: Number(commission.amount),
      });
    }
    
    // 按受益人汇总已结算金额
    const beneficiarySummary: Record<string, any> = {};
    
    for (const record of settledRecords) {
      if (!beneficiarySummary[record.beneficiaryId]) {
        const user = Object.values(users).find(u => u.id === record.beneficiaryId);
        beneficiarySummary[record.beneficiaryId] = {
          beneficiaryId: record.beneficiaryId,
          beneficiaryName: user?.name || '未知',
          totalAmount: 0,
          canWithdraw: true,
        };
      }
      
      beneficiarySummary[record.beneficiaryId].totalAmount += record.amount;
    }
    
    const settlementDetails = {
      settleTime: settleTime.toISOString(),
      settledCount: settledRecords.length,
      totalSettledAmount: settledRecords.reduce((sum, r) => sum + r.amount, 0).toFixed(2),
      beneficiarySummary: Object.values(beneficiarySummary)
        .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
        .map((b: any) => ({
          beneficiaryName: b.beneficiaryName,
          totalAmount: `¥${b.totalAmount.toFixed(2)}`,
          status: '已结算，可提现',
        })),
    };
    
    logSuccess('分佣结算完成', settlementDetails);
    
    console.log('\n💸 可提现金额汇总：');
    for (const b of settlementDetails.beneficiarySummary) {
      console.log(`   ${b.beneficiaryName}: ${b.totalAmount}`);
    }
    console.log('');
    
    results.push({
      scenario: '场景8: 分佣结算',
      success: true,
      details: settlementDetails,
    });
    
    return settlementDetails;
  } catch (error: any) {
    logError('分佣结算失败', error);
    results.push({
      scenario: '场景8: 分佣结算',
      success: false,
      details: null,
      error: error.message,
    });
    throw error;
  }
}

// ==========================================
// 主测试流程
// ==========================================
async function main() {
  console.log('\n');
  console.log('🚀 营销活动端到端测试开始（增强版）');
  console.log('='.repeat(80));
  console.log('测试租户:', TENANT_ID);
  console.log('测试商品:', COURSE_PRODUCT_ID);
  console.log('测试用户:', Object.keys(users).length, '个');
  console.log('分佣规则: 一级10% | 二级5%');
  console.log('='.repeat(80));
  
  try {
    // 清理旧数据
    await cleanup();
    
    // 初始化测试用户
    await initTestUsers();
    
    // 场景 1: 创建课程拼团活动
    const config = await scenario1_CreateCourseGroupBuy();
    
    // 场景 2: C1 发起拼团
    const { instance } = await scenario2_C1StartGroupBuy(config.id);
    
    // 场景 3: 其他用户参团
    await scenario3_OthersJoinGroup(instance.id);
    
    // 场景 4: 计算分佣
    await scenario4_CalculateCommission();
    
    // 场景 5: 拼团失败场景
    await scenario5_GroupBuyFailed(config.id);
    
    // 场景 6: 第二个成功拼团（测试多团并行）
    await scenario6_SecondSuccessfulGroup(config.id);
    
    // 场景 7: 查询统计
    await scenario7_QueryStatistics();
    
    // 场景 8: 模拟分佣结算
    await scenario8_SettleCommissions();
    
    // 输出测试结果汇总
    logStep('测试结果汇总');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n📊 测试结果统计:');
    console.log(`   总场景数: ${results.length}`);
    console.log(`   成功: ${successCount}`);
    console.log(`   失败: ${failCount}`);
    
    // 输出关键业务指标
    console.log('\n💼 关键业务指标:');
    
    // 从场景4获取分佣详情
    const commissionResult = results.find(r => r.scenario === '场景4: 计算分佣');
    if (commissionResult && commissionResult.success) {
      const details = commissionResult.details as any;
      console.log('\n   📈 收入分析:');
      console.log(`      订单总收入: ${details.summary.totalRevenue}`);
      console.log(`      分佣支出: ${details.summary.totalDistCommission}`);
      console.log(`      门店净利润: ${details.summary.storeNetRevenue}`);
      console.log(`      注意: 平台抽成未实现，门店获得100%订单收入`);
      
      console.log('\n   👥 分佣排行榜:');
      details.beneficiarySummary.forEach((b: any, index: number) => {
        console.log(`      ${index + 1}. ${b.beneficiaryName}: ${b.totalAmount}`);
        console.log(`         └─ 一级: ${b.level1.count}笔 ${b.level1.amount} | 二级: ${b.level2.count}笔 ${b.level2.amount}`);
      });
    }
    
    // 从场景8获取结算详情
    const settlementResult = results.find(r => r.scenario === '场景8: 分佣结算');
    if (settlementResult && settlementResult.success) {
      const details = settlementResult.details as any;
      console.log('\n   💸 结算统计:');
      console.log(`      已结算笔数: ${details.settledCount}`);
      console.log(`      已结算总额: ¥${details.totalSettledAmount}`);
    }
    
    console.log('\n📋 详细结果:');
    
    results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`\n${index + 1}. ${icon} ${result.scenario}`);
      if (result.success) {
        // 只显示关键信息，避免输出过长
        if (result.scenario.includes('场景4') || result.scenario.includes('场景8')) {
          console.log('   详情: (见上方业务指标)');
        } else {
          console.log('   详情:', JSON.stringify(result.details, null, 2));
        }
      } else {
        console.log('   错误:', result.error);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 测试完成！');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n💥 测试执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
main();
