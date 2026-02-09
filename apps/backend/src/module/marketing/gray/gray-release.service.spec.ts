import { Test, TestingModule } from '@nestjs/testing';
import { GrayReleaseService, GrayReleaseConfig } from './gray-release.service';
import { StorePlayConfig } from '@prisma/client';

describe('GrayReleaseService', () => {
  let service: GrayReleaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrayReleaseService],
    }).compile();

    service = module.get<GrayReleaseService>(GrayReleaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isInGrayRelease', () => {
    /**
     * 测试场景1: 未启用灰度
     * 预期: 所有用户都可以参与活动
     */
    it('should return true when gray release is not enabled', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: false,
          whitelistUserIds: [],
          whitelistStoreIds: [],
          percentage: 0,
        },
      } as unknown as StorePlayConfig;

      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(true);
    });

    /**
     * 测试场景2: 未配置灰度（grayRelease 为 null）
     * 预期: 所有用户都可以参与活动
     */
    it('should return true when gray release config is null', async () => {
      const config = {
        id: 'config-1',
        grayRelease: null,
      } as unknown as StorePlayConfig;

      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(true);
    });

    /**
     * 测试场景3: 白名单用户
     * 预期: 白名单中的用户可以参与活动
     */
    it('should return true for whitelisted users', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: ['user-1', 'user-2'],
          whitelistStoreIds: [],
          percentage: 0,
        },
      } as unknown as StorePlayConfig;

      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(true);
    });

    /**
     * 测试场景4: 非白名单用户
     * 预期: 非白名单用户不能参与活动（灰度比例为0）
     */
    it('should return false for non-whitelisted users when percentage is 0', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: ['user-2'],
          whitelistStoreIds: [],
          percentage: 0,
        },
      } as unknown as StorePlayConfig;

      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(false);
    });

    /**
     * 测试场景5: 白名单门店
     * 预期: 白名单门店的所有用户都可以参与活动
     */
    it('should return true for users in whitelisted stores', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: [],
          whitelistStoreIds: ['store-1', 'store-2'],
          percentage: 0,
        },
      } as unknown as StorePlayConfig;

      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(true);
    });

    /**
     * 测试场景6: 非白名单门店
     * 预期: 非白名单门店的用户不能参与活动（灰度比例为0）
     */
    it('should return false for users in non-whitelisted stores when percentage is 0', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: [],
          whitelistStoreIds: ['store-2'],
          percentage: 0,
        },
      } as unknown as StorePlayConfig;

      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(false);
    });

    /**
     * 测试场景7: 按比例灰度（100%）
     * 预期: 所有用户都可以参与活动
     */
    it('should return true for all users when percentage is 100', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: [],
          whitelistStoreIds: [],
          percentage: 100,
        },
      } as unknown as StorePlayConfig;

      // 测试多个用户
      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      for (const userId of users) {
        const result = await service.isInGrayRelease(config, userId, 'store-1');
        expect(result).toBe(true);
      }
    });

    /**
     * 测试场景8: 按比例灰度（0%）
     * 预期: 所有用户都不能参与活动
     */
    it('should return false for all users when percentage is 0', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: [],
          whitelistStoreIds: [],
          percentage: 0,
        },
      } as unknown as StorePlayConfig;

      // 测试多个用户
      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      for (const userId of users) {
        const result = await service.isInGrayRelease(config, userId, 'store-1');
        expect(result).toBe(false);
      }
    });

    /**
     * 测试场景9: 哈希算法稳定性
     * 预期: 相同用户ID多次调用返回相同结果
     */
    it('should return consistent results for the same user', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: [],
          whitelistStoreIds: [],
          percentage: 50,
        },
      } as unknown as StorePlayConfig;

      // 多次调用，结果应该一致
      const result1 = await service.isInGrayRelease(config, 'user-1', 'store-1');
      const result2 = await service.isInGrayRelease(config, 'user-1', 'store-1');
      const result3 = await service.isInGrayRelease(config, 'user-1', 'store-1');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    /**
     * 测试场景10: 优先级测试（白名单用户 > 灰度比例）
     * 预期: 白名单用户即使哈希值不在灰度范围内也可以参与
     */
    it('should prioritize whitelist over percentage', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: ['user-1'],
          whitelistStoreIds: [],
          percentage: 0, // 灰度比例为0
        },
      } as unknown as StorePlayConfig;

      // 白名单用户应该可以参与
      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(true);
    });

    /**
     * 测试场景11: 优先级测试（白名单门店 > 灰度比例）
     * 预期: 白名单门店的用户即使哈希值不在灰度范围内也可以参与
     */
    it('should prioritize store whitelist over percentage', async () => {
      const config = {
        id: 'config-1',
        grayRelease: {
          enabled: true,
          whitelistUserIds: [],
          whitelistStoreIds: ['store-1'],
          percentage: 0, // 灰度比例为0
        },
      } as unknown as StorePlayConfig;

      // 白名单门店的用户应该可以参与
      const result = await service.isInGrayRelease(config, 'user-1', 'store-1');
      expect(result).toBe(true);
    });
  });

  describe('getGrayConfig', () => {
    /**
     * 测试获取灰度配置
     */
    it('should return gray config when it exists', () => {
      const grayConfig: GrayReleaseConfig = {
        enabled: true,
        whitelistUserIds: ['user-1'],
        whitelistStoreIds: ['store-1'],
        percentage: 50,
      };

      const config = {
        id: 'config-1',
        grayRelease: grayConfig,
      } as unknown as StorePlayConfig;

      const result = service.getGrayConfig(config);
      expect(result).toEqual(grayConfig);
    });

    /**
     * 测试获取默认灰度配置
     */
    it('should return default config when gray config is null', () => {
      const config = {
        id: 'config-1',
        grayRelease: null,
      } as unknown as StorePlayConfig;

      const result = service.getGrayConfig(config);
      expect(result).toEqual({
        enabled: false,
        whitelistUserIds: [],
        whitelistStoreIds: [],
        percentage: 0,
      });
    });
  });

  describe('validateGrayConfig', () => {
    /**
     * 测试合法的灰度配置
     */
    it('should not throw error for valid config', () => {
      const config: GrayReleaseConfig = {
        enabled: true,
        whitelistUserIds: ['user-1'],
        whitelistStoreIds: ['store-1'],
        percentage: 50,
      };

      expect(() => service.validateGrayConfig(config)).not.toThrow();
    });

    /**
     * 测试灰度比例超出范围（负数）
     */
    it('should throw error when percentage is negative', () => {
      const config: GrayReleaseConfig = {
        enabled: true,
        whitelistUserIds: [],
        whitelistStoreIds: [],
        percentage: -10,
      };

      expect(() => service.validateGrayConfig(config)).toThrow(
        '灰度比例必须在 0-100 之间',
      );
    });

    /**
     * 测试灰度比例超出范围（大于100）
     */
    it('should throw error when percentage is greater than 100', () => {
      const config: GrayReleaseConfig = {
        enabled: true,
        whitelistUserIds: [],
        whitelistStoreIds: [],
        percentage: 150,
      };

      expect(() => service.validateGrayConfig(config)).toThrow(
        '灰度比例必须在 0-100 之间',
      );
    });

    /**
     * 测试白名单用户不是数组
     */
    it('should throw error when whitelistUserIds is not an array', () => {
      const config = {
        enabled: true,
        whitelistUserIds: 'user-1', // 不是数组
        whitelistStoreIds: [],
        percentage: 50,
      } as any;

      expect(() => service.validateGrayConfig(config)).toThrow(
        'whitelistUserIds 必须是数组',
      );
    });

    /**
     * 测试白名单门店不是数组
     */
    it('should throw error when whitelistStoreIds is not an array', () => {
      const config = {
        enabled: true,
        whitelistUserIds: [],
        whitelistStoreIds: 'store-1', // 不是数组
        percentage: 50,
      } as any;

      expect(() => service.validateGrayConfig(config)).toThrow(
        'whitelistStoreIds 必须是数组',
      );
    });

    /**
     * 测试边界值（0%）
     */
    it('should not throw error for percentage 0', () => {
      const config: GrayReleaseConfig = {
        enabled: true,
        whitelistUserIds: [],
        whitelistStoreIds: [],
        percentage: 0,
      };

      expect(() => service.validateGrayConfig(config)).not.toThrow();
    });

    /**
     * 测试边界值（100%）
     */
    it('should not throw error for percentage 100', () => {
      const config: GrayReleaseConfig = {
        enabled: true,
        whitelistUserIds: [],
        whitelistStoreIds: [],
        percentage: 100,
      };

      expect(() => service.validateGrayConfig(config)).not.toThrow();
    });
  });
});
