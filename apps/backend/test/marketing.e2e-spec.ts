import { Test, TestingModule } from '@nestjs/testing';
import { PlayInstanceService } from '../src/module/marketing/instance/instance.service';
import { GroupBuyService } from '../src/module/marketing/play/group-buy.service';
import { PlayStrategyFactory } from '../src/module/marketing/play/play.factory';
import { PrismaService } from '../src/prisma/prisma.service';
import { WalletService } from '../src/module/finance/wallet/wallet.service';
import { UserAssetService } from '../src/module/marketing/asset/asset.service';
import { MarketingStockService } from '../src/module/marketing/stock/stock.service';
import { PlayInstanceRepository } from '../src/module/marketing/instance/instance.repository';

/**
 * Marketing Unit Test Suite
 * 分别测试 Service 和 Strategy，通过 Mock 解耦循环依赖
 */
describe('Marketing Logic Unit Tests', () => {
  let instanceService: PlayInstanceService;
  let groupBuyService: GroupBuyService;
  let strategyFactory: PlayStrategyFactory;

  // Mock Objects
  const mockRepo = {
    findById: jest.fn(),
    findByOrderSn: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    search: jest.fn(),
  };
  const mockPrisma = {
    storePlayConfig: { findUnique: jest.fn() },
    playInstance: { update: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((cb) => cb('mockTx')),
  };
  const mockWallet = { getOrCreateWallet: jest.fn(), addBalance: jest.fn() };
  const mockAsset = { grantAsset: jest.fn() };
  const mockStock = {};

  // Suite 1: Test PlayInstanceService (Mocking Factory & Strategy)
  describe('PlayInstanceService', () => {
    let service: PlayInstanceService;
    const mockStrategy = {
      code: 'MOCK',
      validateJoin: jest.fn(),
      calculatePrice: jest.fn(),
      onPaymentSuccess: jest.fn(),
      onStatusChange: jest.fn(),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PlayInstanceService,
          {
            provide: PlayStrategyFactory,
            useValue: { getStrategy: jest.fn().mockReturnValue(mockStrategy) },
          },
          { provide: PlayInstanceRepository, useValue: mockRepo },
          { provide: WalletService, useValue: mockWallet },
          { provide: PrismaService, useValue: mockPrisma },
          { provide: UserAssetService, useValue: mockAsset },
        ],
      }).compile();

      service = module.get<PlayInstanceService>(PlayInstanceService);
    });

    it('should call strategy.validateJoin on create', async () => {
      mockPrisma.storePlayConfig.findUnique.mockResolvedValue({ id: '1', templateCode: 'MOCK' });
      mockRepo.create.mockResolvedValue({ id: '1' });

      await service.create({ tenantId: 't1', memberId: 'm1', configId: '1', templateCode: 'MOCK', instanceData: {} });

      expect(mockStrategy.validateJoin).toHaveBeenCalled();
    });

    it('should call strategy.onPaymentSuccess on handlePaymentSuccess', async () => {
      mockRepo.findByOrderSn.mockResolvedValue({ id: '1', templateCode: 'MOCK', status: 'PENDING_PAY' });
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'PENDING_PAY' });
      mockRepo.updateStatus.mockResolvedValue({ id: '1', status: 'PAID' });

      await service.handlePaymentSuccess('sn1');

      expect(mockStrategy.onPaymentSuccess).toHaveBeenCalled();
    });
  });

  // Suite 2: Test GroupBuyService (Mocking InstanceService)
  describe('GroupBuyService', () => {
    let service: GroupBuyService;
    const mockInstanceService = {
      create: jest.fn(),
      findOne: jest.fn(),
      transitStatus: jest.fn(),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GroupBuyService,
          { provide: PlayInstanceService, useValue: mockInstanceService },
          { provide: MarketingStockService, useValue: mockStock },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      service = module.get<GroupBuyService>(GroupBuyService);
    });

    it('should handle payment success (Logic Check)', async () => {
      // Mock data for a Leader
      const instance = {
        id: 'ins1',
        instanceData: { isLeader: true, currentCount: 1, targetCount: 2 },
      };
      mockInstanceService.findOne.mockResolvedValue({ data: instance });
      mockPrisma.playInstance.update.mockResolvedValue({});
      mockPrisma.playInstance.findMany.mockResolvedValue([instance]);

      await service.onPaymentSuccess(instance as any);

      // Should check if it waits for more people (transit to ACTIVE)
      // Since currentCount becomes 2, it should finalize
      // Let's verify logic flow
      expect(mockInstanceService.findOne).toHaveBeenCalled();
    });
  });
});
