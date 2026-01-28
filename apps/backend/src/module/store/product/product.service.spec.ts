import { Test, TestingModule } from '@nestjs/testing';
import { StoreProductService } from './product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitValidator } from './profit-validator';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { Decimal } from '@prisma/client/runtime/library';

describe('StoreProductService - updateProductPrice', () => {
  let service: StoreProductService;
  let prismaService: PrismaService;
  let profitValidator: ProfitValidator;

  const mockPrismaService = {
    pmsTenantSku: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockProfitValidator = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProfitValidator,
          useValue: mockProfitValidator,
        },
      ],
    }).compile();

    service = module.get<StoreProductService>(StoreProductService);
    prismaService = module.get<PrismaService>(PrismaService);
    profitValidator = module.get<ProfitValidator>(ProfitValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProductPrice - 乐观锁', () => {
    const mockSku = {
      tenantSkuId: 'sku1',
      price: 100,
      version: 5,
      costPrice: new Decimal(50),
      tenantProd: {
        distRate: 10,
        distMode: 'PERCENTAGE',
      },
    };

    it('应该成功更新价格 - 版本号匹配', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockProfitValidator.validate.mockReturnValue(undefined);
      mockPrismaService.pmsTenantSku.update.mockResolvedValue({
        ...mockSku,
        price: 120,
        version: 6,
      });

      const dto = {
        tenantSkuId: 'sku1',
        price: 120,
      };

      const result = await service.updateProductPrice('t1', dto);

      expect(result.data.price).toBe(120);
      expect(result.data.version).toBe(6);
      expect(mockProfitValidator.validate).toHaveBeenCalledWith(120, mockSku.costPrice, 10, 'PERCENTAGE');
    });

    it('应该抛出异常 - SKU不存在', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(null);

      const dto = {
        tenantSkuId: 'sku1',
        price: 120,
      };

      await expect(service.updateProductPrice('t1', dto)).rejects.toThrow(BusinessException);
    });

    it('应该抛出异常 - 版本号不匹配(并发冲突)', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockProfitValidator.validate.mockReturnValue(undefined);
      mockPrismaService.pmsTenantSku.update.mockResolvedValue(null);

      const dto = {
        tenantSkuId: 'sku1',
        price: 120,
      };

      await expect(service.updateProductPrice('t1', dto)).rejects.toThrow(
        new BusinessException(ResponseCode.CONFLICT, '更新失败,数据已被修改,请重试'),
      );
    });

    it('应该抛出异常 - 利润不足', async () => {
      mockPrismaService.pmsTenantSku.findUnique.mockResolvedValue(mockSku);
      mockProfitValidator.validate.mockImplementation(() => {
        throw new BusinessException(ResponseCode.PARAM_INVALID, '价格过低,利润不足');
      });

      const dto = {
        tenantSkuId: 'sku1',
        price: 55,
      };

      await expect(service.updateProductPrice('t1', dto)).rejects.toThrow(BusinessException);
    });
  });
});
