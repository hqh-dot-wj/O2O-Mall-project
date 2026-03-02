import { Test, TestingModule } from '@nestjs/testing';
import { MarketingStockMode, PlayInstanceStatus } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { PlayInstanceService } from './instance.service';
import { PlayInstanceRepository } from './instance.repository';
import { WalletService } from 'src/module/finance/wallet/wallet.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserAssetService } from '../asset/asset.service';
import { ConfigService } from 'src/module/admin/system/config/config.service';
import { IdempotencyService } from './idempotency.service';
import { MarketingEventEmitter } from '../events/marketing-event.emitter';
import { GrayReleaseService } from '../gray/gray-release.service';
import { PlayStrategyFactory } from '../play/play.factory';
import { MarketingStockService } from '../stock/stock.service';

describe('PlayInstanceService', () => {
  let service: PlayInstanceService;

  const mockRepo = {
    search: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findByOrderSn: jest.fn(),
  };

  const mockWalletService = {
    getOrCreateWallet: jest.fn(),
    addBalance: jest.fn(),
  };

  const mockPrisma = {
    storePlayConfig: {
      findUnique: jest.fn(),
    },
  };

  const mockAssetService = {
    grantAsset: jest.fn(),
  };

  const mockConfigService = {
    getSystemConfigValue: jest.fn(),
  };

  const mockIdempotencyService = {
    checkJoinIdempotency: jest.fn(),
    cacheJoinResult: jest.fn(),
    checkPaymentIdempotency: jest.fn(),
    markPaymentProcessed: jest.fn(),
    withStateLock: jest.fn(),
  };

  const mockEventEmitter = {
    emitAsync: jest.fn(),
  };

  const mockGrayReleaseService = {
    isInGrayRelease: jest.fn(),
  };

  const mockStrategy = {
    validateJoin: jest.fn(),
    onStatusChange: jest.fn(),
    onPaymentSuccess: jest.fn(),
    getDisplayData: jest.fn(),
  };

  const mockStrategyFactory = {
    getStrategy: jest.fn(),
  };

  const mockStockService = {
    decrement: jest.fn(),
    increment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayInstanceService,
        { provide: PlayInstanceRepository, useValue: mockRepo },
        { provide: WalletService, useValue: mockWalletService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UserAssetService, useValue: mockAssetService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
        { provide: MarketingEventEmitter, useValue: mockEventEmitter },
        { provide: GrayReleaseService, useValue: mockGrayReleaseService },
        { provide: PlayStrategyFactory, useValue: mockStrategyFactory },
        { provide: MarketingStockService, useValue: mockStockService },
      ],
    }).compile();

    service = module.get<PlayInstanceService>(PlayInstanceService);
    jest.clearAllMocks();

    mockIdempotencyService.checkJoinIdempotency.mockResolvedValue(null);
    mockIdempotencyService.cacheJoinResult.mockResolvedValue(undefined);
    mockIdempotencyService.withStateLock.mockImplementation(
      async (_instanceId: string, callback: () => Promise<unknown>) => callback(),
    );
    mockGrayReleaseService.isInGrayRelease.mockResolvedValue(true);
    mockStrategyFactory.getStrategy.mockReturnValue(mockStrategy);
    mockStrategy.validateJoin.mockResolvedValue(undefined);
    mockStrategy.onStatusChange.mockResolvedValue(undefined);
    mockEventEmitter.emitAsync.mockResolvedValue(undefined);
    mockRepo.create.mockImplementation(async (data: Record<string, unknown>) => ({
      id: 'ins-1',
      tenantId: data.tenantId,
      memberId: data.memberId,
      configId: data.configId,
      templateCode: data.templateCode,
      instanceData: data.instanceData,
      status: data.status,
    }));
    mockRepo.updateStatus.mockImplementation(
      async (id: string, status: PlayInstanceStatus, instanceData: Record<string, unknown>) => ({
        id,
        tenantId: 't-1',
        memberId: 'm-1',
        configId: 'cfg-1',
        templateCode: 'FLASH_SALE',
        instanceData,
        status,
      }),
    );
  });

  // R-FLOW-INSTANCE-02
  it('Given STRONG_LOCK 配置, When create, Then 先预扣库存并写入库存锁标记', async () => {
    mockPrisma.storePlayConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      storeId: 'store-1',
      templateCode: 'FLASH_SALE',
      stockMode: MarketingStockMode.STRONG_LOCK,
      rules: {},
    });
    mockStockService.decrement.mockResolvedValue(true);

    await service.create({
      tenantId: 't-1',
      memberId: 'm-1',
      configId: 'cfg-1',
      templateCode: 'FLASH_SALE',
      instanceData: { quantity: 2 },
    });

    expect(mockStockService.decrement).toHaveBeenCalledWith(
      'cfg-1',
      2,
      MarketingStockMode.STRONG_LOCK,
    );
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceData: expect.objectContaining({
          quantity: 2,
          stockLocked: true,
          stockReleased: false,
          stockLockQuantity: 2,
        }),
      }),
    );
  });

  // R-BRANCH-INSTANCE-01
  it('Given 预扣库存成功, When create 落库失败, Then 自动回补库存', async () => {
    mockPrisma.storePlayConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      storeId: 'store-1',
      templateCode: 'FLASH_SALE',
      stockMode: MarketingStockMode.STRONG_LOCK,
      rules: {},
    });
    mockStockService.decrement.mockResolvedValue(true);
    mockRepo.create.mockRejectedValue(new Error('db failed'));

    await expect(
      service.create({
        tenantId: 't-1',
        memberId: 'm-1',
        configId: 'cfg-1',
        templateCode: 'FLASH_SALE',
        instanceData: { quantity: 2 },
      }),
    ).rejects.toThrow('db failed');

    expect(mockStockService.increment).toHaveBeenCalledWith('cfg-1', 2);
  });

  // R-BRANCH-INSTANCE-02
  it('Given 实例已锁库存且未释放, When 流转到 TIMEOUT, Then 回补库存并标记已释放', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'ins-1',
      configId: 'cfg-1',
      memberId: 'm-1',
      tenantId: 't-1',
      templateCode: 'FLASH_SALE',
      status: PlayInstanceStatus.PENDING_PAY,
      instanceData: {
        quantity: 3,
        stockLocked: true,
        stockReleased: false,
      },
    });

    await service.transitStatus('ins-1', PlayInstanceStatus.TIMEOUT);

    expect(mockStockService.increment).toHaveBeenCalledWith('cfg-1', 3);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(
      'ins-1',
      PlayInstanceStatus.TIMEOUT,
      expect.objectContaining({
        stockLocked: true,
        stockReleased: true,
      }),
    );
  });

  // R-PRE-INSTANCE-04
  it('Given 批量中存在非法状态流转, When batchTransitStatus, Then 直接拒绝并抛错', async () => {
    mockRepo.findMany.mockResolvedValue([
      {
        id: 'ins-1',
        status: PlayInstanceStatus.TIMEOUT,
      },
    ]);

    await expect(
      service.batchTransitStatus(['ins-1'], PlayInstanceStatus.SUCCESS),
    ).rejects.toThrow(BusinessException);
  });

  // R-FLOW-INSTANCE-05
  it('Given 批量流转均合法, When batchTransitStatus, Then 逐条复用 transitStatus', async () => {
    mockRepo.findMany.mockResolvedValue([
      { id: 'ins-1', status: PlayInstanceStatus.PAID },
      { id: 'ins-2', status: PlayInstanceStatus.ACTIVE },
    ]);
    const transitSpy = jest
      .spyOn(service, 'transitStatus')
      .mockResolvedValue({ data: null } as never);

    await service.batchTransitStatus(
      ['ins-1', 'ins-2'],
      PlayInstanceStatus.SUCCESS,
      { source: 'batch' },
    );

    expect(transitSpy).toHaveBeenCalledTimes(2);
    expect(transitSpy).toHaveBeenNthCalledWith(
      1,
      'ins-1',
      PlayInstanceStatus.SUCCESS,
      { source: 'batch' },
    );
    expect(transitSpy).toHaveBeenNthCalledWith(
      2,
      'ins-2',
      PlayInstanceStatus.SUCCESS,
      { source: 'batch' },
    );
  });

  // R-FLOW-MAAS-02
  it('Given SUCCESS 流转且规则含 giftAssetType, When transitStatus, Then 发放资产类型取 rules.giftAssetType', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'ins-1',
      configId: 'cfg-1',
      memberId: 'm-1',
      tenantId: 't-1',
      templateCode: 'FLASH_SALE',
      status: PlayInstanceStatus.ACTIVE,
      instanceData: { price: 100 },
    });
    mockRepo.updateStatus.mockResolvedValue({
      id: 'ins-1',
      configId: 'cfg-1',
      memberId: 'm-1',
      tenantId: 't-1',
      templateCode: 'FLASH_SALE',
      status: PlayInstanceStatus.SUCCESS,
      instanceData: { price: 100 },
    });
    mockPrisma.storePlayConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      storeId: 'store-1',
      rules: {
        giftAssetId: 'asset-1',
        giftAssetName: '次卡权益',
        giftAssetType: 'TIMES_CARD',
        giftCount: 2,
      },
    });
    mockConfigService.getSystemConfigValue.mockResolvedValue('0.02');
    mockWalletService.getOrCreateWallet.mockResolvedValue({ id: 'wallet-1' });
    mockWalletService.addBalance.mockResolvedValue(undefined);
    mockAssetService.grantAsset.mockResolvedValue(undefined);

    await service.transitStatus('ins-1', PlayInstanceStatus.SUCCESS);

    const settleAmount = mockWalletService.addBalance.mock.calls[0][1];
    expect(settleAmount.toString()).toBe('98');
    expect(mockAssetService.grantAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        assetType: 'TIMES_CARD',
        balance: expect.anything(),
      }),
    );
  });

  // R-PRE-MAAS-01
  it('Given fee_rate 配置缺失, When SUCCESS 流转触发入账, Then 抛出业务异常', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'ins-1',
      configId: 'cfg-1',
      memberId: 'm-1',
      tenantId: 't-1',
      templateCode: 'FLASH_SALE',
      status: PlayInstanceStatus.ACTIVE,
      instanceData: { price: 100 },
    });
    mockRepo.updateStatus.mockResolvedValue({
      id: 'ins-1',
      configId: 'cfg-1',
      memberId: 'm-1',
      tenantId: 't-1',
      templateCode: 'FLASH_SALE',
      status: PlayInstanceStatus.SUCCESS,
      instanceData: { price: 100 },
    });
    mockPrisma.storePlayConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      storeId: 'store-1',
      rules: {},
    });
    mockConfigService.getSystemConfigValue.mockResolvedValue(null);

    await expect(
      service.transitStatus('ins-1', PlayInstanceStatus.SUCCESS),
    ).rejects.toThrow(BusinessException);
  });
});
