import { Test, TestingModule } from '@nestjs/testing';
import { PlayInstanceService } from './instance/instance.service';
import { GroupBuyService } from './play/group-buy.service';
import { PlayStrategyFactory } from './play/play.factory';
import { PlayInstanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../module/finance/wallet/wallet.service';
import { UserAssetService } from './asset/asset.service';
import { MarketingStockService } from './stock/stock.service';

/**
 * Marketing Integration Test
 * 验证核心链路：InstanceService -> Factory -> GroupBuyStrategy
 */
describe('Marketing Play Integration', () => {
  let instanceService: PlayInstanceService;
  let strategyFactory: PlayStrategyFactory;
  let groupBuyService: GroupBuyService;

  // Mock Repositories & Services
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayInstanceService,
        PlayStrategyFactory,
        GroupBuyService,
        { provide: 'PlayInstanceRepository', useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WalletService, useValue: mockWallet },
        { provide: UserAssetService, useValue: mockAsset },
        { provide: MarketingStockService, useValue: mockStock },
      ],
    }).compile();

    instanceService = module.get<PlayInstanceService>(PlayInstanceService);
    strategyFactory = module.get<PlayStrategyFactory>(PlayStrategyFactory);
    groupBuyService = module.get<GroupBuyService>(GroupBuyService);

    // Explicitly register strategy because onModuleInit might not fire in simple unit test setup without .init()
    (strategyFactory as any).strategies.set('GROUP_BUY', groupBuyService);
  });

  it('should be defined', () => {
    expect(instanceService).toBeDefined();
    expect(strategyFactory).toBeDefined();
    expect(groupBuyService).toBeDefined();
  });

  it('should dispatch to GroupBuyStrategy.validateJoin on create', async () => {
    // Arrange
    const configId = 'cfg_123';
    const mockConfig = { id: configId, templateCode: 'GROUP_BUY', rules: {} };
    mockPrisma.storePlayConfig.findUnique.mockResolvedValue(mockConfig);
    jest.spyOn(groupBuyService, 'validateJoin').mockResolvedValue(undefined);
    mockRepo.create.mockResolvedValue({ id: 'ins_1', status: 'PENDING_PAY' });

    // Act
    await instanceService.create({
      tenantId: 't1',
      memberId: 'm1',
      configId,
      templateCode: 'GROUP_BUY',
      instanceData: {},
    });

    // Assert
    expect(groupBuyService.validateJoin).toHaveBeenCalled();
  });

  it('should dispatch to GroupBuyStrategy.onPaymentSuccess', async () => {
    // Arrange
    const instance = { id: 'ins_1', templateCode: 'GROUP_BUY', status: 'PENDING_PAY' };
    mockRepo.findByOrderSn.mockResolvedValue(instance);
    mockRepo.findById.mockResolvedValue(instance);
    mockRepo.updateStatus.mockResolvedValue({ ...instance, status: 'PAID' });

    jest.spyOn(groupBuyService, 'onPaymentSuccess').mockResolvedValue(undefined);

    // Act
    await instanceService.handlePaymentSuccess('order_sn_123');

    // Assert
    expect(groupBuyService.onPaymentSuccess).toHaveBeenCalledWith(instance);
  });
});
