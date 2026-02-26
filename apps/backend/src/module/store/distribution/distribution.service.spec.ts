import { Test, TestingModule } from '@nestjs/testing';
import { DistributionService } from './distribution.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { BusinessConstants } from 'src/common/constants/business.constants';
import { ProductConfigService } from './services/product-config.service';

describe('DistributionService', () => {
  let service: DistributionService;
  let prisma: PrismaService;
  let productConfigService: ProductConfigService;

  const mockPrisma = {
    sysDistConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    sysDistConfigLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    sysTenant: {
      findUnique: jest.fn(),
    },
    umsMember: {
      findUnique: jest.fn(),
    },
    pmsTenantSku: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockProductConfigService = {
    getEffectiveConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductConfigService, useValue: mockProductConfigService },
      ],
    }).compile();

    service = module.get<DistributionService>(DistributionService);
    prisma = module.get<PrismaService>(PrismaService);
    productConfigService = module.get<ProductConfigService>(ProductConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return default config if none exists', async () => {
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(null);
      const result = await service.getConfig('tenant1');

      expect(result.data.level1Rate).toBe(10); // 10%
      expect(result.data.level2Rate).toBe(5); // 5%
      expect(result.data.enableLV0).toBe(true);
      expect(result.data.commissionBaseType).toBe('ORIGINAL_PRICE');
      expect(result.data.maxCommissionRate).toBe(50);
    });

    it('should return stored config', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant1',
        level1Rate: 0.15,
        level2Rate: 0.1,
        enableLV0: true,
        createTime: new Date(),
      };
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getConfig('tenant1');
      expect(result.data.level1Rate).toBe(15);
      expect(result.data.level2Rate).toBe(10);
    });

    it('should return commissionBaseType and maxCommissionRate from stored config', async () => {
      const mockConfig = {
        id: 1,
        tenantId: 'tenant1',
        level1Rate: 0.2,
        level2Rate: 0.1,
        enableLV0: true,
        commissionBaseType: 'ACTUAL_PAID',
        maxCommissionRate: 0.3,
        createTime: new Date(),
      };
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getConfig('tenant1');
      expect(result.data.commissionBaseType).toBe('ACTUAL_PAID');
      expect(result.data.maxCommissionRate).toBe(30);
    });
  });

  describe('updateConfig', () => {
    const dto = {
      level1Rate: 20,
      level2Rate: 10,
      enableLV0: true,
      enableCrossTenant: true,
      crossTenantRate: 80,
      crossMaxDaily: 1000,
    };

    it('should throw error if total rate > 100%', async () => {
      const invalidDto = { ...dto, level1Rate: 60, level2Rate: 50 };
      await expect(service.updateConfig('tenant1', invalidDto, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should successfully update and log config', async () => {
      mockPrisma.sysDistConfig.upsert.mockResolvedValue({});
      mockPrisma.sysDistConfigLog.create.mockResolvedValue({});

      await service.updateConfig('tenant1', dto, 'admin');

      expect(mockPrisma.sysDistConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            level1Rate: 0.2,
            level2Rate: 0.1,
          }),
        }),
      );
      expect(mockPrisma.sysDistConfigLog.create).toHaveBeenCalled();
    });

    it('should log commissionBaseType and maxCommissionRate in config log', async () => {
      mockPrisma.sysDistConfig.upsert.mockResolvedValue({});
      mockPrisma.sysDistConfigLog.create.mockResolvedValue({});

      await service.updateConfig('tenant1', { ...dto, commissionBaseType: 'ACTUAL_PAID', maxCommissionRate: 60 }, 'admin');

      expect(mockPrisma.sysDistConfigLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commissionBaseType: 'ACTUAL_PAID',
            maxCommissionRate: expect.any(Object), // Prisma.Decimal
          }),
        }),
      );
    });

    it('should persist maxCommissionRate (circuit breaker) as decimal 0-1', async () => {
      mockPrisma.sysDistConfig.upsert.mockResolvedValue({});
      mockPrisma.sysDistConfigLog.create.mockResolvedValue({});

      await service.updateConfig('tenant1', { ...dto, maxCommissionRate: 80 }, 'admin');

      expect(mockPrisma.sysDistConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            maxCommissionRate: 0.8,
          }),
        }),
      );
    });

    it('should persist commissionBaseType when provided', async () => {
      mockPrisma.sysDistConfig.upsert.mockResolvedValue({});
      mockPrisma.sysDistConfigLog.create.mockResolvedValue({});

      await service.updateConfig('tenant1', { ...dto, commissionBaseType: 'ZERO' }, 'admin');

      expect(mockPrisma.sysDistConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            commissionBaseType: 'ZERO',
          }),
        }),
      );
    });
  });

  describe('getCommissionPreview', () => {
    beforeEach(() => {
      // Default mock for product config service - returns tenant default config
      mockProductConfigService.getEffectiveConfig.mockResolvedValue({
        level1Rate: 0.1,
        commissionBaseType: 'ORIGINAL_PRICE',
      });
    });

    it('should return 0 amount when no items provided', async () => {
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({ 
        level1Rate: 0.15, 
        enableCrossTenant: false,
        commissionBaseType: 'ORIGINAL_PRICE'
      });

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [],
      });

      expect(result.data.estimatedAmount).toBe(0);
    });

    it('should calculate commission based on ORIGINAL_PRICE', async () => {
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({ 
        level1Rate: 0.1, 
        enableCrossTenant: false,
        commissionBaseType: 'ORIGINAL_PRICE'
      });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          price: 80,
          globalSku: { 
            guidePrice: 100,
            product: { categoryId: 1 }
          },
        },
        {
          id: 'sku2',
          price: 150,
          globalSku: { 
            guidePrice: 200,
            product: { categoryId: 1 }
          },
        },
      ]);

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [
          { skuId: 'sku1', quantity: 2 },
          { skuId: 'sku2', quantity: 1 },
        ],
      });

      // (100 * 2 + 200 * 1) * 0.1 = 40
      expect(result.data.estimatedAmount).toBe(40);
      expect(result.data.commissionRate).toBe('10%');
    });

    it('should calculate commission based on ACTUAL_PAID', async () => {
      mockProductConfigService.getEffectiveConfig.mockResolvedValue({
        level1Rate: 0.1,
        commissionBaseType: 'ACTUAL_PAID',
      });
      
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({ 
        level1Rate: 0.1, 
        enableCrossTenant: false,
        commissionBaseType: 'ACTUAL_PAID'
      });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          price: 80,
          globalSku: { 
            guidePrice: 100,
            product: { categoryId: 1 }
          },
        },
      ]);

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [{ skuId: 'sku1', quantity: 1 }],
      });

      // 80 * 1 * 0.1 = 8
      expect(result.data.estimatedAmount).toBe(8);
    });

    it('should return 0 amount for ZERO commission base type', async () => {
      mockProductConfigService.getEffectiveConfig.mockResolvedValue({
        level1Rate: 0.1,
        commissionBaseType: 'ZERO',
      });
      
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({ 
        level1Rate: 0.1, 
        enableCrossTenant: false,
        commissionBaseType: 'ZERO'
      });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          price: 100,
          globalSku: { 
            guidePrice: 100,
            product: { categoryId: 1 }
          },
        },
      ]);

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [{ skuId: 'sku1', quantity: 1 }],
      });

      expect(result.data.estimatedAmount).toBe(0);
    });

    it('should apply cross-tenant rate to commission amount', async () => {
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({
        level1Rate: 0.1,
        enableCrossTenant: true,
        crossTenantRate: 0.8,
        commissionBaseType: 'ORIGINAL_PRICE'
      });
      mockPrisma.umsMember.findUnique.mockResolvedValue({ tenantId: 'tenant2' });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          price: 80,
          globalSku: { 
            guidePrice: 100,
            product: { categoryId: 1 }
          },
        },
      ]);

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [{ skuId: 'sku1', quantity: 1 }],
        shareUserId: 'member1',
      });

      // 100 * 1 * 0.1 * 0.8 = 8
      expect(result.data.estimatedAmount).toBe(8);
      expect(result.data.commissionRate).toBe('8%');
      expect(result.data.notice).toContain('Store A');
    });

    it('should return 0 amount if cross-tenant disabled', async () => {
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({
        level1Rate: 0.1,
        enableCrossTenant: false,
        commissionBaseType: 'ORIGINAL_PRICE'
      });
      mockPrisma.umsMember.findUnique.mockResolvedValue({ tenantId: 'tenant2' });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          price: 100,
          globalSku: { 
            guidePrice: 100,
            product: { categoryId: 1 }
          },
        },
      ]);

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [{ skuId: 'sku1', quantity: 1 }],
        shareUserId: 'member1',
      });

      expect(result.data.estimatedAmount).toBe(0);
      expect(result.data.commissionRate).toBe('0%');
      expect(result.data.notice).toContain('未开启跨店分销');
    });

    it('should handle missing SKUs gracefully', async () => {
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({ 
        level1Rate: 0.1, 
        enableCrossTenant: false,
        commissionBaseType: 'ORIGINAL_PRICE'
      });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          price: 100,
          globalSku: { 
            guidePrice: 100,
            product: { categoryId: 1 }
          },
        },
      ]);

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [
          { skuId: 'sku1', quantity: 1 },
          { skuId: 'sku-not-exist', quantity: 1 },
        ],
      });

      // Only sku1 should be calculated: 100 * 1 * 0.1 = 10
      expect(result.data.estimatedAmount).toBe(10);
    });

    it('should default quantity to 1 if not provided', async () => {
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue({ 
        level1Rate: 0.1, 
        enableCrossTenant: false,
        commissionBaseType: 'ORIGINAL_PRICE'
      });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          id: 'sku1',
          price: 80,
          globalSku: { 
            guidePrice: 100,
            product: { categoryId: 1 }
          },
        },
      ]);

      const result = await service.getCommissionPreview({
        tenantId: 'tenant1',
        items: [{ skuId: 'sku1' }],
      });

      // 100 * 1 * 0.1 = 10
      expect(result.data.estimatedAmount).toBe(10);
    });
  });

  describe('getConfigLogs', () => {
    it('should return paginated config logs', async () => {
      const mockLogs = [
        {
          id: 1,
          tenantId: 'tenant1',
          level1Rate: 0.2,
          level2Rate: 0.1,
          enableLV0: true,
          enableCrossTenant: false,
          crossTenantRate: 1,
          crossMaxDaily: 500,
          commissionBaseType: 'ORIGINAL_PRICE',
          maxCommissionRate: 0.5,
          operator: 'admin',
          createTime: new Date(),
        },
      ];

      mockPrisma.$transaction.mockResolvedValue([mockLogs, 1]);

      const result = await service.getConfigLogs('tenant1', { pageNum: 1, pageSize: 10 });

      expect(result.data.rows).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(result.data.rows[0].level1Rate).toBe(20);
      expect(result.data.rows[0].commissionBaseType).toBe('ORIGINAL_PRICE');
      expect(result.data.rows[0].maxCommissionRate).toBe(50);
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 100]);

      const result = await service.getConfigLogs('tenant1', { pageNum: 2, pageSize: 20 });

      expect(result.data.rows).toHaveLength(0);
      expect(result.data.total).toBe(100);
    });
  });
});
