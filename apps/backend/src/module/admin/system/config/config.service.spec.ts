// @ts-nocheck
 
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { BusinessException } from 'src/common/exceptions';
import { CacheEnum, DelFlagEnum } from 'src/common/enum/index';
import { ResponseCode } from 'src/common/response';

describe('ConfigService', () => {
  let service: ConfigService;
  let configRepo: any;
  let redisService: any;
  let prisma: any;
  let systemConfigService: any;

  const mockConfig = {
    configId: 1,
    tenantId: '000000',
    configName: '测试参数',
    configKey: 'test.config.key',
    configValue: 'test-value',
    configType: 'N',
    status: '0',
    delFlag: '0',
    createBy: 'admin',
    createTime: new Date(),
    updateBy: 'admin',
    updateTime: new Date(),
    remark: null,
  };

  const mockBuiltinConfig = {
    ...mockConfig,
    configId: 2,
    configKey: 'sys.builtin.key',
    configType: 'Y',
  };

  beforeEach(async () => {
    configRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByConfigKey: jest.fn(),
      findMany: jest.fn(),
      findPageWithFilter: jest.fn(),
      update: jest.fn(),
      softDeleteBatch: jest.fn(),
      existsByConfigKey: jest.fn(),
    };

    redisService = {
      set: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
    };

    prisma = {
      $queryRaw: jest.fn(),
    };

    systemConfigService = {
      getConfigValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: ConfigRepository, useValue: configRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
        { provide: SystemConfigService, useValue: systemConfigService },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    // R-IN-CONFIG-01: 创建时校验参数键名唯一性
    it('Given configKey已存在, When create, Then 抛出参数键名已存在异常', async () => {
      configRepo.existsByConfigKey.mockResolvedValue(true);

      await expect(
        service.create({ configName: '新参数', configKey: 'existing.key', configValue: 'value', configType: 'N' }),
      ).rejects.toThrow(BusinessException);

      expect(configRepo.existsByConfigKey).toHaveBeenCalledWith('existing.key');
      expect(configRepo.create).not.toHaveBeenCalled();
    });

    // R-FLOW-CONFIG-01: 正常创建参数配置
    it('Given configKey不存在, When create, Then 成功创建参数', async () => {
      configRepo.existsByConfigKey.mockResolvedValue(false);
      configRepo.create.mockResolvedValue(mockConfig);

      const result = await service.create({
        configName: '测试参数',
        configKey: 'test.config.key',
        configValue: 'test-value',
        configType: 'N',
      });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(configRepo.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    // R-FLOW-CONFIG-02: 分页查询参数列表
    it('Given 无筛选条件, When findAll, Then 返回分页列表', async () => {
      configRepo.findPageWithFilter.mockResolvedValue({ list: [mockConfig], total: 1 });

      const result = await service.findAll({ pageNum: 1, pageSize: 10, skip: 0, take: 10 });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    // R-FLOW-CONFIG-03: 按条件筛选参数列表
    it('Given configName筛选条件, When findAll, Then 返回匹配的参数', async () => {
      configRepo.findPageWithFilter.mockResolvedValue({ list: [mockConfig], total: 1 });

      await service.findAll({ configName: '测试', pageNum: 1, pageSize: 10, skip: 0, take: 10 });

      expect(configRepo.findPageWithFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          configName: { contains: '测试' },
        }),
        0,
        10,
      );
    });

    // R-FLOW-CONFIG-04: 按时间范围筛选
    it('Given 时间范围筛选条件, When findAll, Then 返回时间范围内的参数', async () => {
      configRepo.findPageWithFilter.mockResolvedValue({ list: [], total: 0 });

      await service.findAll({
        pageNum: 1,
        pageSize: 10,
        skip: 0,
        take: 10,
        params: { beginTime: '2026-01-01', endTime: '2026-12-31' },
      });

      expect(configRepo.findPageWithFilter).toHaveBeenCalledWith(
        expect.objectContaining({
          createTime: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        0,
        10,
      );
    });
  });

  describe('findOne', () => {
    // R-FLOW-CONFIG-05: 根据ID查询参数详情
    it('Given 有效configId, When findOne, Then 返回参数详情', async () => {
      configRepo.findById.mockResolvedValue(mockConfig);

      const result = await service.findOne(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual(mockConfig);
    });

    // R-BRANCH-CONFIG-01: 参数不存在时返回null
    it('Given 不存在的configId, When findOne, Then 返回null', async () => {
      configRepo.findById.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBeNull();
    });
  });

  describe('getConfigValue', () => {
    // R-FLOW-CONFIG-06: 按键查询参数值
    it('Given 存在的configKey, When getConfigValue, Then 返回参数值', async () => {
      configRepo.findByConfigKey.mockResolvedValue(mockConfig);

      const result = await service.getConfigValue('test.config.key');

      expect(result).toBe('test-value');
    });

    // R-BRANCH-CONFIG-02: 参数不存在时返回null
    it('Given 不存在的configKey, When getConfigValue, Then 返回null', async () => {
      configRepo.findByConfigKey.mockResolvedValue(null);

      const result = await service.getConfigValue('nonexistent.key');

      expect(result).toBeNull();
    });
  });

  describe('getSystemConfigValue', () => {
    // R-FLOW-CONFIG-07: 优先从系统配置表获取
    it('Given 系统配置表有值, When getSystemConfigValue, Then 返回系统配置值', async () => {
      systemConfigService.getConfigValue.mockResolvedValue('system-value');

      const result = await service.getSystemConfigValue('sys.account.captchaEnabled');

      expect(result).toBe('system-value');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    // R-BRANCH-CONFIG-03: 系统配置表无值时回退到超级租户配置
    it('Given 系统配置表无值, When getSystemConfigValue, Then 回退到超级租户配置', async () => {
      systemConfigService.getConfigValue.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([{ config_value: 'tenant-value' }]);

      const result = await service.getSystemConfigValue('sys.account.captchaEnabled');

      expect(result).toBe('tenant-value');
    });

    // R-BRANCH-CONFIG-04: 两处都无值时返回null
    it('Given 系统配置和超级租户都无值, When getSystemConfigValue, Then 返回null', async () => {
      systemConfigService.getConfigValue.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getSystemConfigValue('nonexistent.key');

      expect(result).toBeNull();
    });
  });


  describe('update', () => {
    // R-PRE-CONFIG-01: 参数不存在时抛出异常
    it('Given 不存在的configId, When update, Then 抛出参数不存在异常', async () => {
      configRepo.findById.mockResolvedValue(null);

      await expect(
        service.update({ configId: 999, configName: '新名称', configKey: 'new.key', configValue: 'v', configType: 'N' }),
      ).rejects.toThrow(BusinessException);

      expect(configRepo.update).not.toHaveBeenCalled();
    });

    // R-IN-CONFIG-02: 修改时校验参数键名唯一性（D2修复）
    it('Given 新configKey与其他记录冲突, When update, Then 抛出参数键名已存在异常', async () => {
      configRepo.findById.mockResolvedValue(mockConfig);
      configRepo.existsByConfigKey.mockResolvedValue(true);

      await expect(
        service.update({
          configId: 1,
          configName: '测试参数',
          configKey: 'conflict.key',
          configValue: 'test-value',
          configType: 'N',
        }),
      ).rejects.toThrow(BusinessException);

      expect(configRepo.existsByConfigKey).toHaveBeenCalledWith('conflict.key', 1);
      expect(configRepo.update).not.toHaveBeenCalled();
    });

    // R-IN-CONFIG-03: 系统内置参数禁止修改键名（D3修复）
    it('Given 内置参数且修改configKey, When update, Then 抛出键名不可修改异常', async () => {
      configRepo.findById.mockResolvedValue(mockBuiltinConfig);

      await expect(
        service.update({
          configId: 2,
          configName: '内置参数',
          configKey: 'new.builtin.key',
          configValue: 'value',
          configType: 'Y',
        }),
      ).rejects.toThrow(BusinessException);

      expect(configRepo.update).not.toHaveBeenCalled();
    });

    // R-FLOW-CONFIG-08: 正常更新参数配置
    it('Given 有效参数, When update, Then 成功更新并清除缓存', async () => {
      configRepo.findById.mockResolvedValue(mockConfig);
      configRepo.existsByConfigKey.mockResolvedValue(false);
      configRepo.update.mockResolvedValue(mockConfig);

      const result = await service.update({
        configId: 1,
        configName: '更新后的参数',
        configKey: 'test.config.key',
        configValue: 'new-value',
        configType: 'N',
      });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(configRepo.update).toHaveBeenCalled();
      expect(redisService.del).toHaveBeenCalledWith(`${CacheEnum.SYS_CONFIG_KEY}test.config.key`);
    });

    // R-FLOW-CONFIG-09: 修改configKey时清除新旧两个缓存（D4修复）
    it('Given 修改configKey, When update, Then 清除新旧两个缓存键', async () => {
      configRepo.findById.mockResolvedValue(mockConfig);
      configRepo.existsByConfigKey.mockResolvedValue(false);
      configRepo.update.mockResolvedValue({ ...mockConfig, configKey: 'new.config.key' });

      await service.update({
        configId: 1,
        configName: '测试参数',
        configKey: 'new.config.key',
        configValue: 'test-value',
        configType: 'N',
      });

      // 应该清除旧键和新键的缓存
      expect(redisService.del).toHaveBeenCalledWith(`${CacheEnum.SYS_CONFIG_KEY}test.config.key`);
      expect(redisService.del).toHaveBeenCalledWith(`${CacheEnum.SYS_CONFIG_KEY}new.config.key`);
    });

    // R-BRANCH-CONFIG-05: 内置参数可以修改值但不能修改键名
    it('Given 内置参数且仅修改configValue, When update, Then 成功更新', async () => {
      configRepo.findById.mockResolvedValue(mockBuiltinConfig);
      configRepo.update.mockResolvedValue({ ...mockBuiltinConfig, configValue: 'new-value' });

      const result = await service.update({
        configId: 2,
        configName: '内置参数',
        configKey: 'sys.builtin.key', // 键名不变
        configValue: 'new-value',
        configType: 'Y',
      });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(configRepo.update).toHaveBeenCalled();
    });
  });

  describe('updateByKey', () => {
    // R-PRE-CONFIG-02: 按键更新时参数不存在
    it('Given 不存在的configKey, When updateByKey, Then 抛出参数不存在异常', async () => {
      configRepo.findByConfigKey.mockResolvedValue(null);

      await expect(
        service.updateByKey({ configId: 0, configKey: 'nonexistent.key', configValue: 'value', configName: '', configType: 'N' }),
      ).rejects.toThrow(BusinessException);

      expect(configRepo.update).not.toHaveBeenCalled();
    });

    // R-FLOW-CONFIG-10: 按键正常更新参数值
    it('Given 存在的configKey, When updateByKey, Then 成功更新参数值', async () => {
      configRepo.findByConfigKey.mockResolvedValue(mockConfig);
      configRepo.update.mockResolvedValue(mockConfig);

      const result = await service.updateByKey({
        configId: 0,
        configKey: 'test.config.key',
        configValue: 'updated-value',
        configName: '',
        configType: 'N',
      });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(configRepo.update).toHaveBeenCalledWith(1, { configValue: 'updated-value' });
    });
  });

  describe('remove', () => {
    // R-IN-CONFIG-04: 删除内置参数时阻止
    it('Given 包含内置参数, When remove, Then 抛出内置参数不能删除异常', async () => {
      configRepo.findMany.mockResolvedValue([
        { configType: 'N', configKey: 'custom.key' },
        { configType: 'Y', configKey: 'sys.builtin.key' },
      ]);

      await expect(service.remove([1, 2])).rejects.toThrow(BusinessException);

      expect(configRepo.softDeleteBatch).not.toHaveBeenCalled();
    });

    // R-FLOW-CONFIG-11: 正常删除自定义参数
    it('Given 全部为自定义参数, When remove, Then 成功软删除', async () => {
      configRepo.findMany.mockResolvedValue([
        { configType: 'N', configKey: 'custom.key1' },
        { configType: 'N', configKey: 'custom.key2' },
      ]);
      configRepo.softDeleteBatch.mockResolvedValue({ count: 2 });

      const result = await service.remove([1, 2]);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(configRepo.softDeleteBatch).toHaveBeenCalledWith([1, 2]);
    });

    // R-BRANCH-CONFIG-06: 删除单个自定义参数
    it('Given 单个自定义参数, When remove, Then 成功删除', async () => {
      configRepo.findMany.mockResolvedValue([{ configType: 'N', configKey: 'custom.key' }]);
      configRepo.softDeleteBatch.mockResolvedValue({ count: 1 });

      const result = await service.remove([1]);

      expect(result.code).toBe(ResponseCode.SUCCESS);
    });
  });

  describe('resetConfigCache', () => {
    // R-FLOW-CONFIG-12: 刷新缓存
    it('Given 调用resetConfigCache, When 执行, Then 清除并重新加载缓存', async () => {
      const clearSpy = jest.spyOn(service, 'clearConfigCache').mockResolvedValue();
      const loadSpy = jest.spyOn(service, 'loadingConfigCache').mockResolvedValue();

      const result = await service.resetConfigCache();

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(clearSpy).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('loadingConfigCache', () => {
    // R-FLOW-CONFIG-13: 加载缓存
    it('Given 有效参数列表, When loadingConfigCache, Then 逐条写入Redis', async () => {
      configRepo.findMany.mockResolvedValue([
        { configKey: 'key1', configValue: 'value1' },
        { configKey: 'key2', configValue: 'value2' },
      ]);

      await service.loadingConfigCache();

      expect(redisService.set).toHaveBeenCalledWith(`${CacheEnum.SYS_CONFIG_KEY}key1`, 'value1');
      expect(redisService.set).toHaveBeenCalledWith(`${CacheEnum.SYS_CONFIG_KEY}key2`, 'value2');
    });

    // R-BRANCH-CONFIG-07: 跳过空键名的参数
    it('Given 包含空键名的参数, When loadingConfigCache, Then 跳过空键名', async () => {
      configRepo.findMany.mockResolvedValue([
        { configKey: 'key1', configValue: 'value1' },
        { configKey: null, configValue: 'value2' },
        { configKey: '', configValue: 'value3' },
      ]);

      await service.loadingConfigCache();

      expect(redisService.set).toHaveBeenCalledTimes(1);
      expect(redisService.set).toHaveBeenCalledWith(`${CacheEnum.SYS_CONFIG_KEY}key1`, 'value1');
    });
  });
});
