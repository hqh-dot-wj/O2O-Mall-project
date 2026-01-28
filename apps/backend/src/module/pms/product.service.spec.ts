import { Test, TestingModule } from '@nestjs/testing';
import { PmsProductService } from './product.service';
import { ProductRepository } from './product/product.repository';
import { SkuRepository } from './product/sku.repository';
import { AttributeRepository } from './attribute/attribute.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';

describe('PmsProductService', () => {
    let service: PmsProductService;
    let productRepo: ProductRepository;

    const mockProductRepo = {
        create: jest.fn(),
        update: jest.fn(),
        findWithRelations: jest.fn(),
        countWithConditions: jest.fn(),
        findOneWithDetails: jest.fn(),
    };

    const mockSkuRepo = {
        createMany: jest.fn(),
        findByProductId: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
    };

    const mockAttrRepo = {
        validateAttrIds: jest.fn(),
        findMany: jest.fn(),
    };

    const mockPrisma = {
        pmsProductAttrValue: {
            createMany: jest.fn(),
            deleteMany: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PmsProductService,
                { provide: ProductRepository, useValue: mockProductRepo },
                { provide: SkuRepository, useValue: mockSkuRepo },
                { provide: AttributeRepository, useValue: mockAttrRepo },
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<PmsProductService>(PmsProductService);
        productRepo = module.get<ProductRepository>(ProductRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should throw error for service product without duration', async () => {
            const dto = { type: 'SERVICE', name: 'Service A' };
            await expect(service.create(dto as any)).rejects.toThrow(BusinessException);
        });

        it('should create product with skus and attrs', async () => {
            const dto = {
                name: 'Product A',
                type: 'PHYSICAL',
                categoryId: 1,
                skus: [{ guidePrice: 100 }],
                attrs: [{ attrId: 1, value: 'Red' }],
            };

            mockAttrRepo.validateAttrIds.mockResolvedValue({ valid: true, invalidIds: [] });
            mockProductRepo.create.mockResolvedValue({ productId: 'p1' });
            mockAttrRepo.findMany.mockResolvedValue([{ attrId: 1, name: 'Color' }]);

            await service.create(dto as any);

            expect(mockProductRepo.create).toHaveBeenCalled();
            expect(mockSkuRepo.createMany).toHaveBeenCalled();
            expect(mockPrisma.pmsProductAttrValue.createMany).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return paginated products with formatted data', async () => {
            const mockList = [{ productId: '1', name: 'Product A', mainImages: ['img1.jpg'], globalSkus: [{ guidePrice: 100 }] }];
            mockProductRepo.findWithRelations.mockResolvedValue(mockList);
            mockProductRepo.countWithConditions.mockResolvedValue(1);

            // Create a valid DTO mock
            const query: any = { pageNum: 1, pageSize: 10 };

            const result = await service.findAll(query);

            const rows = result.data.rows as any[];
            expect(rows[0].price).toBe(100);
            expect(rows[0].albumPics).toBe('img1.jpg');
        });
    });

    describe('findOne', () => {
        it('should return product with attributes', async () => {
            const mockProduct = {
                productId: '1',
                attrValues: [{ attrId: 1, value: 'Red' }],
            };
            mockProductRepo.findOneWithDetails.mockResolvedValue(mockProduct);

            const result = await service.findOne('1');
            const data = result.data as any;
            expect(data.attrs[0].value).toBe('Red');
        });

        it('should throw 404 if not found', async () => {
            mockProductRepo.findOneWithDetails.mockResolvedValue(null);
            await expect(service.findOne('1')).rejects.toThrow(BusinessException);
        });
    });
});
