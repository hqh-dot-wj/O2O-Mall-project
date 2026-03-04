// @ts-nocheck
 
import { Test, TestingModule } from '@nestjs/testing';
import { DictService } from './dict.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { DictTypeRepository, DictDataRepository } from './dict.repository';
import { ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { DelFlagEnum } from 'src/common/enum/index';

/**
 * 字典管理模块单元测试
 *
 * 测试覆盖验收标准：
 * - AC-1: 创建字典类型时，字典类型在同一租户下必须唯一
 * - AC-2: 创建字典类型时，默认字典状态为正常（0）
 * - AC-5: 删除字典类型时，使用软删除，数据不物理删除
 * - AC-7: 创建字典数据时，字典标签在同一字典类型下必须唯一
 */
describe('DictService', () => {
  let service: DictService;
  let prisma: PrismaService;
  let dictTypeRepo: DictTypeRepository;
  let dictDataRepo: DictDataRepository;
  let redisService: RedisService;

  // 测试数据 Fixtures
  const mockDictType = {
    dictId: 1,
    tenantId: '000000',
    dictName: '用户性别',
    dictType: 'sys_user_sex',
    status: '0',
    delFlag: '0',
    createBy: 'admin',
    createTime: new Date(),
    updateBy: null,
    updateTime: null,
    remark: '用户性别列表',
  };

  const mockDictData = {
    dictCode: 1,
    tenantId: '000000',
    dictSort: 1,
    dictLabel: '男',
    dictValue: '0',
    dictType: 'sys_user_sex',
    cssClass: '',
    listClass: 'default',
    isDefault: 'N',
    status: '0',
    delFlag: '0',
    createBy: 'admin',
    createTime: new Date(),
    updateBy: null,
    updateTime: null,
    remark: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DictService,
        {
          provide: PrismaService,
          useValue: {
            sysDictType: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
            },
            sysDictData: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: DictTypeRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
            softDeleteBatch: jest.fn(),
            existsByDictType: jest.fn(),
            findPageWithFilter: jest.fn(),
            findAllForSelect: jest.fn(),
          },
        },
        {
          provide: DictDataRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
            softDeleteBatch: jest.fn(),
            existsByDictLabel: jest.fn(),
            findPageWithFilter: jest.fn(),
            findByDictType: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            keys: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<DictService>(DictService);
    prisma = module.get<PrismaService>(PrismaService);
    dictTypeRepo = module.get<DictTypeRepository>(DictTypeRepository);
    dictDataRepo = module.get<DictDataRepository>(DictDataRepository);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  // ============================================================
  // 创建字典类型测试
  // ============================================================
  describe('createType', () => {
    // AC-1: 创建字典类型时，字典类型在同一租户下必须唯一
    it('Given dictType not exists, When createType, Then success (AC-1)', async () => {
      // Arrange
      const createDto = {
        dictName: '用户性别',
        dictType: 'sys_user_sex',
        status: '0',
        remark: '用户性别列表',
      };
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(false);
      (dictTypeRepo.create as jest.Mock).mockResolvedValue({ dictId: 1 });

      // Act
      const result = await service.createType(createDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictTypeRepo.existsByDictType).toHaveBeenCalledWith('sys_user_sex');
      expect(dictTypeRepo.create).toHaveBeenCalledWith(createDto);
    });

    // AC-1: 字典类型已存在时抛出异常
    it('Given dictType exists, When createType, Then throw 字典类型已存在 (AC-1)', async () => {
      // Arrange
      const createDto = {
        dictName: '用户性别',
        dictType: 'sys_user_sex',
      };
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.createType(createDto as any)).rejects.toThrow(BusinessException);
      try {
        await service.createType(createDto as any);
      } catch (error) {
        expect(error.getResponse().msg).toBe('字典类型已存在');
      }
      expect(dictTypeRepo.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 修改字典类型测试
  // ============================================================
  describe('updateType', () => {
    it('Given dictType not duplicate, When updateType, Then success', async () => {
      // Arrange
      const updateDto = {
        dictId: 1,
        dictName: '用户性别更新',
        dictType: 'sys_user_sex',
      };
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(false);
      (dictTypeRepo.update as jest.Mock).mockResolvedValue(mockDictType);

      // Act
      const result = await service.updateType(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictTypeRepo.existsByDictType).toHaveBeenCalledWith('sys_user_sex', 1);
    });

    it('Given dictType duplicate, When updateType, Then throw 字典类型已存在', async () => {
      // Arrange
      const updateDto = {
        dictId: 1,
        dictName: '用户性别',
        dictType: 'sys_normal_disable', // 与其他字典类型重复
      };
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.updateType(updateDto as any)).rejects.toThrow(BusinessException);
      expect(dictTypeRepo.update).not.toHaveBeenCalled();
    });

    it('Given no dictType change, When updateType, Then skip uniqueness check', async () => {
      // Arrange
      const updateDto = {
        dictId: 1,
        dictName: '用户性别更新',
        // dictType 未提供
      };
      (dictTypeRepo.update as jest.Mock).mockResolvedValue(mockDictType);

      // Act
      const result = await service.updateType(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictTypeRepo.existsByDictType).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 删除字典类型测试
  // ============================================================
  describe('deleteType', () => {
    // AC-5: 删除字典类型时，使用软删除
    it('Given dictType has no data, When deleteType, Then soft delete (AC-5)', async () => {
      // Arrange
      (dictTypeRepo.findById as jest.Mock).mockResolvedValue(mockDictType);
      (prisma.sysDictData.count as jest.Mock).mockResolvedValue(0);
      (dictTypeRepo.softDeleteBatch as jest.Mock).mockResolvedValue({ count: 1 });

      // Act
      const result = await service.deleteType([1]);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictTypeRepo.softDeleteBatch).toHaveBeenCalledWith([1]);
    });

    // T-5: 删除前检查数据关联
    it('Given dictType has data, When deleteType, Then throw 存在关联数据', async () => {
      // Arrange
      (dictTypeRepo.findById as jest.Mock).mockResolvedValue(mockDictType);
      (prisma.sysDictData.count as jest.Mock).mockResolvedValue(3);

      // Act & Assert
      await expect(service.deleteType([1])).rejects.toThrow(BusinessException);
      try {
        await service.deleteType([1]);
      } catch (error) {
        expect(error.getResponse().msg).toContain('存在关联数据');
      }
      expect(dictTypeRepo.softDeleteBatch).not.toHaveBeenCalled();
    });

    it('Given dictType not exists, When deleteType, Then skip and continue', async () => {
      // Arrange
      (dictTypeRepo.findById as jest.Mock).mockResolvedValue(null);
      (dictTypeRepo.softDeleteBatch as jest.Mock).mockResolvedValue({ count: 0 });

      // Act
      const result = await service.deleteType([999]);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(prisma.sysDictData.count).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 查询字典类型列表测试
  // ============================================================
  describe('findAllType', () => {
    it('Given no filter, When findAllType, Then return all types', async () => {
      // Arrange
      (dictTypeRepo.findPageWithFilter as jest.Mock).mockResolvedValue({
        list: [mockDictType],
        total: 1,
      });

      // Act
      const result = await service.findAllType({ skip: 0, take: 10 } as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('Given dictName filter, When findAllType, Then filter by name', async () => {
      // Arrange
      (dictTypeRepo.findPageWithFilter as jest.Mock).mockResolvedValue({
        list: [mockDictType],
        total: 1,
      });

      // Act
      await service.findAllType({ dictName: '性别', skip: 0, take: 10 } as any);

      // Assert
      const callArgs = (dictTypeRepo.findPageWithFilter as jest.Mock).mock.calls[0][0];
      expect(callArgs.dictName).toEqual({ contains: '性别' });
    });
  });

  // ============================================================
  // 创建字典数据测试
  // ============================================================
  describe('createDictData', () => {
    // AC-7: 创建字典数据时，字典标签在同一字典类型下必须唯一
    it('Given dictLabel not exists, When createDictData, Then success (AC-7)', async () => {
      // Arrange
      const createDto = {
        dictType: 'sys_user_sex',
        dictLabel: '男',
        dictValue: '0',
        listClass: 'default',
      };
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(false);
      (dictDataRepo.create as jest.Mock).mockResolvedValue({ dictCode: 1 });

      // Act
      const result = await service.createDictData(createDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictDataRepo.existsByDictLabel).toHaveBeenCalledWith('sys_user_sex', '男');
      expect(redisService.del).toHaveBeenCalled(); // 清除缓存
    });

    // AC-7: 字典标签已存在时抛出异常
    it('Given dictLabel exists, When createDictData, Then throw 字典标签已存在 (AC-7)', async () => {
      // Arrange
      const createDto = {
        dictType: 'sys_user_sex',
        dictLabel: '男',
        dictValue: '0',
        listClass: 'default',
      };
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.createDictData(createDto as any)).rejects.toThrow(BusinessException);
      try {
        await service.createDictData(createDto as any);
      } catch (error) {
        expect(error.getResponse().msg).toBe('字典标签已存在');
      }
      expect(dictDataRepo.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 修改字典数据测试
  // ============================================================
  describe('updateDictData', () => {
    it('Given dictLabel not duplicate, When updateDictData, Then success', async () => {
      // Arrange
      const updateDto = {
        dictCode: 1,
        dictType: 'sys_user_sex',
        dictLabel: '男性',
        dictValue: '0',
      };
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(false);
      (dictDataRepo.update as jest.Mock).mockResolvedValue(mockDictData);

      // Act
      const result = await service.updateDictData(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictDataRepo.existsByDictLabel).toHaveBeenCalledWith('sys_user_sex', '男性', 1);
      expect(redisService.del).toHaveBeenCalled(); // 清除缓存
    });

    it('Given dictLabel duplicate, When updateDictData, Then throw 字典标签已存在', async () => {
      // Arrange
      const updateDto = {
        dictCode: 1,
        dictType: 'sys_user_sex',
        dictLabel: '女', // 与其他字典数据重复
        dictValue: '0',
      };
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.updateDictData(updateDto as any)).rejects.toThrow(BusinessException);
      expect(dictDataRepo.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 删除字典数据测试
  // ============================================================
  describe('deleteDictData', () => {
    it('Given valid dictCodes, When deleteDictData, Then soft delete', async () => {
      // Arrange
      (dictDataRepo.softDeleteBatch as jest.Mock).mockResolvedValue({ count: 2 });

      // Act
      const result = await service.deleteDictData([1, 2]);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictDataRepo.softDeleteBatch).toHaveBeenCalledWith([1, 2]);
    });
  });

  // ============================================================
  // 按类型查询字典数据测试（缓存）
  // ============================================================
  describe('findOneDataType', () => {
    // AC-12: 按类型查询字典数据时，优先使用 Redis 缓存
    it('Given cache exists, When findOneDataType, Then return cached data (AC-12)', async () => {
      // Arrange
      const cachedData = [mockDictData];
      (redisService.get as jest.Mock).mockResolvedValue(cachedData);

      // Act
      const result = await service.findOneDataType('sys_user_sex');

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual(cachedData);
      expect(dictDataRepo.findByDictType).not.toHaveBeenCalled();
    });

    // AC-15: 如果缓存不存在，从数据库查询并写入缓存
    it('Given cache not exists, When findOneDataType, Then query db and set cache (AC-15)', async () => {
      // Arrange
      (redisService.get as jest.Mock).mockResolvedValue(null);
      (dictDataRepo.findByDictType as jest.Mock).mockResolvedValue([mockDictData]);

      // Act
      const result = await service.findOneDataType('sys_user_sex');

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(dictDataRepo.findByDictType).toHaveBeenCalledWith('sys_user_sex');
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 刷新字典缓存测试
  // ============================================================
  describe('resetDictCache', () => {
    // AC-13: 刷新字典缓存时，清除所有字典缓存
    it('Given cache exists, When resetDictCache, Then clear and reload (AC-13)', async () => {
      // Arrange
      (redisService.keys as jest.Mock).mockResolvedValue(['sys_dict:sys_user_sex']);
      (redisService.del as jest.Mock).mockResolvedValue(1);
      (prisma.sysDictData.findMany as jest.Mock).mockResolvedValue([mockDictData]);

      // Act
      const result = await service.resetDictCache();

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(redisService.keys).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalled();
    });
  });

  // ============================================================
  // T-7: 缓存优化测试
  // ============================================================
  describe('deleteDictData - cache optimization (T-7)', () => {
    it('Given dictData exists, When deleteDictData, Then clear cache by dictType', async () => {
      // Arrange
      (dictDataRepo.findById as jest.Mock).mockResolvedValue(mockDictData);
      (dictDataRepo.softDeleteBatch as jest.Mock).mockResolvedValue({ count: 1 });

      // Act
      const result = await service.deleteDictData([1]);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(redisService.del).toHaveBeenCalledWith('sys_dict:sys_user_sex');
    });

    it('Given multiple dictData with same type, When deleteDictData, Then clear cache once', async () => {
      // Arrange
      (dictDataRepo.findById as jest.Mock).mockResolvedValue(mockDictData);
      (dictDataRepo.softDeleteBatch as jest.Mock).mockResolvedValue({ count: 2 });

      // Act
      const result = await service.deleteDictData([1, 2]);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      // 同一字典类型只清除一次缓存
      expect(redisService.del).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateType - cache optimization (T-7)', () => {
    it('Given dictType changed, When updateType, Then clear old cache', async () => {
      // Arrange
      const updateDto = {
        dictId: 1,
        dictName: '用户性别',
        dictType: 'sys_user_gender', // 新的字典类型标识
      };
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(false);
      (dictTypeRepo.findById as jest.Mock).mockResolvedValue({
        ...mockDictType,
        dictType: 'sys_user_sex', // 旧的字典类型标识
      });
      (dictTypeRepo.update as jest.Mock).mockResolvedValue(mockDictType);

      // Act
      const result = await service.updateType(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(redisService.del).toHaveBeenCalledWith('sys_dict:sys_user_sex');
    });

    it('Given dictType not changed, When updateType, Then skip cache clear', async () => {
      // Arrange
      const updateDto = {
        dictId: 1,
        dictName: '用户性别更新',
        dictType: 'sys_user_sex', // 相同的字典类型标识
      };
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(false);
      (dictTypeRepo.findById as jest.Mock).mockResolvedValue(mockDictType);
      (dictTypeRepo.update as jest.Mock).mockResolvedValue(mockDictType);

      // Act
      const result = await service.updateType(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(redisService.del).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // T-8: 批量导入测试
  // ============================================================
  describe('importDict (T-8)', () => {
    it('Given new dictType and data, When importDict, Then create all', async () => {
      // Arrange
      const importList = [
        {
          dictName: '订单状态',
          dictType: 'order_status',
          dataList: [
            { dictLabel: '待支付', dictValue: '0' },
            { dictLabel: '已支付', dictValue: '1' },
          ],
        },
      ];
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(false);
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(false);
      (dictTypeRepo.create as jest.Mock).mockResolvedValue({ dictId: 1 });
      (dictDataRepo.create as jest.Mock).mockResolvedValue({ dictCode: 1 });

      // Act
      const result = await service.importDict(importList as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.successTypeCount).toBe(1);
      expect(result.data.successDataCount).toBe(2);
      expect(result.data.skippedTypeCount).toBe(0);
      expect(result.data.skippedDataCount).toBe(0);
    });

    it('Given existing dictType, When importDict, Then skip type and import data', async () => {
      // Arrange
      const importList = [
        {
          dictName: '用户性别',
          dictType: 'sys_user_sex',
          dataList: [{ dictLabel: '未知', dictValue: '2' }],
        },
      ];
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(true);
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(false);
      (dictDataRepo.create as jest.Mock).mockResolvedValue({ dictCode: 1 });

      // Act
      const result = await service.importDict(importList as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.successTypeCount).toBe(0);
      expect(result.data.skippedTypeCount).toBe(1);
      expect(result.data.successDataCount).toBe(1);
      expect(dictTypeRepo.create).not.toHaveBeenCalled();
    });

    it('Given existing dictLabel, When importDict, Then skip data', async () => {
      // Arrange
      const importList = [
        {
          dictName: '用户性别',
          dictType: 'sys_user_sex',
          dataList: [{ dictLabel: '男', dictValue: '0' }],
        },
      ];
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(true);
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.importDict(importList as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.skippedDataCount).toBe(1);
      expect(dictDataRepo.create).not.toHaveBeenCalled();
    });

    it('Given import success, When importDict, Then clear affected cache', async () => {
      // Arrange
      const importList = [
        {
          dictName: '订单状态',
          dictType: 'order_status',
          dataList: [{ dictLabel: '待支付', dictValue: '0' }],
        },
      ];
      (dictTypeRepo.existsByDictType as jest.Mock).mockResolvedValue(false);
      (dictDataRepo.existsByDictLabel as jest.Mock).mockResolvedValue(false);
      (dictTypeRepo.create as jest.Mock).mockResolvedValue({ dictId: 1 });
      (dictDataRepo.create as jest.Mock).mockResolvedValue({ dictCode: 1 });

      // Act
      await service.importDict(importList as any);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith('sys_dict:order_status');
    });
  });

  // ============================================================
  // T-9: 拖拽排序测试
  // ============================================================
  describe('sortDictData (T-9)', () => {
    it('Given valid sortList, When sortDictData, Then update all sorts', async () => {
      // Arrange
      const sortDto = {
        dictType: 'sys_user_sex',
        sortList: [
          { dictCode: 1, dictSort: 0 },
          { dictCode: 2, dictSort: 1 },
          { dictCode: 3, dictSort: 2 },
        ],
      };
      (dictDataRepo.update as jest.Mock).mockResolvedValue({});

      // Act
      const result = await service.sortDictData(sortDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBe(3);
      expect(dictDataRepo.update).toHaveBeenCalledTimes(3);
      expect(dictDataRepo.update).toHaveBeenCalledWith(1, { dictSort: 0 });
      expect(dictDataRepo.update).toHaveBeenCalledWith(2, { dictSort: 1 });
      expect(dictDataRepo.update).toHaveBeenCalledWith(3, { dictSort: 2 });
    });

    it('Given sortDictData success, When sortDictData, Then clear cache', async () => {
      // Arrange
      const sortDto = {
        dictType: 'sys_user_sex',
        sortList: [{ dictCode: 1, dictSort: 0 }],
      };
      (dictDataRepo.update as jest.Mock).mockResolvedValue({});

      // Act
      await service.sortDictData(sortDto as any);

      // Assert
      expect(redisService.del).toHaveBeenCalledWith('sys_dict:sys_user_sex');
    });

    it('Given empty sortList, When sortDictData, Then return 0', async () => {
      // Arrange
      const sortDto = {
        dictType: 'sys_user_sex',
        sortList: [],
      };

      // Act
      const result = await service.sortDictData(sortDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBe(0);
      expect(dictDataRepo.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // T-10: 字典使用统计测试
  // ============================================================
  describe('getDictStats (T-10)', () => {
    it('Given dictTypes exist, When getDictStats, Then return stats summary', async () => {
      // Arrange
      const mockDictTypes = [
        { dictId: 1, dictName: '用户性别', dictType: 'sys_user_sex' },
        { dictId: 2, dictName: '系统状态', dictType: 'sys_normal_disable' },
      ];
      (dictTypeRepo.findAllForSelect as jest.Mock).mockResolvedValue(mockDictTypes);
      (prisma.sysDictData.count as jest.Mock)
        .mockResolvedValueOnce(3) // sys_user_sex 有 3 条数据
        .mockResolvedValueOnce(2); // sys_normal_disable 有 2 条数据
      (redisService.get as jest.Mock)
        .mockResolvedValueOnce([mockDictData]) // sys_user_sex 已缓存
        .mockResolvedValueOnce(null); // sys_normal_disable 未缓存

      // Act
      const result = await service.getDictStats();

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.totalTypeCount).toBe(2);
      expect(result.data.totalDataCount).toBe(5);
      expect(result.data.cachedTypeCount).toBe(1);
      expect(result.data.details).toHaveLength(2);
      expect(result.data.details[0]).toEqual({
        dictType: 'sys_user_sex',
        dictName: '用户性别',
        dataCount: 3,
        cacheStatus: 'cached',
      });
      expect(result.data.details[1]).toEqual({
        dictType: 'sys_normal_disable',
        dictName: '系统状态',
        dataCount: 2,
        cacheStatus: 'not_cached',
      });
    });

    it('Given no dictTypes, When getDictStats, Then return empty stats', async () => {
      // Arrange
      (dictTypeRepo.findAllForSelect as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getDictStats();

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.totalTypeCount).toBe(0);
      expect(result.data.totalDataCount).toBe(0);
      expect(result.data.cachedTypeCount).toBe(0);
      expect(result.data.details).toHaveLength(0);
    });

    it('Given all cached, When getDictStats, Then cachedTypeCount equals totalTypeCount', async () => {
      // Arrange
      const mockDictTypes = [
        { dictId: 1, dictName: '用户性别', dictType: 'sys_user_sex' },
      ];
      (dictTypeRepo.findAllForSelect as jest.Mock).mockResolvedValue(mockDictTypes);
      (prisma.sysDictData.count as jest.Mock).mockResolvedValue(3);
      (redisService.get as jest.Mock).mockResolvedValue([mockDictData]);

      // Act
      const result = await service.getDictStats();

      // Assert
      expect(result.data.cachedTypeCount).toBe(result.data.totalTypeCount);
    });
  });
});
