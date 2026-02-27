import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { StockService } from './stock.service';
import { TenantSkuRepository } from '../product/tenant-sku.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { ListStockDto } from './dto';

jest.mock('src/common/utils/export', () => ({
  ExportTable: jest.fn().mockResolvedValue(undefined),
}));

describe('StockService - updateStock', () => {
  let service: StockService;

  const mockTenantSkuRepo = {
    updateStockForTenant: jest.fn(),
    findStockList: jest.fn(),
  };

  const mockPrismaService = {
    pmsStockLog: { create: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: TenantSkuRepository, useValue: mockTenantSkuRepo },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStock - 原子操作', () => {
    const mockUpdatedSku = {
      id: 'sku1',
      stock: 110,
      globalSku: {},
      tenantProd: { product: {} },
    };

    it('应该成功增加库存并写入流水', async () => {
      mockTenantSkuRepo.updateStockForTenant.mockResolvedValue({
        updated: true,
        sku: { ...mockUpdatedSku, stock: 110 },
      });

      const dto = { skuId: 'sku1', stockChange: 10 };
      const result = await service.updateStock('t1', dto, 'user1');

      expect(result.data.stock).toBe(110);
      expect(mockTenantSkuRepo.updateStockForTenant).toHaveBeenCalledWith('t1', 'sku1', 10);
      expect(mockPrismaService.pmsStockLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 't1',
          tenantSkuId: 'sku1',
          operatorId: 'user1',
          stockChange: 10,
          stockBefore: 100,
          stockAfter: 110,
          reason: null,
        },
      });
    });

    it('应该成功减少库存 - 库存充足', async () => {
      mockTenantSkuRepo.updateStockForTenant.mockResolvedValue({
        updated: true,
        sku: { ...mockUpdatedSku, stock: 90 },
      });

      const dto = { skuId: 'sku1', stockChange: -10, reason: '盘点调整' };
      const result = await service.updateStock('t1', dto);

      expect(result.data.stock).toBe(90);
      expect(mockTenantSkuRepo.updateStockForTenant).toHaveBeenCalledWith('t1', 'sku1', -10);
      expect(mockPrismaService.pmsStockLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 't1',
          tenantSkuId: 'sku1',
          operatorId: '',
          stockChange: -10,
          stockBefore: 100,
          stockAfter: 90,
          reason: '盘点调整',
        },
      });
    });

    it('应该抛出异常 - 库存变动值为零', async () => {
      const dto = { skuId: 'sku1', stockChange: 0 };

      const err = await service.updateStock('t1', dto).catch((e) => e);
      expect(err).toBeInstanceOf(BusinessException);
      expect(err.response.msg).toBe('库存变动值不能为零');
      expect(mockTenantSkuRepo.updateStockForTenant).not.toHaveBeenCalled();
    });

    it('应该抛出异常 - SKU不存在', async () => {
      mockTenantSkuRepo.updateStockForTenant.mockResolvedValue({ updated: false, sku: null });

      const dto = { skuId: 'sku1', stockChange: 10 };

      const err = await service.updateStock('t1', dto).catch((e) => e);
      expect(err).toBeInstanceOf(BusinessException);
      expect(err.response.msg).toBe('SKU不存在或无权访问');
    });

    it('应该抛出异常 - 库存不足', async () => {
      mockTenantSkuRepo.updateStockForTenant.mockResolvedValue({
        updated: false,
        sku: { id: 'sku1', stock: 100, tenantProd: { tenantId: 't1' } },
      });

      const dto = { skuId: 'sku1', stockChange: -150 };

      const err = await service.updateStock('t1', dto).catch((e) => e);
      expect(err).toBeInstanceOf(BusinessException);
      expect(err.response.msg).toBe('库存不足,当前库存: 100, 需要: 150');
    });

    it('应该抛出异常 - 租户无权访问', async () => {
      mockTenantSkuRepo.updateStockForTenant.mockResolvedValue({ updated: false, sku: null });

      const dto = { skuId: 'sku1', stockChange: 10 };

      const err = await service.updateStock('t1', dto).catch((e) => e);
      expect(err.response.msg).toBe('SKU不存在或无权访问');
    });

    it('应该处理边界情况 - 库存减为0', async () => {
      mockTenantSkuRepo.updateStockForTenant.mockResolvedValue({
        updated: true,
        sku: { ...mockUpdatedSku, stock: 0 },
      });

      const dto = { skuId: 'sku1', stockChange: -100 };
      const result = await service.updateStock('t1', dto);

      expect(result.data.stock).toBe(0);
    });
  });

  describe('batchUpdateStock', () => {
    it('应该全部成功', async () => {
      mockTenantSkuRepo.updateStockForTenant
        .mockResolvedValueOnce({ updated: true, sku: { id: 's1', stock: 110 } })
        .mockResolvedValueOnce({ updated: true, sku: { id: 's2', stock: 55 } });

      const dto = {
        items: [
          { skuId: 's1', stockChange: 10 },
          { skuId: 's2', stockChange: 5 },
        ],
      };
      const result = await service.batchUpdateStock('t1', dto, 'user1');

      expect(result.data.successCount).toBe(2);
      expect(result.data.failCount).toBe(0);
      expect(result.data.details).toHaveLength(2);
      expect(result.data.details.every((d) => d.success)).toBe(true);
    });

    it('应该部分成功部分失败', async () => {
      mockTenantSkuRepo.updateStockForTenant
        .mockResolvedValueOnce({ updated: true, sku: { id: 's1', stock: 110 } })
        .mockResolvedValueOnce({ updated: false, sku: { id: 's2', stock: 3 } });

      const dto = {
        items: [
          { skuId: 's1', stockChange: 10 },
          { skuId: 's2', stockChange: -10 },
        ],
      };
      const result = await service.batchUpdateStock('t1', dto);

      expect(result.data.successCount).toBe(1);
      expect(result.data.failCount).toBe(1);
      expect(result.data.details[0].success).toBe(true);
      expect(result.data.details[1].success).toBe(false);
      expect(result.data.details[1].error).toContain('库存不足');
    });

    it('应该跳过 stockChange 为 0 的项', async () => {
      const dto = {
        items: [{ skuId: 's1', stockChange: 0 }],
      };
      const result = await service.batchUpdateStock('t1', dto);

      expect(result.data.successCount).toBe(0);
      expect(result.data.failCount).toBe(1);
      expect(result.data.details[0].error).toBe('库存变动值不能为零');
      expect(mockTenantSkuRepo.updateStockForTenant).not.toHaveBeenCalled();
    });
  });

  describe('exportStock', () => {
    it('应该正确调用 findStockList 和 ExportTable', async () => {
      const mockRecords = [
        {
          id: 'sku1',
          stock: 10,
          price: 99.9,
          tenantProd: { product: { name: '商品A' } },
          globalSku: { specValues: '红色/M' },
        },
      ];
      mockTenantSkuRepo.findStockList.mockResolvedValue([mockRecords, 1]);

      const mockRes = {} as Response;
      const query = { productName: '商品A' } as ListStockDto;

      await TenantContext.run({ tenantId: 't1' }, async () => {
        await service.exportStock(query, mockRes);
      });

      expect(mockTenantSkuRepo.findStockList).toHaveBeenCalledWith('t1', {
        skip: 0,
        take: 5000,
        productName: '商品A',
      });

      const { ExportTable } = await import('src/common/utils/export');
      expect(ExportTable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            {
              productName: '商品A',
              specValues: '红色/M',
              stock: 10,
              price: 99.9,
              skuId: 'sku1',
            },
          ],
          header: expect.any(Array),
          sheetName: '库存列表',
          filename: expect.stringMatching(/^库存数据_\d{4}-\d{2}-\d{2}\.xlsx$/),
        }),
        mockRes,
      );
    });

    it('应该处理空规格和空商品名', async () => {
      mockTenantSkuRepo.findStockList.mockResolvedValue([
        [
          {
            id: 'sku2',
            stock: 0,
            price: 0,
            tenantProd: { product: {} },
            globalSku: {},
          },
        ],
        1,
      ]);

      const mockRes = {} as Response;
      await TenantContext.run({ tenantId: 't1' }, async () => {
        await service.exportStock({} as ListStockDto, mockRes);
      });

      const { ExportTable } = await import('src/common/utils/export');
      expect(ExportTable).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            {
              productName: '',
              specValues: '',
              stock: 0,
              price: 0,
              skuId: 'sku2',
            },
          ],
        }),
        mockRes,
      );
    });
  });
});
