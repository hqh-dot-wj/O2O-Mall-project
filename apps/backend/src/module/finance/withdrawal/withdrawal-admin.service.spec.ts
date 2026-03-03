// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalAdminService } from './withdrawal-admin.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FinanceEventEmitter } from '../events/finance-event.emitter';
import { WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions';
import { TenantContext } from 'src/common/tenant/tenant.context';

describe('WithdrawalAdminService', () => {
  let service: WithdrawalAdminService;

  const mockPrismaService = {
    finWithdrawal: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    finTransaction: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant1');
    jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalAdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FinanceEventEmitter, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WithdrawalAdminService>(WithdrawalAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // ========== WD-T8: 提现统计功能 ==========
  describe('getWithdrawalStats - WD-T8', () => {
    it('Given 有提现数据, When getWithdrawalStats, Then 返回统计数据', async () => {
      // R-FLOW-WITHDRAWAL-STATS-01
      mockPrismaService.finWithdrawal.aggregate
        .mockResolvedValueOnce({
          _count: 100,
          _sum: { amount: new Decimal(50000), fee: new Decimal(500), actualAmount: new Decimal(49500) },
        }) // total
        .mockResolvedValueOnce({ _count: 5, _sum: { amount: new Decimal(2500) } }) // today
        .mockResolvedValueOnce({ _count: 30, _sum: { amount: new Decimal(15000) } }); // month

      mockPrismaService.finWithdrawal.groupBy
        .mockResolvedValueOnce([
          { status: WithdrawalStatus.PENDING, _count: 10, _sum: { amount: new Decimal(5000) } },
          { status: WithdrawalStatus.APPROVED, _count: 80, _sum: { amount: new Decimal(40000) } },
          { status: WithdrawalStatus.REJECTED, _count: 10, _sum: { amount: new Decimal(5000) } },
        ]) // status
        .mockResolvedValueOnce([
          { method: 'WECHAT_WALLET', _count: 70, _sum: { amount: new Decimal(35000) } },
          { method: 'BANK_CARD', _count: 10, _sum: { amount: new Decimal(5000) } },
        ]); // method

      const result = await service.getWithdrawalStats();

      expect(result.data.totalCount).toBe(100);
      expect(result.data.totalAmount).toBe(50000);
      expect(result.data.pendingCount).toBe(10);
      expect(result.data.approvedCount).toBe(80);
      expect(result.data.methodStats.length).toBe(2);
    });
  });

  describe('getWithdrawalTrend - WD-T8', () => {
    it('Given 有历史数据, When getWithdrawalTrend, Then 返回趋势数据', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        { date: new Date('2026-03-01'), count: BigInt(5), amount: 2500, approved_count: BigInt(4), approved_amount: 2000 },
        { date: new Date('2026-03-02'), count: BigInt(8), amount: 4000, approved_count: BigInt(6), approved_amount: 3000 },
      ]);

      const result = await service.getWithdrawalTrend(30);

      expect(result.data.length).toBe(2);
      expect(result.data[0].count).toBe(5);
      expect(result.data[1].approvedAmount).toBe(3000);
    });
  });

  // ========== WD-T10: 提现到账通知 ==========
  describe('sendArrivalNotification - WD-T10', () => {
    it('Given 已到账提现, When sendArrivalNotification, Then 发送通知', async () => {
      // R-FLOW-WITHDRAWAL-NOTIFY-01
      const mockWithdrawal = {
        id: 'wd1',
        tenantId: 'tenant1',
        memberId: 'member1',
        amount: new Decimal(100),
        actualAmount: new Decimal(100),
        method: 'WECHAT_WALLET',
        status: WithdrawalStatus.APPROVED,
        paymentNo: 'PAY001',
        realName: '张三',
        member: { memberId: 'member1', nickname: '用户1', mobile: '138' },
      };

      mockPrismaService.finWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);

      const result = await service.sendArrivalNotification('wd1');

      expect(result.msg).toBe('通知已发送');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('Given 提现不存在, When sendArrivalNotification, Then 抛出异常', async () => {
      mockPrismaService.finWithdrawal.findUnique.mockResolvedValue(null);

      await expect(service.sendArrivalNotification('wd999')).rejects.toThrow(BusinessException);
    });

    it('Given 提现未到账, When sendArrivalNotification, Then 抛出异常', async () => {
      mockPrismaService.finWithdrawal.findUnique.mockResolvedValue({
        id: 'wd1',
        status: WithdrawalStatus.PENDING,
      });

      await expect(service.sendArrivalNotification('wd1')).rejects.toThrow(BusinessException);
    });
  });

  // ========== WD-T11: 提现详情接口 ==========
  describe('getWithdrawalDetail - WD-T11', () => {
    it('Given 提现存在, When getWithdrawalDetail, Then 返回详情', async () => {
      // R-FLOW-WITHDRAWAL-DETAIL-01
      const mockWithdrawal = {
        id: 'wd1',
        tenantId: 'tenant1',
        memberId: 'member1',
        amount: new Decimal(100),
        fee: new Decimal(1),
        actualAmount: new Decimal(99),
        method: 'WECHAT_WALLET',
        accountNo: null,
        realName: '张三',
        status: WithdrawalStatus.APPROVED,
        retryCount: 0,
        auditTime: new Date(),
        auditBy: 'admin',
        auditRemark: '通过',
        paymentNo: 'PAY001',
        failReason: null,
        createTime: new Date(),
        member: { memberId: 'member1', nickname: '用户1', mobile: '138', avatar: '' },
      };

      mockPrismaService.finWithdrawal.findUnique.mockResolvedValue(mockWithdrawal);
      mockPrismaService.finTransaction.findMany.mockResolvedValue([]);

      const result = await service.getWithdrawalDetail('wd1');

      expect(result.data.id).toBe('wd1');
      expect(result.data.methodName).toBe('微信钱包');
      expect(result.data.statusName).toBe('已到账');
    });

    it('Given 提现不存在, When getWithdrawalDetail, Then 返回404', async () => {
      mockPrismaService.finWithdrawal.findUnique.mockResolvedValue(null);

      const result = await service.getWithdrawalDetail('wd999');

      expect(result.code).toBe(404);
    });
  });
});
