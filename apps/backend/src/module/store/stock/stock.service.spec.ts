import { Test, TestingModule } from '@nestjs/testing';
import { StockService } from './stock.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

describe('StockService - updateStock', () => {
  let service: StockService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    pmsTenantSku: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStock - 原子操作', () => {
    const mockSku = {
      tenantSkuId: 'sku1',
      stock: 100,
      tenantProd: {
        tenantId: 't1',
      },
    };

    it('应该成功增加库存', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockPrismaService.pmsTenantSku.update.mockResolvedValue({
        ...mockSku,
        stock: 110,
      });

      const dto = {
        tenantSkuId: 'sku1',
        stockChange: 10,
      };

      const result = await service.updateStock('t1', dto);

      expect(result.data.stock).toBe(110);
      expect(mockPrismaService.pmsTenantSku.update).toHaveBeenCalledWith({
        where: { tenantSkuId: 'sku1' },
        data: {
          stock: { increment: 10 },
          updateTime: expect.any(Date),
        },
      });
    });

    it('应该成功减少库存 - 库存充足', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockPrismaService.pmsTenantSku.update.mockResolvedValue({
        ...mockSku,
        stock: 90,
      });

      const dto = {
        tenantSkuId: 'sku1',
        stockChange: -10,
      };

      const result = await service.updateStock('t1', dto);

      expect(result.data.stock).toBe(90);
      expect(mockPrismaService.pmsTenantSku.update).toHaveBeenCalledWith({
        where: {
          tenantSkuId: 'sku1',
          stock: { gte: 10 },
        },
        data: {
          stock: { increment: -10 },
          updateTime: expect.any(Date),
        },
      });
    });

    it('应该抛出异常 - SKU不存在', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(null);

      const dto = {
        tenantSkuId: 'sku1',
        stockChange: 10,
      };

      await expect(service.updateStock('t1', dto)).rejects.toThrow(
        new BusinessException(ResponseCode.DATA_NOT_FOUND, 'SKU不存在或无权访问'),
      );
    });

    it('应该抛出异常 - 库存不足', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockPrismaService.pmsTenantSku.update.mockResolvedValue(null);

      const dto = {
        tenantSkuId: 'sku1',
        stockChange: -150,
      };

      await expect(service.updateStock('t1', dto)).rejects.toThrow(
        new BusinessException(ResponseCode.BUSINESS_ERROR, '库存不足,当前库存: 100, 需要: 150'),
      );
    });

    it('应该抛出异常 - 租户无权访问', async () => {
      const otherTenantSku = {
        ...mockSku,
        tenantProd: {
          tenantId: 't2',
        },
      };

      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(otherTenantSku);

      const dto = {
        tenantSkuId: 'sku1',
        stockChange: 10,
      };

      await expect(service.updateStock('t1', dto)).rejects.toThrow(
        new BusinessException(ResponseCode.DATA_NOT_FOUND, 'SKU不存在或无权访问'),
      );
    });

    it('应该处理边界情况 - 库存减为0', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockPrismaService.pmsTenantSku.update.mockResolvedValue({
        ...mockSku,
        stock: 0,
      });

      const dto = {
        tenantSkuId: 'sku1',
        stockChange: -100,
      };

      const result = await service.updateStock('t1', dto);

      expect(result.data.stock).toBe(0);
    });
  });
});
