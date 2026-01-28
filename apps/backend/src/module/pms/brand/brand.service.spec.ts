import { Test, TestingModule } from '@nestjs/testing';
import { BrandService } from './brand.service';
import { BrandRepository } from './brand.repository';
import { BusinessException } from 'src/common/exceptions';

describe('BrandService', () => {
    let service: BrandService;
    let repo: BrandRepository;

    const mockRepo = {
        findPage: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findById: jest.fn(),
        isUsedByProducts: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BrandService,
                {
                    provide: BrandRepository,
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<BrandService>(BrandService);
        repo = module.get<BrandRepository>(BrandRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated brands', async () => {
            const mockResult = { rows: [{ brandId: 1, name: 'Brand A' }], total: 1 };
            mockRepo.findPage.mockResolvedValue(mockResult);

            // Create a valid DTO with base properties
            const query: any = { pageNum: 1, pageSize: 10 };

            const result = await service.findAll(query);

            expect(result.data.rows).toEqual(mockResult.rows);
            expect(result.data.total).toBe(1);
        });
    });

    describe('create', () => {
        it('should create a brand', async () => {
            const dto = { name: 'New Brand', logo: 'logo.png' };
            mockRepo.create.mockResolvedValue({ brandId: 1, ...dto });

            const result = await service.create(dto);

            expect(result.data.name).toBe(dto.name);
            expect(mockRepo.create).toHaveBeenCalledWith(dto);
        });
    });

    describe('remove', () => {
        it('should throw error if brand is used by products', async () => {
            mockRepo.isUsedByProducts.mockResolvedValue(true);

            await expect(service.remove(1)).rejects.toThrow(BusinessException);
            expect(mockRepo.delete).not.toHaveBeenCalled();
        });

        it('should delete brand if not used', async () => {
            mockRepo.isUsedByProducts.mockResolvedValue(false);
            mockRepo.delete.mockResolvedValue(undefined);

            await service.remove(1);

            expect(mockRepo.delete).toHaveBeenCalledWith(1);
        });
    });

    describe('findOne', () => {
        it('should throw error if brand not found', async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(service.findOne(1)).rejects.toThrow(BusinessException);
        });

        it('should return brand if found', async () => {
            const mockBrand = { brandId: 1, name: 'Brand A' };
            mockRepo.findById.mockResolvedValue(mockBrand);

            const result = await service.findOne(1);
            expect(result.data).toEqual(mockBrand);
        });
    });
});
