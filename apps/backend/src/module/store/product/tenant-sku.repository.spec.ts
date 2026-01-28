import { Test, TestingModule } from '@nestjs/testing';
import { TenantSkuRepository } from './tenant-sku.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

describe('TenantSkuRepository', () => {
  let repository: TenantSkuRepository;
  let prismaService: PrismaService;

  const mockPrismaService = {
    pmsTenantSku: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockClsService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantSkuRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile();

    repository = module.get<TenantSkuRepository>(TenantSkuRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updatePriceWithVersion', () => {
    it('应该成功更新价格 - 版本号匹配', async () => {
      const mockSku = {
        tenantSkuId: 'sku1',
        price: 100,
        version: 6,
      };

      mockPrismaService.pmsTenantSku.update.mockResolvedValue(mockSku);

      const result = await repository.updatePriceWithVersion('sku1', 100, 5);

      expect(result).toEqual(mockSku);
      expect(mockPrismaService.pmsTenantSku.update).toHaveBeenCalledWith({
        where: {
          tenantSkuId: 'sku1',
          version: 5,
        },
        data: {
          price: 100,
          version: { increment: 1 },
          updateTime: expect.any(Date),
        },
      });
    });

    it('应该返回null - 版本号不匹配', async () => {
      mockPrismaService.pmsTenantSku.update.mockRejectedValue(new Error('Record not found'));

      const result = await repository.updatePriceWithVersion('sku1', 100, 5);

      expect(result).toBeNull();
    });
  });

  describe('incrementStock', () => {
    it('应该原子增加库存', async () => {
      const mockSku = {
        tenantSkuId: 'sku1',
        stock: 110,
      };

      mockPrismaService.pmsTenantSku.update.mockResolvedValue(mockSku);

      const result = await repository.incrementStock('sku1', 10);

      expect(result).toEqual(mockSku);
      expect(mockPrismaService.pmsTenantSku.update).toHaveBeenCalledWith({
        where: { tenantSkuId: 'sku1' },
        data: {
          stock: { increment: 10 },
          updateTime: expect.any(Date),
        },
      });
    });
  });

  describe('decrementStock', () => {
    it('应该原子减少库存', async () => {
      const mockSku = {
        tenantSkuId: 'sku1',
        stock: 90,
      };

      mockPrismaService.pmsTenantSku.update.mockResolvedValue(mockSku);

      const result = await repository.decrementStock('sku1', 10);

      expect(result).toEqual(mockSku);
      expect(mockPrismaService.pmsTenantSku.update).toHaveBeenCalledWith({
        where: { tenantSkuId: 'sku1' },
        data: {
          stock: { decrement: 10 },
          updateTime: expect.any(Date),
        },
      });
    });
  });

  describe('updateStockSafely', () => {
    it('应该成功增加库存', async () => {
      const mockSku = {
        tenantSkuId: 'sku1',
        stock: 110,
      };

      mockPrismaService.pmsTenantSku.update.mockResolvedValue(mockSku);

      const result = await repository.updateStockSafely('sku1', 10);

      expect(result).toEqual(mockSku);
    });

    it('应该成功减少库存 - 库存充足', async () => {
      const mockSku = {
        tenantSkuId: 'sku1',
        stock: 100,
      };

      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockPrismaService.pmsTenantSku.update.mockResolvedValue({
        ...mockSku,
        stock: 90,
      });

      const result = await repository.updateStockSafely('sku1', -10);

      expect(result).toBeDefined();
      expect(result.stock).toBe(90);
    });

    it('应该返回null - 库存不足', async () => {
      const mockSku = {
        tenantSkuId: 'sku1',
        stock: 5,
      };

      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);

      const result = await repository.updateStockSafely('sku1', -10);

      expect(result).toBeNull();
    });

    it('应该返回null - SKU不存在', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(null);

      const result = await repository.updateStockSafely('sku1', -10);

      expect(result).toBeNull();
    });
  });

  describe('findByGlobalSku', () => {
    it('应该根据全局SKU ID查询租户SKU', async () => {
      const mockSku = {
        tenantSkuId: 'tsku1',
        tenantId: 't1',
        skuId: 's1',
      };

      mockPrismaService.pmsTenantSku.findFirst.mockResolvedValue(mockSku);

      const result = await repository.findByGlobalSku('t1', 's1');

      expect(result).toEqual(mockSku);
      expect(mockPrismaService.pmsTenantSku.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 't1', skuId: 's1' },
      });
    });
  });

  describe('batchUpdatePrice', () => {
    it('应该批量更新价格', async () => {
      const updates = [
        { tenantSkuId: 'sku1', price: 100 },
        { tenantSkuId: 'sku2', price: 200 },
      ];

      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      await repository.batchUpdatePrice(updates);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
