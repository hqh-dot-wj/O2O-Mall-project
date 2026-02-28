import { Test, TestingModule } from '@nestjs/testing';
import { PmsProductService } from './product.service';
import { ProductRepository } from './product/product.repository';
import { SkuRepository } from './product/sku.repository';
import { AttributeRepository } from './attribute/attribute.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductType, DistributionMode } from './dto';
import { PublishStatus } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { ProductSyncProducer } from '../store/product/product-sync.queue';

describe('PmsProductService', () => {
  let service: PmsProductService;
  let productRepo: ProductRepository;
  let skuRepo: SkuRepository;
  let attrRepo: AttributeRepository;
  let prisma: PrismaService;
  let productSyncProducer: ProductSyncProducer;

  const mockProduct = {
    productId: 'prod-001',
    categoryId: 1,
    brandId: 1,
    name: '测试商品',
    subTitle: '测试副标题',
    mainImages: ['image1.jpg', 'image2.jpg'],
    detailHtml: '<p>详情</p>',
    type: ProductType.REAL,
    weight: 100,
    isFreeShip: false,
    serviceDuration: null,
    serviceRadius: null,
    needBooking: false,
    specDef: [{ name: '颜色', values: ['红色', '蓝色'] }],
    publishStatus: PublishStatus.ON_SHELF,
    createTime: new Date(),
    updateTime: new Date(),
  };

  const mockSku = {
    skuId: 'sku-001',
    productId: 'prod-001',
    specValues: { 颜色: '红色' },
    skuImage: 'sku1.jpg',
    guidePrice: 100,
    costPrice: 50,
    distMode: DistributionMode.RATIO,
    guideRate: 0.1,
    minDistRate: 0.05,
    maxDistRate: 0.15,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PmsProductService,
        {
          provide: ProductRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findWithRelations: jest.fn(),
            countWithConditions: jest.fn(),
            findOneWithDetails: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: SkuRepository,
          useValue: {
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
            findByProductId: jest.fn(),
          },
        },
        {
          provide: AttributeRepository,
          useValue: {
            validateAttrIds: jest.fn(),
            findMany: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            pmsProductAttrValue: {
              createMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            pmsTenantProduct: {
              count: jest.fn(),
            },
          },
        },
        {
          provide: ProductSyncProducer,
          useValue: {
            notifyOffShelf: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PmsProductService>(PmsProductService);
    productRepo = module.get<ProductRepository>(ProductRepository);
    skuRepo = module.get<SkuRepository>(SkuRepository);
    attrRepo = module.get<AttributeRepository>(AttributeRepository);
    prisma = module.get<PrismaService>(PrismaService);
    productSyncProducer = module.get<ProductSyncProducer>(ProductSyncProducer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('应该成功创建商品（包含 costPrice）', async () => {
      const createDto = {
        categoryId: 1,
        name: '测试商品',
        subTitle: '测试副标题',
        mainImages: ['image1.jpg'],
        detailHtml: '<p>详情</p>',
        type: ProductType.REAL,
        weight: 100,
        isFreeShip: false,
        specDef: [] as any[],
        skus: [
          {
            specValues: {},
            skuImage: 'sku1.jpg',
            guidePrice: 100,
            costPrice: 50, // 验证 costPrice 字段
            distMode: DistributionMode.RATIO,
            guideRate: 0.1,
            minDistRate: 0.05,
            maxDistRate: 0.15,
          },
        ],
        attrs: [] as any[],
        publishStatus: PublishStatus.ON_SHELF,
      };

      jest.spyOn(productRepo, 'create').mockResolvedValue(mockProduct as any);
      jest.spyOn(skuRepo, 'createMany').mockResolvedValue(undefined);

      const result = await service.create(createDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(productRepo.create).toHaveBeenCalled();
      expect(skuRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            costPrice: 50, // 验证 costPrice 被传入
          }),
        ]),
      );
    });

    it('应该在服务类商品缺少 serviceDuration 时抛出异常', async () => {
      const createDto = {
        categoryId: 1,
        name: '测试服务',
        subTitle: '',
        mainImages: ['image1.jpg'],
        detailHtml: '<p>详情</p>',
        type: ProductType.SERVICE,
        serviceDuration: undefined as number | undefined, // 缺少服务时长
        specDef: [] as any[],
        skus: [] as any[],
        attrs: [] as any[],
      };

      await expect(service.create(createDto as any)).rejects.toThrow(BusinessException);
    });

    it('应该在属性ID不存在时抛出异常', async () => {
      const createDto = {
        categoryId: 1,
        name: '测试商品',
        subTitle: '',
        mainImages: ['image1.jpg'],
        detailHtml: '<p>详情</p>',
        type: ProductType.REAL,
        specDef: [] as any[],
        skus: [] as any[],
        attrs: [{ attrId: 999, value: '测试值' }] as any[], // 不存在的属性ID
      };

      jest.spyOn(attrRepo, 'validateAttrIds').mockResolvedValue({
        valid: false,
        invalidIds: [999],
      });

      await expect(service.create(createDto as any)).rejects.toThrow(BusinessException);
    });
  });

  describe('update', () => {
    it('应该支持部分更新（仅更新传入的字段）', async () => {
      const updateDto = {
        name: '新商品名称', // 仅更新名称
      };

      jest.spyOn(productRepo, 'findById').mockResolvedValue(mockProduct as any);
      jest.spyOn(productRepo, 'update').mockResolvedValue({
        ...mockProduct,
        name: '新商品名称',
      } as any);

      const result = await service.update('prod-001', updateDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(productRepo.update).toHaveBeenCalledWith(
        'prod-001',
        expect.objectContaining({
          name: '新商品名称',
        }),
      );
      // 验证其他字段未被传入
      const updateCall = (productRepo.update as jest.Mock).mock.calls[0][1];
      expect(updateCall.subTitle).toBeUndefined();
      expect(updateCall.mainImages).toBeUndefined();
    });

    it('应该在商品不存在时抛出异常', async () => {
      jest.spyOn(productRepo, 'findById').mockResolvedValue(null);

      await expect(service.update('non-exist', { name: '测试' } as any)).rejects.toThrow(
        BusinessException,
      );
    });

    it('应该在更新服务类商品时验证 serviceDuration', async () => {
      const existingProduct = {
        ...mockProduct,
        type: ProductType.REAL, // 现有商品是实体商品
        serviceDuration: null as number | null,
      };

      jest.spyOn(productRepo, 'findById').mockResolvedValue(existingProduct as any);
      jest.spyOn(productRepo, 'update').mockResolvedValue(existingProduct as any);

      // 测试场景：将实体商品改为服务类商品，但不提供 serviceDuration
      const updateDto = {
        type: ProductType.SERVICE, // 改为服务类商品
        // 不提供 serviceDuration
      };

      await expect(service.update('prod-001', updateDto as any)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('findAll', () => {
    it('应该返回商品列表，价格为最低 SKU 价格', async () => {
      const mockProductList = [
        {
          ...mockProduct,
          globalSkus: [
            { guidePrice: 100 },
            { guidePrice: 80 }, // 最低价
            { guidePrice: 120 },
          ] as any[],
        },
      ];

      jest.spyOn(productRepo, 'findWithRelations').mockResolvedValue(mockProductList as any);
      jest.spyOn(productRepo, 'countWithConditions').mockResolvedValue(1);

      const result = await service.findAll({ pageNum: 1, pageSize: 10 } as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect((result.data as any).rows[0].price).toBe(80); // 验证最低价
    });

    it('应该在商品无 SKU 时价格为 0', async () => {
      const mockProductList = [
        {
          ...mockProduct,
          globalSkus: [] as any[],
        },
      ];

      jest.spyOn(productRepo, 'findWithRelations').mockResolvedValue(mockProductList as any);
      jest.spyOn(productRepo, 'countWithConditions').mockResolvedValue(1);

      const result = await service.findAll({ pageNum: 1, pageSize: 10 } as any);

      expect((result.data as any).rows[0].price).toBe(0);
    });
  });

  describe('remove', () => {
    it('应该成功删除未被门店导入的商品', async () => {
      jest.spyOn(productRepo, 'findOneWithDetails').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.pmsTenantProduct, 'count').mockResolvedValue(0); // 未被导入
      jest.spyOn(prisma.pmsProductAttrValue, 'deleteMany').mockResolvedValue({ count: 0 });
      jest.spyOn(skuRepo, 'deleteMany').mockResolvedValue(undefined);
      jest.spyOn(productRepo, 'delete').mockResolvedValue(undefined);

      const result = await service.remove('prod-001');

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(productRepo.delete).toHaveBeenCalledWith('prod-001');
    });

    it('应该在商品不存在时抛出异常', async () => {
      jest.spyOn(productRepo, 'findOneWithDetails').mockResolvedValue(null);

      await expect(service.remove('non-exist')).rejects.toThrow(BusinessException);
    });

    it('应该在商品已被门店导入时拒绝删除', async () => {
      jest.spyOn(productRepo, 'findOneWithDetails').mockResolvedValue(mockProduct as any);
      jest.spyOn(prisma.pmsTenantProduct, 'count').mockResolvedValue(5); // 5家门店已导入

      try {
        await service.remove('prod-001');
        fail('应该抛出异常');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        const response = (error as any).getResponse();
        expect(response.msg).toContain('该商品已被');
        expect(response.msg).toContain('5');
        expect(response.msg).toContain('家门店导入');
      }
    });
  });

  describe('findOne', () => {
    it('应该返回商品详情', async () => {
      const mockProductDetail = {
        ...mockProduct,
        attrValues: [
          {
            attrId: 1,
            value: '测试值',
          },
        ],
      };

      jest.spyOn(productRepo, 'findOneWithDetails').mockResolvedValue(mockProductDetail as any);

      const result = await service.findOne('prod-001');

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.attrs).toEqual([{ attrId: 1, value: '测试值' }]);
    });

    it('应该在商品不存在时抛出异常', async () => {
      jest.spyOn(productRepo, 'findOneWithDetails').mockResolvedValue(null);

      await expect(service.findOne('non-exist')).rejects.toThrow(BusinessException);
    });
  });

  describe('updateStatus', () => {
    it('应该成功更新商品状态为下架并通知门店', async () => {
      const existingProduct = { ...mockProduct, publishStatus: PublishStatus.ON_SHELF };
      const updatedProduct = { ...mockProduct, publishStatus: PublishStatus.OFF_SHELF };

      jest.spyOn(productRepo, 'findById').mockResolvedValue(existingProduct as any);
      jest.spyOn(productRepo, 'update').mockResolvedValue(updatedProduct as any);
      jest.spyOn(productSyncProducer, 'notifyOffShelf').mockResolvedValue(undefined);

      const result = await service.updateStatus('prod-001', { publishStatus: PublishStatus.OFF_SHELF });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.publishStatus).toBe(PublishStatus.OFF_SHELF);
      expect(productRepo.update).toHaveBeenCalledWith('prod-001', { publishStatus: PublishStatus.OFF_SHELF });
      expect(productSyncProducer.notifyOffShelf).toHaveBeenCalledWith('prod-001');
    });

    it('应该成功更新商品状态为上架且不通知门店', async () => {
      const existingProduct = { ...mockProduct, publishStatus: PublishStatus.OFF_SHELF };
      const updatedProduct = { ...mockProduct, publishStatus: PublishStatus.ON_SHELF };

      jest.spyOn(productRepo, 'findById').mockResolvedValue(existingProduct as any);
      jest.spyOn(productRepo, 'update').mockResolvedValue(updatedProduct as any);
      jest.spyOn(productSyncProducer, 'notifyOffShelf').mockResolvedValue(undefined);

      const result = await service.updateStatus('prod-001', { publishStatus: PublishStatus.ON_SHELF });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.publishStatus).toBe(PublishStatus.ON_SHELF);
      expect(productRepo.update).toHaveBeenCalledWith('prod-001', { publishStatus: PublishStatus.ON_SHELF });
      expect(productSyncProducer.notifyOffShelf).not.toHaveBeenCalled();
    });

    it('应该在状态未变化时直接返回', async () => {
      const existingProduct = { ...mockProduct, publishStatus: PublishStatus.ON_SHELF };

      jest.spyOn(productRepo, 'findById').mockResolvedValue(existingProduct as any);
      jest.spyOn(productRepo, 'update').mockResolvedValue(existingProduct as any);
      jest.spyOn(productSyncProducer, 'notifyOffShelf').mockResolvedValue(undefined);

      const result = await service.updateStatus('prod-001', { publishStatus: PublishStatus.ON_SHELF });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.msg).toBe('商品状态未变化');
      expect(productRepo.update).not.toHaveBeenCalled();
      expect(productSyncProducer.notifyOffShelf).not.toHaveBeenCalled();
    });

    it('应该在商品不存在时抛出异常', async () => {
      jest.spyOn(productRepo, 'findById').mockResolvedValue(null);

      await expect(service.updateStatus('non-exist', { publishStatus: PublishStatus.OFF_SHELF })).rejects.toThrow(
        BusinessException,
      );
      expect(productRepo.update).not.toHaveBeenCalled();
      expect(productSyncProducer.notifyOffShelf).not.toHaveBeenCalled();
    });
  });
});
