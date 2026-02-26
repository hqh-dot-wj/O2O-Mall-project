// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ProductConfigService } from './product-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';

describe('ProductConfigService', () => {
  let service: ProductConfigService;

  const mockPrisma = {
    sysDistProductConfig: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    sysDistConfig: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductConfigService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ProductConfigService>(ProductConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      productId: 'prod-1',
      level1Rate: 15,
      level2Rate: 10,
    };

    it('should throw error if neither productId nor categoryId provided', async () => {
      await expect(service.create('tenant1', {}, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if both productId and categoryId provided', async () => {
      await expect(
        service.create('tenant1', { productId: 'prod-1', categoryId: 'cat-1' }, 'admin'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw error if total rate > 100%', async () => {
      await expect(
        service.create('tenant1', { productId: 'prod-1', level1Rate: 60, level2Rate: 50 }, 'admin'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw error if config already exists', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue({ id: 1 });

      await expect(service.create('tenant1', dto, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should create product config successfully', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue(null);
      mockPrisma.sysDistProductConfig.create.mockResolvedValue({
        id: 1,
        tenantId: 'tenant1',
        productId: 'prod-1',
        categoryId: null,
        level1Rate: 0.15,
        level2Rate: 0.1,
        commissionBaseType: null,
        isActive: true,
        createBy: 'admin',
        updateBy: 'admin',
        createTime: new Date(),
        updateTime: new Date(),
      });

      const result = await service.create('tenant1', dto, 'admin');

      expect(result.data.productId).toBe('prod-1');
      expect(result.data.level1Rate).toBe(15);
      expect(result.data.level2Rate).toBe(10);
    });

    it('should create category config successfully', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue(null);
      mockPrisma.sysDistProductConfig.create.mockResolvedValue({
        id: 2,
        tenantId: 'tenant1',
        productId: null,
        categoryId: 'cat-1',
        level1Rate: 0.2,
        level2Rate: 0.15,
        commissionBaseType: 'ACTUAL_PAID',
        isActive: true,
        createBy: 'admin',
        updateBy: 'admin',
        createTime: new Date(),
        updateTime: new Date(),
      });

      const result = await service.create(
        'tenant1',
        { categoryId: 'cat-1', level1Rate: 20, level2Rate: 15, commissionBaseType: 'ACTUAL_PAID' },
        'admin',
      );

      expect(result.data.categoryId).toBe('cat-1');
      expect(result.data.commissionBaseType).toBe('ACTUAL_PAID');
    });
  });

  describe('update', () => {
    it('should throw error if config not found', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue(null);

      await expect(service.update('tenant1', 1, { level1Rate: 20 }, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if updated total rate > 100%', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue({
        id: 1,
        level1Rate: 0.15,
        level2Rate: 0.1,
      });

      await expect(service.update('tenant1', 1, { level1Rate: 60, level2Rate: 50 }, 'admin')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should update config successfully', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue({
        id: 1,
        tenantId: 'tenant1',
        productId: 'prod-1',
        level1Rate: 0.15,
        level2Rate: 0.1,
      });

      mockPrisma.sysDistProductConfig.update.mockResolvedValue({
        id: 1,
        tenantId: 'tenant1',
        productId: 'prod-1',
        categoryId: null,
        level1Rate: 0.2,
        level2Rate: 0.1,
        commissionBaseType: null,
        isActive: true,
        createBy: 'admin',
        updateBy: 'admin',
        createTime: new Date(),
        updateTime: new Date(),
      });

      const result = await service.update('tenant1', 1, { level1Rate: 20 }, 'admin');

      expect(result.data.level1Rate).toBe(20);
    });
  });

  describe('delete', () => {
    it('should throw error if config not found', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue(null);

      await expect(service.delete('tenant1', 1, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should soft delete config successfully', async () => {
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.sysDistProductConfig.update.mockResolvedValue({});

      const result = await service.delete('tenant1', 1, 'admin');

      expect(result.data).toBe(true);
      expect(mockPrisma.sysDistProductConfig.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false, updateBy: 'admin' },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const mockConfigs = [
        {
          id: 1,
          tenantId: 'tenant1',
          productId: 'prod-1',
          categoryId: null,
          level1Rate: 0.15,
          level2Rate: 0.1,
          commissionBaseType: null,
          isActive: true,
          createBy: 'admin',
          updateBy: 'admin',
          createTime: new Date(),
          updateTime: new Date(),
        },
      ];

      mockPrisma.$transaction.mockResolvedValue([mockConfigs, 1]);

      const result = await service.findAll('tenant1', { pageNum: 1, pageSize: 10 });

      expect(result.data.rows).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('should filter by productId', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll('tenant1', { pageNum: 1, pageSize: 10, productId: 'prod-1' });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getEffectiveConfig', () => {
    const tenantConfig = {
      tenantId: 'tenant1',
      level1Rate: 0.1,
      level2Rate: 0.05,
      commissionBaseType: 'ORIGINAL_PRICE',
      enableLV0: true,
      enableCrossTenant: false,
      crossTenantRate: 1.0,
      crossMaxDaily: 500,
      maxCommissionRate: 0.5,
    };

    it('should return tenant config if no product config', async () => {
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(tenantConfig);
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue(null);

      const result = await service.getEffectiveConfig('tenant1', 'prod-1');

      expect(result.level1Rate).toBe(0.1);
      expect(result.level2Rate).toBe(0.05);
    });

    it('should return merged config with product config', async () => {
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(tenantConfig);
      mockPrisma.sysDistProductConfig.findFirst.mockResolvedValue({
        level1Rate: 0.2,
        level2Rate: 0.15,
        commissionBaseType: 'ACTUAL_PAID',
      });

      const result = await service.getEffectiveConfig('tenant1', 'prod-1');

      expect(result.level1Rate).toBe(0.2);
      expect(result.level2Rate).toBe(0.15);
      expect(result.commissionBaseType).toBe('ACTUAL_PAID');
      expect(result.enableLV0).toBe(true); // from tenant config
    });

    it('should prioritize product config over category config', async () => {
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(tenantConfig);
      mockPrisma.sysDistProductConfig.findFirst
        .mockResolvedValueOnce({ level1Rate: 0.25 }) // product config
        .mockResolvedValueOnce({ level1Rate: 0.15 }); // category config (should not be used)

      const result = await service.getEffectiveConfig('tenant1', 'prod-1', 'cat-1');

      expect(result.level1Rate).toBe(0.25);
    });

    it('should use category config if no product config', async () => {
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(tenantConfig);
      mockPrisma.sysDistProductConfig.findFirst
        .mockResolvedValueOnce(null) // no product config
        .mockResolvedValueOnce({ level1Rate: 0.15 }); // category config

      const result = await service.getEffectiveConfig('tenant1', 'prod-1', 'cat-1');

      expect(result.level1Rate).toBe(0.15);
    });

    it('should return null if tenant config not found', async () => {
      mockPrisma.sysDistConfig.findUnique.mockResolvedValue(null);

      const result = await service.getEffectiveConfig('tenant1', 'prod-1');

      expect(result).toBeNull();
    });
  });
});
