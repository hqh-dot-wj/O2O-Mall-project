// @ts-nocheck
 
import { Test, TestingModule } from '@nestjs/testing';
import { BrandService } from './brand.service';
import { BrandRepository } from './brand.repository';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

describe('BrandService', () => {
  let service: BrandService;
  let repository: BrandRepository;

  const mockBrandRepo = {
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    isUsedByProducts: jest.fn(),
    delete: jest.fn(),
    findPage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandService,
        {
          provide: BrandRepository,
          useValue: mockBrandRepo,
        },
      ],
    }).compile();

    service = module.get<BrandService>(BrandService);
    repository = module.get<BrandRepository>(BrandRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建品牌', async () => {
      // Arrange
      const dto = { name: '测试品牌', logo: 'logo.png' };
      const createdBrand = { brandId: 1, ...dto };
      mockBrandRepo.findByName.mockResolvedValue(null);
      mockBrandRepo.create.mockResolvedValue(createdBrand);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(mockBrandRepo.findByName).toHaveBeenCalledWith(dto.name);
      expect(mockBrandRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        logo: dto.logo,
      });
      expect(result.data).toEqual(createdBrand);
    });

    it('应该在品牌名称已存在时抛出异常', async () => {
      // Arrange
      const dto = { name: '已存在品牌', logo: 'logo.png' };
      const existingBrand = { brandId: 1, name: dto.name, logo: 'old.png' };
      mockBrandRepo.findByName.mockResolvedValue(existingBrand);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(BusinessException);
      try {
        await service.create(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.BUSINESS_ERROR);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.BUSINESS_ERROR,
          msg: '品牌名称已存在',
        });
      }
      expect(mockBrandRepo.create).not.toHaveBeenCalled();
    });

    it('应该在logo为空时使用默认空字符串', async () => {
      // Arrange
      const dto = { name: '测试品牌' };
      const createdBrand = { brandId: 1, name: dto.name, logo: '' };
      mockBrandRepo.findByName.mockResolvedValue(null);
      mockBrandRepo.create.mockResolvedValue(createdBrand);

      // Act
      await service.create(dto);

      // Assert
      expect(mockBrandRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        logo: '',
      });
    });
  });

  describe('update', () => {
    it('应该成功更新品牌', async () => {
      // Arrange
      const id = 1;
      const dto = { name: '更新品牌', logo: 'new-logo.png' };
      const updatedBrand = { brandId: id, ...dto };
      mockBrandRepo.findByName.mockResolvedValue(null);
      mockBrandRepo.update.mockResolvedValue(updatedBrand);

      // Act
      const result = await service.update(id, dto);

      // Assert
      expect(mockBrandRepo.findByName).toHaveBeenCalledWith(dto.name);
      expect(mockBrandRepo.update).toHaveBeenCalledWith(id, dto);
      expect(result.data).toEqual(updatedBrand);
    });

    it('应该在更新为已存在的名称时抛出异常', async () => {
      // Arrange
      const id = 1;
      const dto = { name: '已存在品牌' };
      const existingBrand = { brandId: 2, name: dto.name, logo: 'logo.png' };
      mockBrandRepo.findByName.mockResolvedValue(existingBrand);

      // Act & Assert
      await expect(service.update(id, dto)).rejects.toThrow(BusinessException);
      try {
        await service.update(id, dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.BUSINESS_ERROR);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.BUSINESS_ERROR,
          msg: '品牌名称已存在',
        });
      }
      expect(mockBrandRepo.update).not.toHaveBeenCalled();
    });

    it('应该允许更新为自己的名称', async () => {
      // Arrange
      const id = 1;
      const dto = { name: '品牌名称', logo: 'new-logo.png' };
      const existingBrand = { brandId: id, name: dto.name, logo: 'old-logo.png' };
      const updatedBrand = { brandId: id, ...dto };
      mockBrandRepo.findByName.mockResolvedValue(existingBrand);
      mockBrandRepo.update.mockResolvedValue(updatedBrand);

      // Act
      const result = await service.update(id, dto);

      // Assert
      expect(mockBrandRepo.findByName).toHaveBeenCalledWith(dto.name);
      expect(mockBrandRepo.update).toHaveBeenCalledWith(id, dto);
      expect(result.data).toEqual(updatedBrand);
    });

    it('应该在不更新名称时跳过唯一性校验', async () => {
      // Arrange
      const id = 1;
      const dto = { logo: 'new-logo.png' };
      const updatedBrand = { brandId: id, name: '原名称', ...dto };
      mockBrandRepo.update.mockResolvedValue(updatedBrand);

      // Act
      await service.update(id, dto);

      // Assert
      expect(mockBrandRepo.findByName).not.toHaveBeenCalled();
      expect(mockBrandRepo.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('remove', () => {
    it('应该成功删除未被使用的品牌', async () => {
      // Arrange
      const id = 1;
      mockBrandRepo.isUsedByProducts.mockResolvedValue(false);
      mockBrandRepo.delete.mockResolvedValue(undefined);

      // Act
      const result = await service.remove(id);

      // Assert
      expect(mockBrandRepo.isUsedByProducts).toHaveBeenCalledWith(id);
      expect(mockBrandRepo.delete).toHaveBeenCalledWith(id);
      expect(result.code).toBe(ResponseCode.SUCCESS);
    });

    it('应该在品牌被商品使用时抛出异常', async () => {
      // Arrange
      const id = 1;
      mockBrandRepo.isUsedByProducts.mockResolvedValue(true);

      // Act & Assert
      await expect(service.remove(id)).rejects.toThrow(BusinessException);
      try {
        await service.remove(id);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.BUSINESS_ERROR);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.BUSINESS_ERROR,
          msg: '该品牌已被商品使用，无法删除',
        });
      }
      expect(mockBrandRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('应该成功查询品牌详情', async () => {
      // Arrange
      const id = 1;
      const brand = { brandId: id, name: '测试品牌', logo: 'logo.png' };
      mockBrandRepo.findById.mockResolvedValue(brand);

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(mockBrandRepo.findById).toHaveBeenCalledWith(id);
      expect(result.data).toEqual(brand);
    });

    it('应该在品牌不存在时抛出异常', async () => {
      // Arrange
      const id = 999;
      mockBrandRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(BusinessException);
      try {
        await service.findOne(id);
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect(error.errorCode).toBe(ResponseCode.NOT_FOUND);
        expect(error.getResponse()).toMatchObject({
          code: ResponseCode.NOT_FOUND,
          msg: '品牌不存在',
        });
      }
    });
  });
});
