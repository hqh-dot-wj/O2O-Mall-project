// @ts-nocheck
 
import { Test, TestingModule } from '@nestjs/testing';
import { LevelConditionService } from './level-condition.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('LevelConditionService', () => {
  let service: LevelConditionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    finCommission: {
      aggregate: jest.fn(),
    },
    omsOrder: {
      count: jest.fn(),
    },
    umsMember: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelConditionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LevelConditionService>(LevelConditionService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkCondition', () => {
    const tenantId = 'T001';
    const memberId = 'M001';

    it('应该通过AND条件检查（所有规则都满足）', async () => {
      const condition = {
        type: 'AND' as const,
        rules: [
          {
            field: 'totalCommission' as const,
            operator: '>=' as const,
            value: 1000,
          },
          {
            field: 'directReferrals' as const,
            operator: '>=' as const,
            value: 5,
          },
        ],
      };

      mockPrismaService.finCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1500) },
      });
      mockPrismaService.umsMember.count.mockResolvedValue(10);

      const result = await service.checkCondition(tenantId, memberId, condition);

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].passed).toBe(true);
      expect(result.results[1].passed).toBe(true);
    });

    it('应该不通过AND条件检查（有规则不满足）', async () => {
      const condition = {
        type: 'AND' as const,
        rules: [
          {
            field: 'totalCommission' as const,
            operator: '>=' as const,
            value: 1000,
          },
          {
            field: 'directReferrals' as const,
            operator: '>=' as const,
            value: 5,
          },
        ],
      };

      mockPrismaService.finCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(800) }, // 不满足
      });
      mockPrismaService.umsMember.count.mockResolvedValue(10);

      const result = await service.checkCondition(tenantId, memberId, condition);

      expect(result.passed).toBe(false);
      expect(result.results[0].passed).toBe(false);
      expect(result.results[1].passed).toBe(true);
    });

    it('应该通过OR条件检查（至少一个规则满足）', async () => {
      const condition = {
        type: 'OR' as const,
        rules: [
          {
            field: 'totalCommission' as const,
            operator: '>=' as const,
            value: 1000,
          },
          {
            field: 'directReferrals' as const,
            operator: '>=' as const,
            value: 5,
          },
        ],
      };

      mockPrismaService.finCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(800) }, // 不满足
      });
      mockPrismaService.umsMember.count.mockResolvedValue(10); // 满足

      const result = await service.checkCondition(tenantId, memberId, condition);

      expect(result.passed).toBe(true);
      expect(result.results[0].passed).toBe(false);
      expect(result.results[1].passed).toBe(true);
    });

    it('应该支持不同的运算符', async () => {
      const condition = {
        type: 'AND' as const,
        rules: [
          {
            field: 'totalCommission' as const,
            operator: '>' as const,
            value: 1000,
          },
          {
            field: 'directReferrals' as const,
            operator: '<=' as const,
            value: 10,
          },
        ],
      };

      mockPrismaService.finCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1001) },
      });
      mockPrismaService.umsMember.count.mockResolvedValue(8);

      const result = await service.checkCondition(tenantId, memberId, condition);

      expect(result.passed).toBe(true);
    });
  });

  describe('getTotalCommission', () => {
    it('应该返回累计佣金', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.finCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(1500.50) },
      });

      const result = await service['getTotalCommission'](tenantId, memberId);

      expect(result).toBe(1500.50);
      expect(mockPrismaService.finCommission.aggregate).toHaveBeenCalledWith({
        where: {
          tenantId,
          beneficiaryId: memberId,
          status: 'SETTLED',
        },
        _sum: {
          amount: true,
        },
      });
    });

    it('应该在没有佣金时返回0', async () => {
      mockPrismaService.finCommission.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service['getTotalCommission']('T001', 'M001');

      expect(result).toBe(0);
    });
  });

  describe('getRecentCommission', () => {
    it('应该返回近期佣金', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';
      const days = 30;

      mockPrismaService.finCommission.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(500) },
      });

      const result = await service['getRecentCommission'](tenantId, memberId, days);

      expect(result).toBe(500);
      expect(mockPrismaService.finCommission.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            beneficiaryId: memberId,
            status: 'SETTLED',
            settleTime: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getTotalOrders', () => {
    it('应该返回累计订单数', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.omsOrder.count.mockResolvedValue(50);

      const result = await service['getTotalOrders'](tenantId, memberId);

      expect(result).toBe(50);
      expect(mockPrismaService.omsOrder.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          OR: [{ shareUserId: memberId }, { referrerId: memberId }],
          status: {
            in: ['PAID', 'SHIPPED', 'COMPLETED'],
          },
        },
      });
    });
  });

  describe('getRecentOrders', () => {
    it('应该返回近期订单数', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';
      const days = 30;

      mockPrismaService.omsOrder.count.mockResolvedValue(10);

      const result = await service['getRecentOrders'](tenantId, memberId, days);

      expect(result).toBe(10);
      expect(mockPrismaService.omsOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            createTime: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getDirectReferrals', () => {
    it('应该返回直推人数', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.umsMember.count.mockResolvedValue(15);

      const result = await service['getDirectReferrals'](tenantId, memberId);

      expect(result).toBe(15);
      expect(mockPrismaService.umsMember.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          parentId: memberId,
          levelId: {
            gte: 1,
          },
        },
      });
    });
  });

  describe('getTeamSize', () => {
    it('应该返回团队规模', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.umsMember.count.mockResolvedValue(50);

      const result = await service['getTeamSize'](tenantId, memberId);

      expect(result).toBe(50);
      expect(mockPrismaService.umsMember.count).toHaveBeenCalledWith({
        where: {
          tenantId,
          OR: [{ parentId: memberId }, { indirectParentId: memberId }],
          levelId: {
            gte: 1,
          },
        },
      });
    });
  });

  describe('batchCheckUpgrade', () => {
    it('应该批量检查升级条件', async () => {
      const tenantId = 'T001';
      const memberIds = ['M001', 'M002', 'M003'];
      const targetLevelId = 2;
      const condition = {
        type: 'AND' as const,
        rules: [
          {
            field: 'totalCommission' as const,
            operator: '>=' as const,
            value: 1000,
          },
        ],
      };

      // M001: 满足条件
      // M002: 不满足条件
      // M003: 满足条件
      mockPrismaService.finCommission.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(1500) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(500) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(2000) } });

      const results = await service.batchCheckUpgrade(tenantId, memberIds, targetLevelId, condition);

      expect(results.size).toBe(3);
      expect(results.get('M001')).toBe(true);
      expect(results.get('M002')).toBe(false);
      expect(results.get('M003')).toBe(true);
    });
  });

  describe('batchCheckMaintain', () => {
    it('应该批量检查保级条件', async () => {
      const tenantId = 'T001';
      const memberIds = ['M001', 'M002'];
      const condition = {
        type: 'AND' as const,
        rules: [
          {
            field: 'recentCommission' as const,
            operator: '>=' as const,
            value: 100,
            days: 30,
          },
        ],
      };

      mockPrismaService.finCommission.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(150) } })
        .mockResolvedValueOnce({ _sum: { amount: new Decimal(50) } });

      const results = await service.batchCheckMaintain(tenantId, memberIds, condition);

      expect(results.size).toBe(2);
      expect(results.get('M001')).toBe(true);
      expect(results.get('M002')).toBe(false);
    });
  });
});
