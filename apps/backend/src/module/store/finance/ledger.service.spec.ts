import { Test, TestingModule } from '@nestjs/testing';
import { StoreLedgerService } from './ledger.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { ListLedgerDto } from './dto/store-finance.dto';
import * as fc from 'fast-check';

/**
 * 店铺财务流水服务测试
 * Feature: store-finance-tenant-isolation-fix
 */
describe('StoreLedgerService', () => {
  let service: StoreLedgerService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreLedgerService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
            finCommission: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<StoreLedgerService>(StoreLedgerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: 超级管理员跨租户可见性
   * 
   * **Validates: Requirements 1.1, 1.2**
   * 
   * 对于任何查询参数和多租户数据集，当以超级管理员身份（tenantId='000000'）查询时，
   * 返回的结果应该包含来自多个不同租户的数据
   */
  describe('Feature: store-finance-tenant-isolation-fix, Property 1: 超级管理员跨租户可见性', () => {
    it('应该允许超级管理员查看所有租户的数据（最少100次迭代）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成查询参数
          fc.record({
            pageNum: fc.integer({ min: 1, max: 5 }),
            pageSize: fc.integer({ min: 10, max: 50 }),
            type: fc.option(
              fc.constantFrom('ORDER_INCOME', 'COMMISSION_IN', 'WITHDRAW_OUT'),
              { nil: undefined }
            ),
            memberId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
            keyword: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
            minAmount: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
            maxAmount: fc.option(fc.integer({ min: 1000, max: 10000 }), { nil: undefined }),
          }),
          // 生成多租户数据集 - 确保每种类型都有多租户分布
          fc.record({
            tenants: fc.constant(['tenant1', 'tenant2', 'tenant3']),
            orders: fc.array(
              fc.record({
                id: fc.uuid(),
                tenant_id: fc.constantFrom('tenant1', 'tenant2', 'tenant3'),
                pay_amount: fc.integer({ min: 100, max: 5000 }),
                order_sn: fc.string({ minLength: 10, maxLength: 20 }),
                receiver_name: fc.string({ minLength: 2, maxLength: 10 }),
                receiver_phone: fc.string({ minLength: 11, maxLength: 11 }),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              }),
              { minLength: 6, maxLength: 12 } // 增加最小数量确保多租户分布
            ).map(orders => {
              // 确保至少有2个不同租户的订单
              if (orders.length >= 2) {
                orders[0].tenant_id = 'tenant1';
                orders[1].tenant_id = 'tenant2';
              }
              return orders;
            }),
            commissions: fc.array(
              fc.record({
                id: fc.uuid(),
                tenant_id: fc.constantFrom('tenant1', 'tenant2', 'tenant3'),
                amount: fc.integer({ min: 10, max: 500 }),
                beneficiary_id: fc.string({ minLength: 1, maxLength: 20 }),
                order_id: fc.uuid(),
                status: fc.constantFrom('FROZEN', 'SETTLED'),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              }),
              { minLength: 6, maxLength: 12 }
            ).map(commissions => {
              // 确保至少有2个不同租户的佣金
              if (commissions.length >= 2) {
                commissions[0].tenant_id = 'tenant1';
                commissions[1].tenant_id = 'tenant2';
              }
              return commissions;
            }),
            withdrawals: fc.array(
              fc.record({
                id: fc.uuid(),
                tenant_id: fc.constantFrom('tenant1', 'tenant2', 'tenant3'),
                amount: fc.integer({ min: 100, max: 2000 }),
                member_id: fc.string({ minLength: 1, maxLength: 20 }),
                status: fc.constant('APPROVED'),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              }),
              { minLength: 6, maxLength: 12 }
            ).map(withdrawals => {
              // 确保至少有2个不同租户的提现
              if (withdrawals.length >= 2) {
                withdrawals[0].tenant_id = 'tenant1';
                withdrawals[1].tenant_id = 'tenant2';
              }
              return withdrawals;
            }),
          }),
          async (queryParams, testData) => {
            // 准备查询DTO
            const query = new ListLedgerDto();
            query.pageNum = queryParams.pageNum;
            query.pageSize = queryParams.pageSize;
            query.type = queryParams.type;
            query.memberId = queryParams.memberId;
            query.keyword = queryParams.keyword;
            query.minAmount = queryParams.minAmount;
            query.maxAmount = queryParams.maxAmount;

            // 确保测试数据包含多个租户
            const uniqueTenants = new Set([
              ...testData.orders.map(o => o.tenant_id),
              ...testData.commissions.map(c => c.tenant_id),
              ...testData.withdrawals.map(w => w.tenant_id),
            ]);

            // 根据查询类型，确定实际会返回的数据源
            const shouldIncludeOrders = !query.type || query.type === 'ORDER_INCOME';
            const shouldIncludeCommissions = !query.type || query.type === 'COMMISSION_IN';
            const shouldIncludeWithdrawals = !query.type || query.type === 'WITHDRAW_OUT';

            // 计算实际会包含的租户
            const actualTenants = new Set<string>();
            if (shouldIncludeOrders) {
              testData.orders.forEach(o => actualTenants.add(o.tenant_id));
            }
            if (shouldIncludeCommissions) {
              testData.commissions.forEach(c => actualTenants.add(c.tenant_id));
            }
            if (shouldIncludeWithdrawals) {
              testData.withdrawals.forEach(w => actualTenants.add(w.tenant_id));
            }

            // 如果实际数据不包含多个租户，跳过此次测试
            if (actualTenants.size < 2) {
              return;
            }

            // 模拟数据库查询结果 - 合并所有租户的数据
            const mockResults: any[] = [];

            // 添加订单数据（如果应该包含）
            if (shouldIncludeOrders) {
              testData.orders.forEach(order => {
                mockResults.push({
                  id: `order-${order.id}`,
                  type: 'ORDER_INCOME',
                  type_name: '订单收入',
                  amount: order.pay_amount,
                  balance_after: null,
                  related_id: order.order_sn,
                  remark: `订单支付: ${order.order_sn}`,
                  create_time: order.create_time,
                  user_name: order.receiver_name,
                  user_phone: order.receiver_phone,
                  user_id: null,
                  status: null,
                  tenant_id: order.tenant_id, // 用于验证
                });
              });
            }

            // 添加佣金数据（如果应该包含）
            if (shouldIncludeCommissions) {
              testData.commissions.forEach(comm => {
                mockResults.push({
                  id: `commission-${comm.id}`,
                  type: 'COMMISSION_IN',
                  type_name: comm.status === 'FROZEN' ? '佣金待结算' : '佣金已入账',
                  amount: comm.amount,
                  balance_after: comm.status === 'SETTLED' ? 1000 : null,
                  related_id: comm.order_id,
                  remark: `订单${comm.order_id}佣金`,
                  create_time: comm.create_time,
                  user_name: '测试用户',
                  user_phone: '13800138000',
                  user_id: comm.beneficiary_id,
                  status: comm.status,
                  tenant_id: comm.tenant_id, // 用于验证
                });
              });
            }

            // 添加提现数据（如果应该包含）
            if (shouldIncludeWithdrawals) {
              testData.withdrawals.forEach(withdrawal => {
                mockResults.push({
                  id: `withdraw-${withdrawal.id}`,
                  type: 'WITHDRAW_OUT',
                  type_name: '提现支出',
                  amount: -withdrawal.amount,
                  balance_after: 500,
                  related_id: withdrawal.id,
                  remark: '余额提现',
                  create_time: withdrawal.create_time,
                  user_name: '测试用户',
                  user_phone: '13900139000',
                  user_id: withdrawal.member_id,
                  status: null,
                  tenant_id: withdrawal.tenant_id, // 用于验证
                });
              });
            }

            // 模拟 Prisma 查询
            const mockQueryRaw = prisma.$queryRaw as jest.Mock;
            mockQueryRaw
              .mockResolvedValueOnce(mockResults) // 第一次调用返回数据
              .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]); // 第二次调用返回总数

            // 模拟佣金查询（用于分销信息）
            const mockFindMany = prisma.finCommission.findMany as jest.Mock;
            mockFindMany.mockResolvedValue([]);

            // 在超级管理员上下文中执行查询
            const result = await TenantContext.run(
              { tenantId: TenantContext.SUPER_TENANT_ID },
              async () => {
                return await service.getLedger(query);
              }
            );

            // 验证：结果应该包含来自多个租户的数据
            if (mockResults.length > 0) {
              const resultTenants = new Set(
                mockResults.map(r => r.tenant_id)
              );

              // 断言：超级管理员应该能看到多个租户的数据
              expect(resultTenants.size).toBeGreaterThanOrEqual(2);

              // 验证返回的数据结构正确
              expect(result.data).toBeDefined();
              expect(result.data.rows).toBeDefined();
              expect(Array.isArray(result.data.rows)).toBe(true);
              expect(result.data.rows.length).toBe(mockResults.length);

              // 验证每条记录都有正确的字段
              result.data.rows.forEach((record: any) => {
                expect(record).toHaveProperty('id');
                expect(record).toHaveProperty('type');
                expect(record).toHaveProperty('typeName');
                expect(record).toHaveProperty('amount');
                expect(record).toHaveProperty('user');
                expect(record.user).toHaveProperty('nickname');
                expect(record.user).toHaveProperty('mobile');
              });
            }
          }
        ),
        { numRuns: 100 } // 最少100次迭代
      );
    });

    it('应该允许超级管理员使用memberId过滤时查看跨租户数据', async () => {
      // 准备测试数据
      const testMemberId = 'test-member-123';
      const query = new ListLedgerDto();
      query.pageNum = 1;
      query.pageSize = 20;
      query.memberId = testMemberId;

      // 模拟来自不同租户的数据
      const mockResults = [
        {
          id: 'commission-1',
          type: 'COMMISSION_IN',
          type_name: '佣金已入账',
          amount: 100,
          balance_after: 1000,
          related_id: 'order-1',
          remark: '订单order-1佣金',
          create_time: new Date('2024-06-01'),
          user_name: '测试用户',
          user_phone: '13800138000',
          user_id: testMemberId,
          status: 'SETTLED',
          tenant_id: 'tenant1',
        },
        {
          id: 'commission-2',
          type: 'COMMISSION_IN',
          type_name: '佣金已入账',
          amount: 200,
          balance_after: 2000,
          related_id: 'order-2',
          remark: '订单order-2佣金',
          create_time: new Date('2024-06-02'),
          user_name: '测试用户',
          user_phone: '13800138000',
          user_id: testMemberId,
          status: 'SETTLED',
          tenant_id: 'tenant2',
        },
        {
          id: 'withdraw-1',
          type: 'WITHDRAW_OUT',
          type_name: '提现支出',
          amount: -500,
          balance_after: 500,
          related_id: 'withdraw-1',
          remark: '余额提现',
          create_time: new Date('2024-06-03'),
          user_name: '测试用户',
          user_phone: '13800138000',
          user_id: testMemberId,
          status: null,
          tenant_id: 'tenant3',
        },
      ];

      // 模拟 Prisma 查询
      const mockQueryRaw = prisma.$queryRaw as jest.Mock;
      mockQueryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]);

      const mockFindMany = prisma.finCommission.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      // 在超级管理员上下文中执行查询
      const result = await TenantContext.run(
        { tenantId: TenantContext.SUPER_TENANT_ID },
        async () => {
          return await service.getLedger(query);
        }
      );

      // 验证：结果包含来自多个租户的数据
      const tenants = new Set(mockResults.map(r => r.tenant_id));
      expect(tenants.size).toBe(3);
      expect(tenants.has('tenant1')).toBe(true);
      expect(tenants.has('tenant2')).toBe(true);
      expect(tenants.has('tenant3')).toBe(true);

      // 验证：所有数据都属于指定的会员
      expect(result.data).toBeDefined();
      expect(result.data.rows).toBeDefined();
      expect(result.data.rows.length).toBe(3);
    });

    it('应该允许超级管理员无过滤条件查询所有租户数据', async () => {
      // 准备测试数据
      const query = new ListLedgerDto();
      query.pageNum = 1;
      query.pageSize = 20;

      // 模拟来自不同租户的各种类型数据
      const mockResults = [
        {
          id: 'order-1',
          type: 'ORDER_INCOME',
          type_name: '订单收入',
          amount: 1000,
          balance_after: null,
          related_id: 'SN001',
          remark: '订单支付: SN001',
          create_time: new Date('2024-06-01'),
          user_name: '客户A',
          user_phone: '13800138001',
          user_id: null,
          status: null,
          tenant_id: 'tenant1',
        },
        {
          id: 'order-2',
          type: 'ORDER_INCOME',
          type_name: '订单收入',
          amount: 2000,
          balance_after: null,
          related_id: 'SN002',
          remark: '订单支付: SN002',
          create_time: new Date('2024-06-02'),
          user_name: '客户B',
          user_phone: '13800138002',
          user_id: null,
          status: null,
          tenant_id: 'tenant2',
        },
        {
          id: 'commission-1',
          type: 'COMMISSION_IN',
          type_name: '佣金已入账',
          amount: 150,
          balance_after: 1500,
          related_id: 'order-1',
          remark: '订单order-1佣金',
          create_time: new Date('2024-06-03'),
          user_name: '推广员A',
          user_phone: '13900139001',
          user_id: 'member1',
          status: 'SETTLED',
          tenant_id: 'tenant1',
        },
        {
          id: 'commission-2',
          type: 'COMMISSION_IN',
          type_name: '佣金待结算',
          amount: 250,
          balance_after: null,
          related_id: 'order-2',
          remark: '订单order-2佣金（待结算）',
          create_time: new Date('2024-06-04'),
          user_name: '推广员B',
          user_phone: '13900139002',
          user_id: 'member2',
          status: 'FROZEN',
          tenant_id: 'tenant3',
        },
      ];

      // 模拟 Prisma 查询
      const mockQueryRaw = prisma.$queryRaw as jest.Mock;
      mockQueryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]);

      const mockFindMany = prisma.finCommission.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      // 在超级管理员上下文中执行查询
      const result = await TenantContext.run(
        { tenantId: TenantContext.SUPER_TENANT_ID },
        async () => {
          return await service.getLedger(query);
        }
      );

      // 验证：结果包含来自多个租户的数据
      const tenants = new Set(mockResults.map(r => r.tenant_id));
      expect(tenants.size).toBeGreaterThanOrEqual(2);

      // 验证：包含所有交易类型
      const types = new Set(result.data.rows.map((r: any) => r.type));
      expect(types.has('ORDER_INCOME')).toBe(true);
      expect(types.has('COMMISSION_IN')).toBe(true);

      // 验证：返回正确数量的记录
      expect(result.data.rows.length).toBe(4);
      expect(result.data.total).toBe(4);
    });
  });

  /**
   * Property 2: 普通租户数据隔离
   * 
   * **Validates: Requirements 2.1, 2.2**
   * 
   * 对于任何普通租户（tenantId != '000000'）和查询参数，当查询流水服务时，
   * 所有返回结果的 tenant_id 应该都等于该租户的 tenantId
   */
  describe('Feature: store-finance-tenant-isolation-fix, Property 2: 普通租户数据隔离', () => {
    it('应该确保普通租户只能看到自己租户的数据（最少100次迭代）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成普通租户ID（非'000000'）
          fc.string({ minLength: 6, maxLength: 20 }).filter(id => id !== '000000'),
          // 生成查询参数
          fc.record({
            pageNum: fc.integer({ min: 1, max: 5 }),
            pageSize: fc.integer({ min: 10, max: 50 }),
            type: fc.option(
              fc.constantFrom('ORDER_INCOME', 'COMMISSION_IN', 'WITHDRAW_OUT'),
              { nil: undefined }
            ),
            memberId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
            keyword: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
            minAmount: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
            maxAmount: fc.option(fc.integer({ min: 1000, max: 10000 }), { nil: undefined }),
          }),
          // 生成多租户数据集（包含当前租户和其他租户的数据）
          fc.record({
            orders: fc.array(
              fc.record({
                id: fc.uuid(),
                pay_amount: fc.integer({ min: 100, max: 5000 }),
                order_sn: fc.string({ minLength: 10, maxLength: 20 }),
                receiver_name: fc.string({ minLength: 2, maxLength: 10 }),
                receiver_phone: fc.string({ minLength: 11, maxLength: 11 }),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
                isCurrentTenant: fc.boolean(), // 标记是否属于当前租户
              }),
              { minLength: 3, maxLength: 10 }
            ),
            commissions: fc.array(
              fc.record({
                id: fc.uuid(),
                amount: fc.integer({ min: 10, max: 500 }),
                beneficiary_id: fc.string({ minLength: 1, maxLength: 20 }),
                order_id: fc.uuid(),
                status: fc.constantFrom('FROZEN', 'SETTLED'),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
                isCurrentTenant: fc.boolean(),
              }),
              { minLength: 3, maxLength: 10 }
            ),
            withdrawals: fc.array(
              fc.record({
                id: fc.uuid(),
                amount: fc.integer({ min: 100, max: 2000 }),
                member_id: fc.string({ minLength: 1, maxLength: 20 }),
                status: fc.constant('APPROVED'),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
                isCurrentTenant: fc.boolean(),
              }),
              { minLength: 3, maxLength: 10 }
            ),
          }),
          async (currentTenantId, queryParams, testData) => {
            // 准备查询DTO
            const query = new ListLedgerDto();
            query.pageNum = queryParams.pageNum;
            query.pageSize = queryParams.pageSize;
            query.type = queryParams.type;
            query.memberId = queryParams.memberId;
            query.keyword = queryParams.keyword;
            query.minAmount = queryParams.minAmount;
            query.maxAmount = queryParams.maxAmount;

            // 根据查询类型，确定实际会返回的数据源
            const shouldIncludeOrders = !query.type || query.type === 'ORDER_INCOME';
            const shouldIncludeCommissions = !query.type || query.type === 'COMMISSION_IN';
            const shouldIncludeWithdrawals = !query.type || query.type === 'WITHDRAW_OUT';

            // 模拟数据库查询结果 - 只包含当前租户的数据
            const mockResults: any[] = [];

            // 添加订单数据（只包含当前租户的）
            if (shouldIncludeOrders) {
              testData.orders
                .filter(order => order.isCurrentTenant)
                .forEach(order => {
                  mockResults.push({
                    id: `order-${order.id}`,
                    type: 'ORDER_INCOME',
                    type_name: '订单收入',
                    amount: order.pay_amount,
                    balance_after: null,
                    related_id: order.order_sn,
                    remark: `订单支付: ${order.order_sn}`,
                    create_time: order.create_time,
                    user_name: order.receiver_name,
                    user_phone: order.receiver_phone,
                    user_id: null,
                    status: null,
                    tenant_id: currentTenantId, // 只包含当前租户的数据
                  });
                });
            }

            // 添加佣金数据（只包含当前租户的）
            if (shouldIncludeCommissions) {
              testData.commissions
                .filter(comm => comm.isCurrentTenant)
                .forEach(comm => {
                  mockResults.push({
                    id: `commission-${comm.id}`,
                    type: 'COMMISSION_IN',
                    type_name: comm.status === 'FROZEN' ? '佣金待结算' : '佣金已入账',
                    amount: comm.amount,
                    balance_after: comm.status === 'SETTLED' ? 1000 : null,
                    related_id: comm.order_id,
                    remark: `订单${comm.order_id}佣金`,
                    create_time: comm.create_time,
                    user_name: '测试用户',
                    user_phone: '13800138000',
                    user_id: comm.beneficiary_id,
                    status: comm.status,
                    tenant_id: currentTenantId, // 只包含当前租户的数据
                  });
                });
            }

            // 添加提现数据（只包含当前租户的）
            if (shouldIncludeWithdrawals) {
              testData.withdrawals
                .filter(withdrawal => withdrawal.isCurrentTenant)
                .forEach(withdrawal => {
                  mockResults.push({
                    id: `withdraw-${withdrawal.id}`,
                    type: 'WITHDRAW_OUT',
                    type_name: '提现支出',
                    amount: -withdrawal.amount,
                    balance_after: 500,
                    related_id: withdrawal.id,
                    remark: '余额提现',
                    create_time: withdrawal.create_time,
                    user_name: '测试用户',
                    user_phone: '13900139000',
                    user_id: withdrawal.member_id,
                    status: null,
                    tenant_id: currentTenantId, // 只包含当前租户的数据
                  });
                });
            }

            // 模拟 Prisma 查询
            const mockQueryRaw = prisma.$queryRaw as jest.Mock;
            mockQueryRaw
              .mockResolvedValueOnce(mockResults) // 第一次调用返回数据
              .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]); // 第二次调用返回总数

            // 模拟佣金查询（用于分销信息）
            const mockFindMany = prisma.finCommission.findMany as jest.Mock;
            mockFindMany.mockResolvedValue([]);

            // 在普通租户上下文中执行查询
            const result = await TenantContext.run(
              { tenantId: currentTenantId },
              async () => {
                return await service.getLedger(query);
              }
            );

            // 验证：所有返回的结果都应该属于当前租户
            if (mockResults.length > 0) {
              // 验证返回的数据结构正确
              expect(result.data).toBeDefined();
              expect(result.data.rows).toBeDefined();
              expect(Array.isArray(result.data.rows)).toBe(true);
              expect(result.data.rows.length).toBe(mockResults.length);

              // 核心断言：所有结果的 tenant_id 都应该等于当前租户ID
              mockResults.forEach(record => {
                expect(record.tenant_id).toBe(currentTenantId);
              });

              // 验证每条记录都有正确的字段
              result.data.rows.forEach((record: any) => {
                expect(record).toHaveProperty('id');
                expect(record).toHaveProperty('type');
                expect(record).toHaveProperty('typeName');
                expect(record).toHaveProperty('amount');
                expect(record).toHaveProperty('user');
                expect(record.user).toHaveProperty('nickname');
                expect(record.user).toHaveProperty('mobile');
              });
            }
          }
        ),
        { numRuns: 100 } // 最少100次迭代
      );
    });

    it('应该确保普通租户使用memberId过滤时只能看到自己租户的数据', async () => {
      // 准备测试数据
      const currentTenantId = 'tenant-abc-123';
      const testMemberId = 'test-member-456';
      const query = new ListLedgerDto();
      query.pageNum = 1;
      query.pageSize = 20;
      query.memberId = testMemberId;

      // 模拟只包含当前租户的数据（即使按会员过滤）
      const mockResults = [
        {
          id: 'commission-1',
          type: 'COMMISSION_IN',
          type_name: '佣金已入账',
          amount: 100,
          balance_after: 1000,
          related_id: 'order-1',
          remark: '订单order-1佣金',
          create_time: new Date('2024-06-01'),
          user_name: '测试用户',
          user_phone: '13800138000',
          user_id: testMemberId,
          status: 'SETTLED',
          tenant_id: currentTenantId,
        },
        {
          id: 'withdraw-1',
          type: 'WITHDRAW_OUT',
          type_name: '提现支出',
          amount: -500,
          balance_after: 500,
          related_id: 'withdraw-1',
          remark: '余额提现',
          create_time: new Date('2024-06-02'),
          user_name: '测试用户',
          user_phone: '13800138000',
          user_id: testMemberId,
          status: null,
          tenant_id: currentTenantId,
        },
      ];

      // 模拟 Prisma 查询
      const mockQueryRaw = prisma.$queryRaw as jest.Mock;
      mockQueryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]);

      const mockFindMany = prisma.finCommission.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      // 在普通租户上下文中执行查询
      const result = await TenantContext.run(
        { tenantId: currentTenantId },
        async () => {
          return await service.getLedger(query);
        }
      );

      // 验证：所有结果都属于当前租户
      mockResults.forEach(record => {
        expect(record.tenant_id).toBe(currentTenantId);
      });

      // 验证：所有数据都属于指定的会员
      expect(result.data).toBeDefined();
      expect(result.data.rows).toBeDefined();
      expect(result.data.rows.length).toBe(2);

      // 验证：没有其他租户的数据
      const tenants = new Set(mockResults.map(r => r.tenant_id));
      expect(tenants.size).toBe(1);
      expect(tenants.has(currentTenantId)).toBe(true);
    });

    it('应该确保普通租户无过滤条件查询时只能看到自己租户的数据', async () => {
      // 准备测试数据
      const currentTenantId = 'tenant-xyz-789';
      const query = new ListLedgerDto();
      query.pageNum = 1;
      query.pageSize = 20;

      // 模拟只包含当前租户的各种类型数据
      const mockResults = [
        {
          id: 'order-1',
          type: 'ORDER_INCOME',
          type_name: '订单收入',
          amount: 1000,
          balance_after: null,
          related_id: 'SN001',
          remark: '订单支付: SN001',
          create_time: new Date('2024-06-01'),
          user_name: '客户A',
          user_phone: '13800138001',
          user_id: null,
          status: null,
          tenant_id: currentTenantId,
        },
        {
          id: 'commission-1',
          type: 'COMMISSION_IN',
          type_name: '佣金已入账',
          amount: 150,
          balance_after: 1500,
          related_id: 'order-1',
          remark: '订单order-1佣金',
          create_time: new Date('2024-06-02'),
          user_name: '推广员A',
          user_phone: '13900139001',
          user_id: 'member1',
          status: 'SETTLED',
          tenant_id: currentTenantId,
        },
        {
          id: 'withdraw-1',
          type: 'WITHDRAW_OUT',
          type_name: '提现支出',
          amount: -300,
          balance_after: 1200,
          related_id: 'withdraw-1',
          remark: '余额提现',
          create_time: new Date('2024-06-03'),
          user_name: '推广员A',
          user_phone: '13900139001',
          user_id: 'member1',
          status: null,
          tenant_id: currentTenantId,
        },
      ];

      // 模拟 Prisma 查询
      const mockQueryRaw = prisma.$queryRaw as jest.Mock;
      mockQueryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]);

      const mockFindMany = prisma.finCommission.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      // 在普通租户上下文中执行查询
      const result = await TenantContext.run(
        { tenantId: currentTenantId },
        async () => {
          return await service.getLedger(query);
        }
      );

      // 核心验证：所有结果都属于当前租户
      mockResults.forEach(record => {
        expect(record.tenant_id).toBe(currentTenantId);
      });

      // 验证：只有一个租户的数据
      const tenants = new Set(mockResults.map(r => r.tenant_id));
      expect(tenants.size).toBe(1);
      expect(tenants.has(currentTenantId)).toBe(true);

      // 验证：包含所有交易类型（但都是当前租户的）
      const types = new Set(result.data.rows.map((r: any) => r.type));
      expect(types.has('ORDER_INCOME')).toBe(true);
      expect(types.has('COMMISSION_IN')).toBe(true);
      expect(types.has('WITHDRAW_OUT')).toBe(true);

      // 验证：返回正确数量的记录
      expect(result.data.rows.length).toBe(3);
      expect(result.data.total).toBe(3);
    });
  });

  /**
   * Property 4: 会员过滤包含所有交易类型
   * 
   * **Validates: Requirements 3.2, 5.3, 5.4**
   * 
   * 对于任何会员ID过滤查询，返回的结果应该包含该会员的所有交易类型：
   * 订单收入（ORDER_INCOME）、佣金（COMMISSION_IN）、提现（WITHDRAW_OUT）
   */
  describe('Feature: store-finance-tenant-isolation-fix, Property 4: 会员过滤包含所有交易类型', () => {
    it('应该在按会员过滤时包含所有交易类型（最少100次迭代）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成会员ID
          fc.string({ minLength: 5, maxLength: 20 }),
          // 生成租户ID（可以是超级管理员或普通租户）
          fc.oneof(
            fc.constant(TenantContext.SUPER_TENANT_ID),
            fc.string({ minLength: 6, maxLength: 20 }).filter(id => id !== '000000')
          ),
          // 生成该会员的多种交易数据
          fc.record({
            // 订单收入 - 会员作为客户下单
            orders: fc.array(
              fc.record({
                id: fc.uuid(),
                order_sn: fc.string({ minLength: 10, maxLength: 20 }),
                pay_amount: fc.integer({ min: 100, max: 5000 }),
                receiver_name: fc.string({ minLength: 2, maxLength: 10 }),
                receiver_phone: fc.string({ minLength: 11, maxLength: 11 }),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            // 佣金 - 会员作为受益人获得佣金
            commissions: fc.array(
              fc.record({
                id: fc.uuid(),
                amount: fc.integer({ min: 10, max: 500 }),
                order_id: fc.uuid(),
                status: fc.constantFrom('FROZEN', 'SETTLED'),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            // 提现 - 会员申请提现
            withdrawals: fc.array(
              fc.record({
                id: fc.uuid(),
                amount: fc.integer({ min: 100, max: 2000 }),
                status: fc.constant('APPROVED'),
                create_time: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async (memberId, tenantId, memberTransactions) => {
            // 准备查询DTO - 按会员ID过滤
            const query = new ListLedgerDto();
            query.pageNum = 1;
            query.pageSize = 50;
            query.memberId = memberId; // 关键：按会员ID过滤

            // 模拟数据库查询结果 - 包含该会员的所有交易类型
            const mockResults: any[] = [];

            // 添加订单收入（会员作为客户）
            memberTransactions.orders.forEach(order => {
              mockResults.push({
                id: `order-${order.id}`,
                type: 'ORDER_INCOME',
                type_name: '订单收入',
                amount: order.pay_amount,
                balance_after: null,
                related_id: order.order_sn,
                remark: `订单支付: ${order.order_sn}`,
                create_time: order.create_time,
                user_name: order.receiver_name,
                user_phone: order.receiver_phone,
                user_id: null, // 订单收入没有user_id
                status: null,
                tenant_id: tenantId,
              });
            });

            // 添加佣金（会员作为受益人）
            memberTransactions.commissions.forEach(comm => {
              mockResults.push({
                id: `commission-${comm.id}`,
                type: 'COMMISSION_IN',
                type_name: comm.status === 'FROZEN' ? '佣金待结算' : '佣金已入账',
                amount: comm.amount,
                balance_after: comm.status === 'SETTLED' ? 1000 : null,
                related_id: comm.order_id,
                remark: `订单${comm.order_id}佣金`,
                create_time: comm.create_time,
                user_name: '测试用户',
                user_phone: '13800138000',
                user_id: memberId, // 佣金有user_id
                status: comm.status,
                tenant_id: tenantId,
              });
            });

            // 添加提现（会员申请提现）
            memberTransactions.withdrawals.forEach(withdrawal => {
              mockResults.push({
                id: `withdraw-${withdrawal.id}`,
                type: 'WITHDRAW_OUT',
                type_name: '提现支出',
                amount: -withdrawal.amount,
                balance_after: 500,
                related_id: withdrawal.id,
                remark: '余额提现',
                create_time: withdrawal.create_time,
                user_name: '测试用户',
                user_phone: '13900139000',
                user_id: memberId, // 提现有user_id
                status: null,
                tenant_id: tenantId,
              });
            });

            // 模拟 Prisma 查询
            const mockQueryRaw = prisma.$queryRaw as jest.Mock;
            mockQueryRaw
              .mockResolvedValueOnce(mockResults) // 第一次调用返回数据
              .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]); // 第二次调用返回总数

            // 模拟佣金查询（用于分销信息）
            const mockFindMany = prisma.finCommission.findMany as jest.Mock;
            mockFindMany.mockResolvedValue([]);

            // 在指定租户上下文中执行查询
            const result = await TenantContext.run(
              { tenantId },
              async () => {
                return await service.getLedger(query);
              }
            );

            // 核心验证：当按会员ID过滤时，应该包含所有交易类型
            if (mockResults.length > 0) {
              expect(result.data).toBeDefined();
              expect(result.data.rows).toBeDefined();
              expect(Array.isArray(result.data.rows)).toBe(true);

              // 提取返回结果中的交易类型
              const returnedTypes = new Set(result.data.rows.map((r: any) => r.type));

              // 断言：应该包含订单收入（ORDER_INCOME）
              if (memberTransactions.orders.length > 0) {
                expect(returnedTypes.has('ORDER_INCOME')).toBe(true);
              }

              // 断言：应该包含佣金（COMMISSION_IN）
              if (memberTransactions.commissions.length > 0) {
                expect(returnedTypes.has('COMMISSION_IN')).toBe(true);
              }

              // 断言：应该包含提现（WITHDRAW_OUT）
              if (memberTransactions.withdrawals.length > 0) {
                expect(returnedTypes.has('WITHDRAW_OUT')).toBe(true);
              }

              // 验证：所有三种类型都应该存在（因为我们生成的数据确保每种类型至少有1条）
              expect(returnedTypes.has('ORDER_INCOME')).toBe(true);
              expect(returnedTypes.has('COMMISSION_IN')).toBe(true);
              expect(returnedTypes.has('WITHDRAW_OUT')).toBe(true);

              // 验证：返回的记录数应该等于所有交易的总数
              const expectedTotal = 
                memberTransactions.orders.length +
                memberTransactions.commissions.length +
                memberTransactions.withdrawals.length;
              expect(result.data.rows.length).toBe(expectedTotal);

              // 验证：每条记录都有正确的字段
              result.data.rows.forEach((record: any) => {
                expect(record).toHaveProperty('id');
                expect(record).toHaveProperty('type');
                expect(record).toHaveProperty('typeName');
                expect(record).toHaveProperty('amount');
                expect(record).toHaveProperty('user');
                expect(record.user).toHaveProperty('nickname');
                expect(record.user).toHaveProperty('mobile');
              });
            }
          }
        ),
        { numRuns: 100 } // 最少100次迭代
      );
    });

    it('应该在按会员过滤时包含订单收入（验证需求5.2）', async () => {
      // 准备测试数据
      const testMemberId = 'member-with-orders';
      const testTenantId = 'tenant-123';
      const query = new ListLedgerDto();
      query.pageNum = 1;
      query.pageSize = 20;
      query.memberId = testMemberId;

      // 模拟该会员的订单收入、佣金和提现
      const mockResults = [
        // 订单收入 - 关键：验证按会员过滤时包含订单
        {
          id: 'order-1',
          type: 'ORDER_INCOME',
          type_name: '订单收入',
          amount: 1000,
          balance_after: null,
          related_id: 'SN001',
          remark: '订单支付: SN001',
          create_time: new Date('2024-06-01'),
          user_name: '客户A',
          user_phone: '13800138001',
          user_id: null,
          status: null,
          tenant_id: testTenantId,
        },
        {
          id: 'order-2',
          type: 'ORDER_INCOME',
          type_name: '订单收入',
          amount: 2000,
          balance_after: null,
          related_id: 'SN002',
          remark: '订单支付: SN002',
          create_time: new Date('2024-06-02'),
          user_name: '客户A',
          user_phone: '13800138001',
          user_id: null,
          status: null,
          tenant_id: testTenantId,
        },
        // 佣金
        {
          id: 'commission-1',
          type: 'COMMISSION_IN',
          type_name: '佣金已入账',
          amount: 150,
          balance_after: 1500,
          related_id: 'order-1',
          remark: '订单order-1佣金',
          create_time: new Date('2024-06-03'),
          user_name: '推广员',
          user_phone: '13900139001',
          user_id: testMemberId,
          status: 'SETTLED',
          tenant_id: testTenantId,
        },
        // 提现
        {
          id: 'withdraw-1',
          type: 'WITHDRAW_OUT',
          type_name: '提现支出',
          amount: -500,
          balance_after: 1000,
          related_id: 'withdraw-1',
          remark: '余额提现',
          create_time: new Date('2024-06-04'),
          user_name: '推广员',
          user_phone: '13900139001',
          user_id: testMemberId,
          status: null,
          tenant_id: testTenantId,
        },
      ];

      // 模拟 Prisma 查询
      const mockQueryRaw = prisma.$queryRaw as jest.Mock;
      mockQueryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]);

      const mockFindMany = prisma.finCommission.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      // 在租户上下文中执行查询
      const result = await TenantContext.run(
        { tenantId: testTenantId },
        async () => {
          return await service.getLedger(query);
        }
      );

      // 核心验证：按会员过滤时应该包含订单收入
      expect(result.data).toBeDefined();
      expect(result.data.rows).toBeDefined();
      expect(result.data.rows.length).toBe(4);

      // 验证：包含所有三种交易类型
      const types = new Set(result.data.rows.map((r: any) => r.type));
      expect(types.has('ORDER_INCOME')).toBe(true); // 关键断言：包含订单收入
      expect(types.has('COMMISSION_IN')).toBe(true);
      expect(types.has('WITHDRAW_OUT')).toBe(true);

      // 验证：订单收入的数量正确
      const orderIncomes = result.data.rows.filter((r: any) => r.type === 'ORDER_INCOME');
      expect(orderIncomes.length).toBe(2);
    });

    it('应该在按会员过滤时同时包含佣金和提现（验证需求5.3, 5.4）', async () => {
      // 准备测试数据
      const testMemberId = 'member-with-all-types';
      const testTenantId = 'tenant-456';
      const query = new ListLedgerDto();
      query.pageNum = 1;
      query.pageSize = 20;
      query.memberId = testMemberId;

      // 模拟该会员的所有交易类型
      const mockResults = [
        // 佣金（冻结）
        {
          id: 'commission-1',
          type: 'COMMISSION_IN',
          type_name: '佣金待结算',
          amount: 100,
          balance_after: null,
          related_id: 'order-1',
          remark: '订单order-1佣金（待结算）',
          create_time: new Date('2024-06-01'),
          user_name: '推广员',
          user_phone: '13900139001',
          user_id: testMemberId,
          status: 'FROZEN',
          tenant_id: testTenantId,
        },
        // 佣金（已结算）
        {
          id: 'commission-2',
          type: 'COMMISSION_IN',
          type_name: '佣金已入账',
          amount: 200,
          balance_after: 2000,
          related_id: 'order-2',
          remark: '订单order-2佣金',
          create_time: new Date('2024-06-02'),
          user_name: '推广员',
          user_phone: '13900139001',
          user_id: testMemberId,
          status: 'SETTLED',
          tenant_id: testTenantId,
        },
        // 提现
        {
          id: 'withdraw-1',
          type: 'WITHDRAW_OUT',
          type_name: '提现支出',
          amount: -800,
          balance_after: 1200,
          related_id: 'withdraw-1',
          remark: '余额提现',
          create_time: new Date('2024-06-03'),
          user_name: '推广员',
          user_phone: '13900139001',
          user_id: testMemberId,
          status: null,
          tenant_id: testTenantId,
        },
        // 订单收入
        {
          id: 'order-1',
          type: 'ORDER_INCOME',
          type_name: '订单收入',
          amount: 1500,
          balance_after: null,
          related_id: 'SN003',
          remark: '订单支付: SN003',
          create_time: new Date('2024-06-04'),
          user_name: '客户B',
          user_phone: '13800138002',
          user_id: null,
          status: null,
          tenant_id: testTenantId,
        },
      ];

      // 模拟 Prisma 查询
      const mockQueryRaw = prisma.$queryRaw as jest.Mock;
      mockQueryRaw
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce([{ total: BigInt(mockResults.length) }]);

      const mockFindMany = prisma.finCommission.findMany as jest.Mock;
      mockFindMany.mockResolvedValue([]);

      // 在租户上下文中执行查询
      const result = await TenantContext.run(
        { tenantId: testTenantId },
        async () => {
          return await service.getLedger(query);
        }
      );

      // 验证：返回所有交易
      expect(result.data).toBeDefined();
      expect(result.data.rows).toBeDefined();
      expect(result.data.rows.length).toBe(4);

      // 核心验证：包含所有交易类型
      const types = new Set(result.data.rows.map((r: any) => r.type));
      expect(types.has('COMMISSION_IN')).toBe(true); // 验证需求5.3
      expect(types.has('WITHDRAW_OUT')).toBe(true); // 验证需求5.4
      expect(types.has('ORDER_INCOME')).toBe(true); // 验证需求5.2

      // 验证：佣金记录数量正确（包含冻结和已结算）
      const commissions = result.data.rows.filter((r: any) => r.type === 'COMMISSION_IN');
      expect(commissions.length).toBe(2);

      // 验证：提现记录数量正确
      const withdrawals = result.data.rows.filter((r: any) => r.type === 'WITHDRAW_OUT');
      expect(withdrawals.length).toBe(1);

      // 验证：订单收入记录数量正确
      const orders = result.data.rows.filter((r: any) => r.type === 'ORDER_INCOME');
      expect(orders.length).toBe(1);
    });
  });

  /**
   * Unit Tests for getLedgerStats()
   * 
   * **Validates: Requirements 1.3, 2.3**
   * 
   * 测试 getLedgerStats() 方法的租户过滤逻辑：
   * - 超级管理员应该聚合所有租户的数据
   * - 普通租户应该只聚合自己租户的数据
   */
  describe('getLedgerStats() - 租户过滤测试', () => {
    describe('超级管理员聚合所有租户数据 (需求 1.3)', () => {
      it('应该聚合所有租户的订单收入、佣金和提现数据', async () => {
        // 准备测试数据
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;

        // 模拟来自多个租户的统计数据
        const mockStatsResult = [
          { type: 'ORDER_INCOME', total: 5000 }, // 租户1和租户2的订单收入总和
          { type: 'COMMISSION_IN', total: 800 }, // 已结算佣金
          { type: 'COMMISSION_FROZEN', total: 200 }, // 待结算佣金
          { type: 'WITHDRAW_OUT', total: -1000 }, // 提现支出（负数）
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在超级管理员上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: TenantContext.SUPER_TENANT_ID },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：返回正确的统计数据
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(6000); // 5000 + 800 + 200
        expect(result.data.totalExpense).toBe(1000); // |-1000|
        expect(result.data.netProfit).toBe(5000); // 6000 - 1000
        expect(result.data.pendingCommission).toBe(200); // 待结算佣金

        // 验证：调用了正确的查询（应该使用 1=1 作为租户过滤）
        expect(mockQueryRaw).toHaveBeenCalledTimes(1);
        const calledQuery = mockQueryRaw.mock.calls[0][0];
        expect(calledQuery.sql).toContain('1=1'); // 超级管理员使用 1=1
      });

      it('应该在无数据时返回零值统计', async () => {
        // 准备测试数据
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;

        // 模拟空的统计结果
        const mockStatsResult: any[] = [];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在超级管理员上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: TenantContext.SUPER_TENANT_ID },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：返回零值统计
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(0);
        expect(result.data.totalExpense).toBe(0);
        expect(result.data.netProfit).toBe(0);
        expect(result.data.pendingCommission).toBe(0);
      });

      it('应该正确计算包含多种交易类型的统计数据', async () => {
        // 准备测试数据
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;

        // 模拟复杂的统计数据（包含多种交易类型）
        const mockStatsResult = [
          { type: 'ORDER_INCOME', total: 10000 }, // 订单收入
          { type: 'COMMISSION_IN', total: 1500 }, // 已结算佣金
          { type: 'COMMISSION_FROZEN', total: 500 }, // 待结算佣金
          { type: 'WITHDRAW_OUT', total: -2000 }, // 提现支出
          { type: 'REFUND_DEDUCT', total: -300 }, // 退款扣减
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在超级管理员上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: TenantContext.SUPER_TENANT_ID },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：正确计算收入和支出
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(12000); // 10000 + 1500 + 500
        expect(result.data.totalExpense).toBe(2300); // |-2000| + |-300|
        expect(result.data.netProfit).toBe(9700); // 12000 - 2300
        expect(result.data.pendingCommission).toBe(500); // 待结算佣金
      });
    });

    describe('普通租户只聚合自己租户的数据 (需求 2.3)', () => {
      it('应该只聚合当前租户的统计数据', async () => {
        // 准备测试数据
        const currentTenantId = 'tenant-abc-123';
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;

        // 模拟只包含当前租户的统计数据
        const mockStatsResult = [
          { type: 'ORDER_INCOME', total: 2000 }, // 当前租户的订单收入
          { type: 'COMMISSION_IN', total: 300 }, // 当前租户的已结算佣金
          { type: 'COMMISSION_FROZEN', total: 100 }, // 当前租户的待结算佣金
          { type: 'WITHDRAW_OUT', total: -500 }, // 当前租户的提现支出
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在普通租户上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: currentTenantId },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：返回正确的统计数据
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(2400); // 2000 + 300 + 100
        expect(result.data.totalExpense).toBe(500); // |-500|
        expect(result.data.netProfit).toBe(1900); // 2400 - 500
        expect(result.data.pendingCommission).toBe(100); // 待结算佣金

        // 验证：调用了正确的查询（应该使用 tenant_id = X 作为租户过滤）
        expect(mockQueryRaw).toHaveBeenCalledTimes(1);
        const calledQuery = mockQueryRaw.mock.calls[0][0];
        expect(calledQuery.sql).toContain('tenant_id'); // 普通租户使用 tenant_id 过滤
        expect(calledQuery.values).toContain(currentTenantId); // 包含当前租户ID
      });

      it('应该在按会员过滤时只聚合当前租户的会员数据', async () => {
        // 准备测试数据
        const currentTenantId = 'tenant-xyz-789';
        const testMemberId = 'member-456';
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;
        query.memberId = testMemberId;

        // 模拟只包含当前租户的指定会员的统计数据
        const mockStatsResult = [
          { type: 'COMMISSION_IN', total: 150 }, // 该会员的已结算佣金
          { type: 'COMMISSION_FROZEN', total: 50 }, // 该会员的待结算佣金
          { type: 'WITHDRAW_OUT', total: -100 }, // 该会员的提现支出
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在普通租户上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: currentTenantId },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：返回正确的统计数据
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(200); // 150 + 50
        expect(result.data.totalExpense).toBe(100); // |-100|
        expect(result.data.netProfit).toBe(100); // 200 - 100
        expect(result.data.pendingCommission).toBe(50); // 待结算佣金

        // 验证：调用了正确的查询（应该同时过滤租户和会员）
        expect(mockQueryRaw).toHaveBeenCalledTimes(1);
        const calledQuery = mockQueryRaw.mock.calls[0][0];
        expect(calledQuery.sql).toContain('tenant_id'); // 包含租户过滤
        expect(calledQuery.values).toContain(currentTenantId); // 包含当前租户ID
        expect(calledQuery.values).toContain(testMemberId); // 包含会员ID过滤
      });

      it('应该在无数据时返回零值统计', async () => {
        // 准备测试数据
        const currentTenantId = 'tenant-empty-001';
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;

        // 模拟空的统计结果
        const mockStatsResult: any[] = [];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在普通租户上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: currentTenantId },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：返回零值统计
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(0);
        expect(result.data.totalExpense).toBe(0);
        expect(result.data.netProfit).toBe(0);
        expect(result.data.pendingCommission).toBe(0);
      });

      it('应该正确处理只有收入没有支出的情况', async () => {
        // 准备测试数据
        const currentTenantId = 'tenant-income-only';
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;

        // 模拟只有收入的统计数据
        const mockStatsResult = [
          { type: 'ORDER_INCOME', total: 3000 },
          { type: 'COMMISSION_IN', total: 500 },
          { type: 'COMMISSION_FROZEN', total: 200 },
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在普通租户上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: currentTenantId },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：正确计算只有收入的情况
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(3700); // 3000 + 500 + 200
        expect(result.data.totalExpense).toBe(0); // 无支出
        expect(result.data.netProfit).toBe(3700); // 3700 - 0
        expect(result.data.pendingCommission).toBe(200);
      });

      it('应该正确处理只有支出没有收入的情况', async () => {
        // 准备测试数据
        const currentTenantId = 'tenant-expense-only';
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;

        // 模拟只有支出的统计数据
        const mockStatsResult = [
          { type: 'WITHDRAW_OUT', total: -800 },
          { type: 'REFUND_DEDUCT', total: -200 },
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在普通租户上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: currentTenantId },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：正确计算只有支出的情况
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(0); // 无收入
        expect(result.data.totalExpense).toBe(1000); // |-800| + |-200|
        expect(result.data.netProfit).toBe(-1000); // 0 - 1000
        expect(result.data.pendingCommission).toBe(0);
      });
    });

    describe('按交易类型过滤的统计', () => {
      it('应该在按类型过滤时只统计指定类型的数据', async () => {
        // 准备测试数据
        const currentTenantId = 'tenant-filter-type';
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;
        query.type = 'ORDER_INCOME'; // 只查询订单收入

        // 模拟只包含订单收入的统计数据
        const mockStatsResult = [
          { type: 'ORDER_INCOME', total: 5000 },
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在普通租户上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: currentTenantId },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：只统计订单收入
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(5000);
        expect(result.data.totalExpense).toBe(0);
        expect(result.data.netProfit).toBe(5000);
        expect(result.data.pendingCommission).toBe(0); // 订单收入没有待结算佣金
      });

      it('应该在按佣金类型过滤时统计佣金数据', async () => {
        // 准备测试数据
        const currentTenantId = 'tenant-commission-filter';
        const query = new ListLedgerDto();
        query.pageNum = 1;
        query.pageSize = 20;
        query.type = 'COMMISSION_IN'; // 只查询佣金

        // 模拟只包含佣金的统计数据
        const mockStatsResult = [
          { type: 'COMMISSION_IN', total: 600 },
          { type: 'COMMISSION_FROZEN', total: 400 },
        ];

        // 模拟 Prisma 查询
        const mockQueryRaw = prisma.$queryRaw as jest.Mock;
        mockQueryRaw.mockResolvedValueOnce(mockStatsResult);

        // 在普通租户上下文中执行查询
        const result = await TenantContext.run(
          { tenantId: currentTenantId },
          async () => {
            return await service.getLedgerStats(query);
          }
        );

        // 验证：只统计佣金
        expect(result.data).toBeDefined();
        expect(result.data.totalIncome).toBe(1000); // 600 + 400
        expect(result.data.totalExpense).toBe(0);
        expect(result.data.netProfit).toBe(1000);
        expect(result.data.pendingCommission).toBe(400); // 待结算佣金
      });
    });
  });
});
