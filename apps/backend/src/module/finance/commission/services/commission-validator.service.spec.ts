import { Test, TestingModule } from '@nestjs/testing';
import { CommissionValidatorService } from './commission-validator.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('CommissionValidatorService', () => {
  let service: CommissionValidatorService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    sysDistBlacklist: {
      findUnique: jest.fn(),
    },
    umsMember: {
      findUnique: jest.fn(),
    },
    finUserDailyQuota: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionValidatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommissionValidatorService>(CommissionValidatorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSelfPurchase', () => {
    it('应该检测到自购 - 订单会员等于分享人', () => {
      const result = service.checkSelfPurchase('member1', 'member1', null);
      expect(result).toBe(true);
    });

    it('应该检测到自购 - 订单会员等于上级', () => {
      const result = service.checkSelfPurchase('member1', null, 'member1');
      expect(result).toBe(true);
    });

    it('应该返回false - 非自购', () => {
      const result = service.checkSelfPurchase('member1', 'member2', 'member3');
      expect(result).toBe(false);
    });
  });

  describe('isUserBlacklisted', () => {
    it('应该返回true - 用户在黑名单', async () => {
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue({
        tenantId: 'tenant1',
        userId: 'user1',
      });

      const result = await service.isUserBlacklisted('tenant1', 'user1');
      expect(result).toBe(true);
    });

    it('应该返回false - 用户不在黑名单', async () => {
      mockPrismaService.sysDistBlacklist.findUnique.mockResolvedValue(null);

      const result = await service.isUserBlacklisted('tenant1', 'user1');
      expect(result).toBe(false);
    });
  });

  describe('checkDailyLimit', () => {
    it('应该通过 - 首次使用且在限额内', async () => {
      const amount = new Decimal(100);
      const limit = new Decimal(500);

      mockPrismaService.finUserDailyQuota.upsert.mockResolvedValue({
        id: 'quota1',
        tenantId: 'tenant1',
        beneficiaryId: 'user1',
        quotaDate: new Date(),
        usedAmount: amount,
        limitAmount: limit,
      });

      const result = await service.checkDailyLimit('tenant1', 'user1', amount, limit);

      expect(result).toBe(true);
      expect(mockPrismaService.finUserDailyQuota.upsert).toHaveBeenCalled();
      expect(mockPrismaService.finUserDailyQuota.update).not.toHaveBeenCalled();
    });

    it('应该通过 - 累计使用在限额内', async () => {
      const amount = new Decimal(100);
      const limit = new Decimal(500);
      const usedAmount = new Decimal(450); // 已使用 350，本次 100，总计 450

      mockPrismaService.finUserDailyQuota.upsert.mockResolvedValue({
        id: 'quota1',
        tenantId: 'tenant1',
        beneficiaryId: 'user1',
        quotaDate: new Date(),
        usedAmount,
        limitAmount: limit,
      });

      const result = await service.checkDailyLimit('tenant1', 'user1', amount, limit);

      expect(result).toBe(true);
      expect(mockPrismaService.finUserDailyQuota.update).not.toHaveBeenCalled();
    });

    it('应该拒绝 - 超出限额并回滚', async () => {
      const amount = new Decimal(200);
      const limit = new Decimal(500);
      const usedAmount = new Decimal(550); // 已使用 350，本次 200，总计 550 > 500

      mockPrismaService.finUserDailyQuota.upsert.mockResolvedValue({
        id: 'quota1',
        tenantId: 'tenant1',
        beneficiaryId: 'user1',
        quotaDate: new Date(),
        usedAmount,
        limitAmount: limit,
      });

      mockPrismaService.finUserDailyQuota.update.mockResolvedValue({
        id: 'quota1',
        usedAmount: new Decimal(350), // 回滚后
      });

      const result = await service.checkDailyLimit('tenant1', 'user1', amount, limit);

      expect(result).toBe(false);
      expect(mockPrismaService.finUserDailyQuota.update).toHaveBeenCalledWith({
        where: {
          tenantId_beneficiaryId_quotaDate: {
            tenantId: 'tenant1',
            beneficiaryId: 'user1',
            quotaDate: expect.any(Date),
          },
        },
        data: {
          usedAmount: {
            decrement: amount,
          },
        },
      });
    });

    it('应该拒绝 - 发生错误时为安全起见拒绝', async () => {
      const amount = new Decimal(100);
      const limit = new Decimal(500);

      mockPrismaService.finUserDailyQuota.upsert.mockRejectedValue(new Error('Database error'));

      const result = await service.checkDailyLimit('tenant1', 'user1', amount, limit);

      expect(result).toBe(false);
    });
  });

  describe('checkCircularReferral', () => {
    beforeEach(() => {
      mockPrismaService.umsMember.findUnique.mockReset();
    });

    it('应该检测到循环推荐', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ memberId: 'member2', parentId: 'member3' })
        .mockResolvedValueOnce({ memberId: 'member3', parentId: 'member1' });

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(true);
    });

    it('应该返回false - 无循环推荐', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ memberId: 'member2', parentId: 'member3' })
        .mockResolvedValueOnce({ memberId: 'member3', parentId: null });

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(false);
    });

    it('应该返回false - 达到最大深度', async () => {
      // Mock 10 层深度
      for (let i = 0; i < 10; i++) {
        mockPrismaService.umsMember.findUnique.mockResolvedValueOnce({
          memberId: `member${i + 2}`,
          parentId: `member${i + 3}`,
        });
      }

      const result = await service.checkCircularReferral('member1', 'member2');

      expect(result).toBe(false);
    });
  });
});
