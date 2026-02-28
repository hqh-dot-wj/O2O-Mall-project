import { Test, TestingModule } from '@nestjs/testing';
import { StoreProductService } from './product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfitValidator } from './profit-validator';
import { TenantProductRepository } from './tenant-product.repository';
import { TenantSkuRepository } from './tenant-sku.repository';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { Decimal } from '@prisma/client/runtime/library';
import { TRANSACTIONAL_KEY } from 'src/common/decorators/transactional.decorator';
import { TenantContext } from 'src/common/tenant/tenant.context';

describe('StoreProductService', () => {
  let service: StoreProductService;

  // PrismaService 仅用于全局商品查询 (pmsProduct)
  const mockPrismaService = {
    pmsProduct: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };

  const mockProfitValidator = {
    validate: jest.fn(),
    validateDistRateRange: jest.fn(),
  };

  // TenantProductRepository mock
  const mockTenantProductRepo = {
    delegate: { upsert: jest.fn(), findMany: jest.fn() },
    findWithRelations: jest.fn(),
    countWithConditions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  // TenantSkuRepository mock
  const mockTenantSkuRepo = {
    delegate: { findUnique: jest.fn(), updateMany: jest.fn(), upsert: jest.fn() },
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreProductService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProfitValidator, useValue: mockProfitValidator },
        { provide: TenantProductRepository, useValue: mockTenantProductRepo },
        { provide: TenantSkuRepository, useValue: mockTenantSkuRepo },
      ],
    }).compile();

    service = module.get<StoreProductService>(StoreProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== T-2: importProduct @Transactional ====================

  describe('importProduct - @Transactional 装饰器', () => {
    it('应该有 @Transactional() 元数据', () => {
      const metadata = Reflect.getMetadata(TRANSACTIONAL_KEY, StoreProductService.prototype.importProduct);
      expect(metadata).toBeDefined();
      expect(metadata.isolationLevel).toBe('ReadCommitted');
    });
  });

  describe('importProduct - 业务逻辑', () => {
    const mockGlobalProduct = {
      productId: 'p1',
      globalSkus: [
        { skuId: 'gs1', costPrice: new Decimal(50), guideRate: new Decimal(0.15), distMode: 'RATIO' },
      ],
    };

    const mockTenantProduct = { id: 'tp1', tenantId: 't1', productId: 'p1', status: 'OFF_SHELF' };

    it('应该成功导入商品（含SKU）', async () => {
      mockPrismaService.pmsProduct.findUnique.mockResolvedValue(mockGlobalProduct);
      mockTenantProductRepo.delegate.upsert.mockResolvedValue(mockTenantProduct);
      mockTenantSkuRepo.delegate.upsert.mockResolvedValue({});

      const dto = {
        productId: 'p1',
        overrideRadius: 5000,
        skus: [{ globalSkuId: 'gs1', price: 100, stock: 50, distMode: 'RATIO', distRate: 0.15 }],
      };

      const result = await service.importProduct('t1', dto);

      expect(result.data).toEqual(mockTenantProduct);
      expect(mockTenantProductRepo.delegate.upsert).toHaveBeenCalled();
      expect(mockTenantSkuRepo.delegate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantProductId_globalSkuId: { tenantProductId: 'tp1', globalSkuId: 'gs1' } },
          create: expect.objectContaining({ globalSkuId: 'gs1' }),
          update: expect.objectContaining({ stock: 50 }),
        }),
      );
      expect(mockProfitValidator.validate).toHaveBeenCalled();
      expect(mockProfitValidator.validateDistRateRange).toHaveBeenCalled();
    });

    it('应该成功导入商品（不含SKU）', async () => {
      mockPrismaService.pmsProduct.findUnique.mockResolvedValue(mockGlobalProduct);
      mockTenantProductRepo.delegate.upsert.mockResolvedValue(mockTenantProduct);

      const result = await service.importProduct('t1', { productId: 'p1', skus: [] });

      expect(result.data).toEqual(mockTenantProduct);
      expect(mockTenantSkuRepo.delegate.upsert).not.toHaveBeenCalled();
    });

    it('应该抛出异常 - 商品不存在', async () => {
      mockPrismaService.pmsProduct.findUnique.mockResolvedValue(null);
      await expect(service.importProduct('t1', { productId: 'invalid', skus: [] })).rejects.toThrow(BusinessException);
    });

    it('应该抛出异常 - 无效的SKU ID', async () => {
      mockPrismaService.pmsProduct.findUnique.mockResolvedValue(mockGlobalProduct);
      const dto = { productId: 'p1', skus: [{ globalSkuId: 'bad-sku', price: 100, stock: 50 }] };
      await expect(service.importProduct('t1', dto)).rejects.toThrow(BusinessException);
    });

    it('重新导入时应该 upsert 更新已有 SKU（T-9）', async () => {
      mockPrismaService.pmsProduct.findUnique.mockResolvedValue(mockGlobalProduct);
      mockTenantProductRepo.delegate.upsert.mockResolvedValue(mockTenantProduct);
      mockTenantSkuRepo.delegate.upsert.mockResolvedValue({ id: 'ts1', price: 120 });

      const dto = {
        productId: 'p1',
        skus: [{ globalSkuId: 'gs1', price: 120, stock: 80, distMode: 'RATIO', distRate: 0.15 }],
      };

      await service.importProduct('t1', dto);

      // 验证 upsert 的 update 部分包含新价格和库存
      expect(mockTenantSkuRepo.delegate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            price: expect.any(Decimal),
            stock: 80,
          }),
        }),
      );
    });
  });

  // ==================== T-7: batchImportProducts ====================

  describe('batchImportProducts', () => {
    const mockGlobalProduct = {
      productId: 'p1',
      globalSkus: [
        { skuId: 'gs1', costPrice: new Decimal(50), guideRate: new Decimal(0.15), distMode: 'RATIO' },
      ],
    };
    const mockTenantProduct = { id: 'tp1', tenantId: 't1', productId: 'p1', status: 'OFF_SHELF' };

    it('应该全部成功导入', async () => {
      mockPrismaService.pmsProduct.findUnique.mockResolvedValue(mockGlobalProduct);
      mockTenantProductRepo.delegate.upsert.mockResolvedValue(mockTenantProduct);
      mockTenantSkuRepo.delegate.upsert.mockResolvedValue({});

      const dto = {
        items: [
          { productId: 'p1', skus: [{ globalSkuId: 'gs1', price: 100, stock: 50 }] },
          { productId: 'p1', skus: [] },
        ],
      };

      const result = await service.batchImportProducts('t1', dto);

      expect(result.data).toEqual({ success: 2, failed: 0, errors: [] });
      expect(result.msg).toContain('成功 2 个');
    });

    it('应该部分成功、部分失败并返回错误明细', async () => {
      mockPrismaService.pmsProduct.findUnique
        .mockResolvedValueOnce(mockGlobalProduct)
        .mockResolvedValueOnce(null);

      mockTenantProductRepo.delegate.upsert.mockResolvedValue(mockTenantProduct);
      mockTenantSkuRepo.delegate.upsert.mockResolvedValue({});

      const dto = {
        items: [
          { productId: 'p1', skus: [] },
          { productId: 'invalid', skus: [] },
        ],
      };

      const result = await service.batchImportProducts('t1', dto);

      expect(result.data?.success).toBe(1);
      expect(result.data?.failed).toBe(1);
      expect(result.data?.errors).toHaveLength(1);
      expect(result.data?.errors?.[0]).toContain('productId=invalid');
      expect(result.data?.errors?.[0]).toMatch(/第 2 项/);
    });
  });

  // ==================== T-10: batchUpdateProductPrice ====================

  describe('batchUpdateProductPrice', () => {
    const mockSku = {
      id: 'sku1',
      price: 100,
      version: 5,
      distMode: 'RATIO',
      distRate: new Decimal(0.15),
      tenantProd: { tenantId: 't1' },
      globalSku: { costPrice: new Decimal(50) },
    };

    it('应该全部成功调价', async () => {
      mockTenantSkuRepo.delegate.findUnique
        .mockResolvedValueOnce(mockSku)
        .mockResolvedValueOnce({ ...mockSku, price: 120, version: 6 })
        .mockResolvedValueOnce(mockSku)
        .mockResolvedValueOnce({ ...mockSku, price: 130, version: 6 });
      mockTenantSkuRepo.delegate.updateMany.mockResolvedValue({ count: 1 });

      const dto = {
        items: [
          { tenantSkuId: 'sku1', price: 120, stock: 50, distRate: 0.15 },
          { tenantSkuId: 'sku1', price: 130, stock: 60, distRate: 0.15 },
        ],
      };

      const result = await service.batchUpdateProductPrice('t1', dto);

      expect(result.data).toEqual({ success: 2, failed: 0, errors: [] });
      expect(result.msg).toContain('成功 2 个');
    });

    it('应该部分成功、部分失败并返回错误明细', async () => {
      mockTenantSkuRepo.delegate.findUnique
        .mockResolvedValueOnce(mockSku)
        .mockResolvedValueOnce({ ...mockSku, price: 120, version: 6 })
        .mockResolvedValueOnce(null);

      mockTenantSkuRepo.delegate.updateMany.mockResolvedValue({ count: 1 });

      const dto = {
        items: [
          { tenantSkuId: 'sku1', price: 120, stock: 50, distRate: 0.15 },
          { tenantSkuId: 'invalid-sku', price: 100, stock: 10, distRate: 0.15 },
        ],
      };

      const result = await service.batchUpdateProductPrice('t1', dto);

      expect(result.data?.success).toBe(1);
      expect(result.data?.failed).toBe(1);
      expect(result.data?.errors).toHaveLength(1);
      expect(result.data?.errors?.[0]).toContain('tenantSkuId=invalid-sku');
      expect(result.data?.errors?.[0]).toMatch(/第 2 项/);
    });
  });

  // ==================== T-6: updateProductPrice @Transactional ====================

  describe('updateProductPrice - @Transactional 装饰器', () => {
    it('应该有 @Transactional() 元数据', () => {
      const metadata = Reflect.getMetadata(TRANSACTIONAL_KEY, StoreProductService.prototype.updateProductPrice);
      expect(metadata).toBeDefined();
      expect(metadata.isolationLevel).toBe('ReadCommitted');
    });
  });

  // ==================== updateProductPrice 乐观锁 ====================

  describe('updateProductPrice - 乐观锁', () => {
    const mockSku = {
      tenantSkuId: 'sku1',
      price: 100,
      version: 5,
      distMode: 'RATIO',
      distRate: new Decimal(0.15),
      tenantProd: { tenantId: 't1' },
      globalSku: { costPrice: new Decimal(50) },
    };

    it('应该成功更新价格 - 版本号匹配', async () => {
      mockTenantSkuRepo.delegate.findUnique
        .mockResolvedValueOnce(mockSku) // 第一次查询
        .mockResolvedValueOnce({ ...mockSku, price: 120, version: 6 }); // 更新后查询
      mockTenantSkuRepo.delegate.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.updateProductPrice('t1', { tenantSkuId: 'sku1', price: 120 });

      expect(result.data.price).toBe(120);
      expect(result.data.version).toBe(6);
      expect(mockProfitValidator.validate).toHaveBeenCalledWith(120, mockSku.globalSku.costPrice, 0.15, 'RATIO');
    });

    it('应该抛出异常 - SKU不存在', async () => {
      mockTenantSkuRepo.delegate.findUnique.mockResolvedValue(null);
      await expect(service.updateProductPrice('t1', { tenantSkuId: 'sku1', price: 120 })).rejects.toThrow(BusinessException);
    });

    it('应该抛出异常 - 无权操作(tenantId不匹配)', async () => {
      mockTenantSkuRepo.delegate.findUnique.mockResolvedValue({
        ...mockSku,
        tenantProd: { tenantId: 'other-tenant' },
      });
      await expect(service.updateProductPrice('t1', { tenantSkuId: 'sku1', price: 120 })).rejects.toThrow(BusinessException);
    });

    it('应该抛出异常 - 版本号不匹配(并发冲突)', async () => {
      mockTenantSkuRepo.delegate.findUnique.mockResolvedValue(mockSku);
      mockTenantSkuRepo.delegate.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.updateProductPrice('t1', { tenantSkuId: 'sku1', price: 120 })).rejects.toThrow(
        new BusinessException(ResponseCode.CONFLICT, '更新失败,数据已被修改,请重试'),
      );
    });

    it('应该抛出异常 - 利润不足', async () => {
      mockTenantSkuRepo.delegate.findUnique.mockResolvedValue(mockSku);
      mockProfitValidator.validate.mockImplementation(() => {
        throw new BusinessException(ResponseCode.PARAM_INVALID, '价格过低,利润不足');
      });

      await expect(service.updateProductPrice('t1', { tenantSkuId: 'sku1', price: 55 })).rejects.toThrow(BusinessException);
    });
  });

  // ==================== T-3: findAll HQ 跨店权限校验 ====================

  describe('findAll - HQ 跨店权限校验', () => {
    const mockListItem = {
      id: 'tp1',
      productId: 'p1',
      status: 'ON_SHELF',
      isHot: false,
      customTitle: null,
      overrideRadius: null,
      product: { name: '测试商品', mainImages: ['img1.jpg'], type: 'NORMAL' },
      skus: [{
        id: 'ts1',
        price: new Decimal(100),
        stock: 50,
        distMode: 'RATIO',
        distRate: new Decimal(0.15),
        isActive: true,
        globalSku: { specValues: '红色', costPrice: new Decimal(50), guidePrice: new Decimal(80) },
      }],
    };

    it('普通门店查询自己的商品 - 应该成功', async () => {
      mockTenantProductRepo.findWithRelations.mockResolvedValue([mockListItem]);
      mockTenantProductRepo.countWithConditions.mockResolvedValue(1);

      const result = await service.findAll('t1', { skip: 0, take: 10 });

      expect(result.data.rows).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('普通门店传入自己的 storeId - 应该成功', async () => {
      mockTenantProductRepo.findWithRelations.mockResolvedValue([mockListItem]);
      mockTenantProductRepo.countWithConditions.mockResolvedValue(1);

      const result = await service.findAll('t1', { storeId: 't1', skip: 0, take: 10 });

      expect(result.data.rows).toHaveLength(1);
    });

    it('普通门店传入其他门店 storeId - 非超管应该被拒绝', async () => {
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      await expect(
        service.findAll('t1', { storeId: 'other-store', skip: 0, take: 10 }),
      ).rejects.toThrow(BusinessException);
    });

    it('超管传入其他门店 storeId - 应该成功', async () => {
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(true);
      mockTenantProductRepo.findWithRelations.mockResolvedValue([mockListItem]);
      mockTenantProductRepo.countWithConditions.mockResolvedValue(1);

      const result = await service.findAll('t1', { storeId: 'other-store', skip: 0, take: 10 });

      expect(result.data.rows).toHaveLength(1);
    });
  });

  // ==================== T-5: updateProductBase 使用 Repository ====================

  describe('updateProductBase - Repository 层', () => {
    const mockTenantProduct = { id: 'tp1', tenantId: 't1', productId: 'p1', status: 'OFF_SHELF' };

    it('应该成功更新商品基础信息', async () => {
      mockTenantProductRepo.findById.mockResolvedValue(mockTenantProduct);
      mockTenantProductRepo.update.mockResolvedValue({ ...mockTenantProduct, status: 'ON_SHELF', customTitle: '新标题' });

      const result = await service.updateProductBase('t1', {
        id: 'tp1',
        status: 'ON_SHELF',
        customTitle: '新标题',
      });

      expect(result.data.status).toBe('ON_SHELF');
      expect(result.data.customTitle).toBe('新标题');
      expect(mockTenantProductRepo.findById).toHaveBeenCalledWith('tp1');
      expect(mockTenantProductRepo.update).toHaveBeenCalledWith('tp1', {
        status: 'ON_SHELF',
        customTitle: '新标题',
        overrideRadius: undefined,
      });
    });

    it('应该抛出异常 - 商品不存在', async () => {
      mockTenantProductRepo.findById.mockResolvedValue(null);
      await expect(service.updateProductBase('t1', { id: 'invalid' })).rejects.toThrow(BusinessException);
    });

    it('应该抛出异常 - 无权操作(tenantId不匹配)', async () => {
      mockTenantProductRepo.findById.mockResolvedValue({ ...mockTenantProduct, tenantId: 'other-tenant' });
      await expect(service.updateProductBase('t1', { id: 'tp1', status: 'ON_SHELF' })).rejects.toThrow(BusinessException);
    });
  });

  // ==================== T-8: removeProduct 移除商品 ====================

  describe('removeProduct - 移除商品', () => {
    it('应该有 @Transactional() 元数据', () => {
      const metadata = Reflect.getMetadata(TRANSACTIONAL_KEY, StoreProductService.prototype.removeProduct);
      expect(metadata).toBeDefined();
    });

    it('应该成功移除下架状态的商品', async () => {
      mockTenantProductRepo.findById.mockResolvedValue({ id: 'tp1', tenantId: 't1', status: 'OFF_SHELF' });
      mockTenantSkuRepo.deleteMany.mockResolvedValue({ count: 2 });
      mockTenantProductRepo.delete.mockResolvedValue({ id: 'tp1' });

      const result = await service.removeProduct('t1', { id: 'tp1' });

      expect(result.msg).toBe('商品已移除');
      expect(mockTenantSkuRepo.deleteMany).toHaveBeenCalledWith({ tenantProductId: 'tp1' });
      expect(mockTenantProductRepo.delete).toHaveBeenCalledWith('tp1');
    });

    it('应该抛出异常 - 商品不存在', async () => {
      mockTenantProductRepo.findById.mockResolvedValue(null);
      await expect(service.removeProduct('t1', { id: 'invalid' })).rejects.toThrow(BusinessException);
    });

    it('应该抛出异常 - 无权操作', async () => {
      mockTenantProductRepo.findById.mockResolvedValue({ id: 'tp1', tenantId: 'other', status: 'OFF_SHELF' });
      await expect(service.removeProduct('t1', { id: 'tp1' })).rejects.toThrow(BusinessException);
    });

    it('应该抛出异常 - 商品处于上架状态', async () => {
      mockTenantProductRepo.findById.mockResolvedValue({ id: 'tp1', tenantId: 't1', status: 'ON_SHELF' });
      await expect(service.removeProduct('t1', { id: 'tp1' })).rejects.toThrow(BusinessException);
    });
  });
});
