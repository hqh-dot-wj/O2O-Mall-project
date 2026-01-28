import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { BusinessException } from 'src/common/exceptions';
import { RedisService } from 'src/module/common/redis/redis.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: CategoryRepository;
  let redis: RedisService;

  const mockRepo = {
    findAllForTree: jest.fn(),
    findPage: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findById: jest.fn(),
    hasChildren: jest.fn(),
    isUsedByProducts: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: mockRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repo = module.get<CategoryRepository>(CategoryRepository);
    redis = module.get<RedisService>(RedisService);

    // 手动注入 redis，因为装饰器会尝试注入它
    (service as any).redis = redis;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findTree', () => {
    it('should build a category tree', async () => {
      const mockCategories = [
        { catId: 1, name: 'Root', parentId: null },
        { catId: 2, name: 'Child', parentId: 1 },
      ];
      mockRepo.findAllForTree.mockResolvedValue(mockCategories);

      const result = await service.findTree();

      expect(result.data.length).toBe(1);
      expect(result.data[0].catId).toBe(1);
      expect(result.data[0].children.length).toBe(1);
      expect(result.data[0].children[0].catId).toBe(2);
    });
  });

  describe('remove', () => {
    it('should throw error if has children', async () => {
      mockRepo.hasChildren.mockResolvedValue(true);

      await expect(service.remove(1)).rejects.toThrow(BusinessException);
    });

    it('should throw error if used by products', async () => {
      mockRepo.hasChildren.mockResolvedValue(false);
      mockRepo.isUsedByProducts.mockResolvedValue(true);

      await expect(service.remove(1)).rejects.toThrow(BusinessException);
    });

    it('should delete if no children and not used', async () => {
      mockRepo.hasChildren.mockResolvedValue(false);
      mockRepo.isUsedByProducts.mockResolvedValue(false);
      mockRepo.delete.mockResolvedValue(undefined);
      mockRedis.keys.mockResolvedValue([]);

      await service.remove(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
