import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { RedisService } from 'src/module/common/redis/redis.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: CategoryRepository;

  const mockCategoryRepo = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hasChildren: jest.fn(),
    isUsedByProducts: jest.fn(),
    findAllForTree: jest.fn(),
    findPage: jest.fn(),
    count: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]), // 返回空数组而不是 undefined
    mget: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: mockCategoryRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get<CategoryRepository>(CategoryRepository);
    
    // 手动注入 redis 属性以支持装饰器
    (service as any).redis = mockRedisService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该创建顶级分类（level=1）', async () => {
      // Arrange
      const dto = { name: '顶级分类', sort: 1 };
      const createdCategory = { catId: 1, ...dto, level: 1 };
      mockCategoryRepo.create.mockResolvedValue(createdCategory);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
      expect(mockCategoryRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        level: 1,
        icon: null,
        sort: dto.sort,
      });
      expect(result.data).toEqual(createdCategory);
    });

    it('应该创建二级分类（父级level=1，子级level=2）', async () => {
      // Arrange
      const parentCategory = { catId: 1, name: '父分类', level: 1 };
      const dto = { name: '子分类', parentId: 1, sort: 1 };
      const createdCategory = { catId: 2, ...dto, level: 2 };
      mockCategoryRepo.findById.mockResolvedValue(parentCategory);
      mockCategoryRepo.create.mockResolvedValue(createdCategory);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockCategoryRepo.findById).toHaveBeenCalledWith(dto.parentId);
      expect(mockCategoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          level: 2,
          sort: dto.sort,
        }),
      );
      expect(result.data).toEqual(createdCategory);
    });

    it('应该创建三级分类（父级level=2，子级level=3）', async () => {
      // Arrange
      const parentCategory = { catId: 2, name: '二级分类', level: 2 };
      const dto = { name: '三级分类', parentId: 2 };
      const createdCategory = { catId: 3, ...dto, level: 3 };
      mockCategoryRepo.findById.mockResolvedValue(parentCategory);
      mockCategoryRepo.create.mockResolvedValue(createdCategory);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockCategoryRepo.findById).toHaveBeenCalledWith(dto.parentId);
      expect(mockCategoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          level: 3,
        }),
      );
      expect(result.data.level).toBe(3);
    });

    it('应该在父分类不存在时抛出异常', async () => {
      // Arrange
      const dto = { name: '子分类', parentId: 999 };
      mockCategoryRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(BusinessException);
      try {
        await service.create(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.NOT_FOUND);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.NOT_FOUND,
          msg: '父分类不存在',
        });
      }
      expect(mockCategoryRepo.create).not.toHaveBeenCalled();
    });

    it('应该正确处理icon和attrTemplateId', async () => {
      // Arrange
      const dto = {
        name: '分类',
        icon: 'icon.png',
        attrTemplateId: 1,
        sort: 1,
      };
      const createdCategory = { catId: 1, ...dto, level: 1 };
      mockCategoryRepo.create.mockResolvedValue(createdCategory);

      // Act
      await service.create(dto);

      // Assert
      expect(mockCategoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: dto.icon,
        }),
      );
    });
  });

  describe('update', () => {
    it('应该成功更新分类（不改变父级）', async () => {
      // Arrange
      const id = 1;
      const dto = { name: '更新后的名称', sort: 2 };
      const updatedCategory = { catId: id, ...dto, level: 1 };
      mockCategoryRepo.update.mockResolvedValue(updatedCategory);

      // Act
      const result = await service.update(id, dto);

      // Assert
      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
      expect(mockCategoryRepo.update).toHaveBeenCalledWith(id, dto);
      expect(result.data).toEqual(updatedCategory);
    });

    it('应该在移到顶级时设置level=1', async () => {
      // Arrange
      const id = 2;
      const dto = { parentId: null };
      const updatedCategory = { catId: id, name: '分类', level: 1, parentId: null };
      mockCategoryRepo.update.mockResolvedValue(updatedCategory);

      // Act
      await service.update(id, dto);

      // Assert
      expect(mockCategoryRepo.update).toHaveBeenCalledWith(id, {
        parentId: null,
        level: 1,
      });
    });

    it('应该在更新父级时重新计算层级', async () => {
      // Arrange
      const id = 3;
      const newParent = { catId: 2, name: '新父级', level: 2 };
      const dto = { parentId: 2 };
      const updatedCategory = { catId: id, name: '分类', level: 3, parentId: 2 };
      mockCategoryRepo.findById.mockResolvedValue(newParent);
      mockCategoryRepo.update.mockResolvedValue(updatedCategory);

      // Act
      await service.update(id, dto);

      // Assert
      expect(mockCategoryRepo.findById).toHaveBeenCalledWith(dto.parentId);
      expect(mockCategoryRepo.update).toHaveBeenCalledWith(id, {
        parentId: 2,
        level: 3,
      });
    });

    it('应该在父分类不存在时抛出异常', async () => {
      // Arrange
      const id = 1;
      const dto = { parentId: 999 };
      mockCategoryRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(id, dto)).rejects.toThrow(BusinessException);
      try {
        await service.update(id, dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.NOT_FOUND);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.NOT_FOUND,
          msg: '父分类不存在',
        });
      }
      expect(mockCategoryRepo.update).not.toHaveBeenCalled();
    });

    it('应该在尝试将分类移到自己下面时抛出异常', async () => {
      // Arrange
      const id = 1;
      const dto = { parentId: 1 };

      // Act & Assert
      await expect(service.update(id, dto)).rejects.toThrow(BusinessException);
      try {
        await service.update(id, dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.BUSINESS_ERROR);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.BUSINESS_ERROR,
          msg: '不能将分类移到自己下面',
        });
      }
      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
      expect(mockCategoryRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('应该成功删除未被使用且无子分类的分类', async () => {
      // Arrange
      const id = 1;
      mockCategoryRepo.hasChildren.mockResolvedValue(false);
      mockCategoryRepo.isUsedByProducts.mockResolvedValue(false);
      mockCategoryRepo.delete.mockResolvedValue(undefined);

      // Act
      const result = await service.remove(id);

      // Assert
      expect(mockCategoryRepo.hasChildren).toHaveBeenCalledWith(id);
      expect(mockCategoryRepo.isUsedByProducts).toHaveBeenCalledWith(id);
      expect(mockCategoryRepo.delete).toHaveBeenCalledWith(id);
      expect(result.code).toBe(ResponseCode.SUCCESS);
    });

    it('应该在有子分类时抛出异常', async () => {
      // Arrange
      const id = 1;
      mockCategoryRepo.hasChildren.mockResolvedValue(true);

      // Act & Assert
      await expect(service.remove(id)).rejects.toThrow(BusinessException);
      try {
        await service.remove(id);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.BUSINESS_ERROR);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.BUSINESS_ERROR,
          msg: '该分类下有子分类，无法删除',
        });
      }
      expect(mockCategoryRepo.isUsedByProducts).not.toHaveBeenCalled();
      expect(mockCategoryRepo.delete).not.toHaveBeenCalled();
    });

    it('应该在被商品使用时抛出异常', async () => {
      // Arrange
      const id = 1;
      mockCategoryRepo.hasChildren.mockResolvedValue(false);
      mockCategoryRepo.isUsedByProducts.mockResolvedValue(true);

      // Act & Assert
      await expect(service.remove(id)).rejects.toThrow(BusinessException);
      try {
        await service.remove(id);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.BUSINESS_ERROR);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.BUSINESS_ERROR,
          msg: '该分类已被商品使用，无法删除',
        });
      }
      expect(mockCategoryRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('应该成功查询分类详情', async () => {
      // Arrange
      const id = 1;
      const category = { catId: id, name: '测试分类', level: 1 };
      mockCategoryRepo.findById.mockResolvedValue(category);

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(mockCategoryRepo.findById).toHaveBeenCalledWith(id);
      expect(result.data).toEqual(category);
    });

    it('应该在分类不存在时抛出异常', async () => {
      // Arrange
      const id = 999;
      mockCategoryRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(BusinessException);
      try {
        await service.findOne(id);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.NOT_FOUND);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.NOT_FOUND,
          msg: '分类不存在',
        });
      }
    });
  });
});
