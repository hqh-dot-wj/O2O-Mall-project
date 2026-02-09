import { Test, TestingModule } from '@nestjs/testing';
import { StorePlayConfigService } from './config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorePlayConfigRepository } from './config.repository';
import { PlayTemplateRepository } from '../template/template.repository';
import { PmsProductService } from 'src/module/pms/product.service';
import { PlayStrategyFactory } from '../play/play.factory';
import { BusinessException } from 'src/common/exceptions/business.exception';

/**
 * 活动版本控制功能单元测试
 * 
 * @description
 * 测试活动配置的版本控制功能，包括：
 * - 规则变更时自动保存历史版本
 * - 版本回滚功能
 * - 历史版本查询
 * - 版本比较功能
 * 
 * @验证需求 FR-7.1
 */
describe('StorePlayConfigService - Version Control', () => {
  let service: StorePlayConfigService;
  let repository: StorePlayConfigRepository;

  // Mock 数据
  const mockConfig: any = {
    id: 'config-123',
    tenantId: '000000',
    storeId: 'store-456',
    serviceId: 'product-789',
    templateCode: 'GROUP_BUY',
    rules: {
      name: '春节拼团活动',
      minUsers: 3,
      maxUsers: 10,
      price: 99,
    },
    rulesHistory: [],
    status: 'OFF_SHELF',
    createTime: new Date('2024-02-01'),
    updateTime: new Date('2024-02-01'),
  };

  const mockConfigWithHistory: any = {
    ...mockConfig,
    rules: {
      name: '春节拼团活动 v2',
      minUsers: 5,
      maxUsers: 15,
      price: 89,
    },
    rulesHistory: [
      {
        version: 1,
        rules: {
          name: '春节拼团活动',
          minUsers: 3,
          maxUsers: 10,
          price: 99,
        },
        updateTime: '2024-02-01T10:00:00Z',
        operator: 'admin-1',
      },
    ],
    updateTime: new Date('2024-02-02'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorePlayConfigService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: StorePlayConfigRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: PlayTemplateRepository,
          useValue: {},
        },
        {
          provide: PmsProductService,
          useValue: {},
        },
        {
          provide: PlayStrategyFactory,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<StorePlayConfigService>(StorePlayConfigService);
    repository = module.get<StorePlayConfigRepository>(StorePlayConfigRepository);
  });

  describe('update - 规则变更时保存历史版本', () => {
    it('应该在规则变更时自动保存历史版本', async () => {
      // Arrange
      const updateDto: any = {
        rules: {
          name: '春节拼团活动 v2',
          minUsers: 5,
          maxUsers: 15,
          price: 89,
        },
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfig as any);
      jest.spyOn(repository, 'update').mockResolvedValue({
        ...mockConfig,
        ...updateDto,
        rulesHistory: [
          {
            version: 1,
            rules: mockConfig.rules,
            updateTime: expect.any(String),
            operator: 'admin-1',
          },
        ],
      } as any);

      // Act
      const result = await service.update('config-123', updateDto, 'admin-1');

      // Assert
      expect((result.data as any).rulesHistory).toHaveLength(1);
      expect((result.data as any).rulesHistory[0].version).toBe(1);
      expect((result.data as any).rulesHistory[0].rules).toEqual(mockConfig.rules);
      expect((result.data as any).rulesHistory[0].operator).toBe('admin-1');
    });

    it('应该在规则未变更时不保存历史版本', async () => {
      // Arrange
      const updateDto: any = {
        status: 'ON_SHELF', // 只更新状态，不更新规则
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfig as any);
      jest.spyOn(repository, 'update').mockResolvedValue({
        ...mockConfig,
        ...updateDto,
      } as any);

      // Act
      const result = await service.update('config-123', updateDto, 'admin-1');

      // Assert
      expect((result.data as any).rulesHistory).toEqual([]);
    });

    it('应该正确递增版本号', async () => {
      // Arrange
      const updateDto: any = {
        rules: {
          name: '春节拼团活动 v3',
          minUsers: 6,
          maxUsers: 20,
          price: 79,
        },
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfigWithHistory as any);
      jest.spyOn(repository, 'update').mockResolvedValue({
        ...mockConfigWithHistory,
        ...updateDto,
        rulesHistory: [
          {
            version: 2,
            rules: mockConfigWithHistory.rules,
            updateTime: expect.any(String),
            operator: 'admin-2',
          },
          ...mockConfigWithHistory.rulesHistory,
        ],
      } as any);

      // Act
      const result = await service.update('config-123', updateDto, 'admin-2');

      // Assert
      expect((result.data as any).rulesHistory).toHaveLength(2);
      expect((result.data as any).rulesHistory[0].version).toBe(2);
      expect((result.data as any).rulesHistory[1].version).toBe(1);
    });

    it('应该限制历史版本数量不超过50个', async () => {
      // Arrange
      const configWith50Versions = {
        ...mockConfig,
        rulesHistory: Array.from({ length: 50 }, (_, i) => ({
          version: i + 1,
          rules: { name: `版本 ${i + 1}` },
          updateTime: new Date().toISOString(),
          operator: 'admin-1',
        })),
      };

      const updateDto: any = {
        rules: { name: '新版本' },
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(configWith50Versions as any);
      
      const updateSpy = jest.spyOn(repository, 'update').mockImplementation(async (id, data) => {
        return {
          ...configWith50Versions,
          ...data,
        } as any;
      });

      // Act
      await service.update('config-123', updateDto, 'admin-1');

      // Assert
      const updateCall = updateSpy.mock.calls[0][1] as any;
      expect(updateCall.rulesHistory).toHaveLength(50);
    });
  });

  describe('rollbackToVersion - 版本回滚', () => {
    it('应该成功回滚到指定版本', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfigWithHistory as any);
      jest.spyOn(repository, 'update').mockResolvedValue({
        ...mockConfigWithHistory,
        rules: mockConfigWithHistory.rulesHistory[0].rules,
      } as any);

      // Act
      const result = await service.rollbackToVersion('config-123', 1, 'admin-1');

      // Assert
      expect(result.data.rules).toEqual(mockConfigWithHistory.rulesHistory[0].rules);
      expect(result.code).toBe(200);
    });

    it('应该在回滚前保存当前规则到历史版本', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfigWithHistory as any);
      
      const updateSpy = jest.spyOn(repository, 'update').mockImplementation(async (id, data) => {
        return {
          ...mockConfigWithHistory,
          ...data,
        } as any;
      });

      // Act
      await service.rollbackToVersion('config-123', 1, 'admin-1');

      // Assert
      const updateCall = updateSpy.mock.calls[0][1] as any;
      expect(updateCall.rulesHistory).toHaveLength(2); // 原有1个 + 回滚前保存1个
      expect(updateCall.rulesHistory[0].rules).toEqual(mockConfigWithHistory.rules);
    });

    it('应该在目标版本不存在时抛出异常', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfigWithHistory as any);

      // Act & Assert
      await expect(
        service.rollbackToVersion('config-123', 999, 'admin-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('应该在配置不存在时抛出异常', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.rollbackToVersion('config-123', 1, 'admin-1'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getRulesHistory - 获取历史版本列表', () => {
    it('应该返回完整的历史版本列表', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfigWithHistory as any);

      // Act
      const result = await service.getRulesHistory('config-123');

      // Assert
      expect(result.data.configId).toBe('config-123');
      expect(result.data.currentRules).toEqual(mockConfigWithHistory.rules);
      expect(result.data.history).toEqual(mockConfigWithHistory.rulesHistory);
      expect(result.data.totalVersions).toBe(1);
    });

    it('应该在配置不存在时抛出异常', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getRulesHistory('config-123')).rejects.toThrow(BusinessException);
    });

    it('应该正确处理没有历史版本的情况', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfig as any);

      // Act
      const result = await service.getRulesHistory('config-123');

      // Assert
      expect(result.data.history).toEqual([]);
      expect(result.data.totalVersions).toBe(0);
    });
  });

  describe('compareVersions - 版本比较', () => {
    it('应该正确比较当前版本和历史版本', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfigWithHistory as any);

      // Act
      const result = await service.compareVersions('config-123', 1);

      // Assert
      expect(result.data.currentVersion.rules).toEqual(mockConfigWithHistory.rules);
      expect(result.data.targetVersion.version).toBe(1);
      expect(result.data.targetVersion.rules).toEqual(mockConfigWithHistory.rulesHistory[0].rules);
      expect(result.data.hasChanges).toBe(true);
    });

    it('应该在目标版本不存在时抛出异常', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(mockConfigWithHistory as any);

      // Act & Assert
      await expect(service.compareVersions('config-123', 999)).rejects.toThrow(BusinessException);
    });

    it('应该在配置不存在时抛出异常', async () => {
      // Arrange
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(service.compareVersions('config-123', 1)).rejects.toThrow(BusinessException);
    });

    it('应该正确识别规则未变更的情况', async () => {
      // Arrange
      const configWithSameRules = {
        ...mockConfigWithHistory,
        rules: mockConfigWithHistory.rulesHistory[0].rules, // 当前规则和历史版本相同
      };

      jest.spyOn(repository, 'findById').mockResolvedValue(configWithSameRules as any);

      // Act
      const result = await service.compareVersions('config-123', 1);

      // Assert
      expect(result.data.hasChanges).toBe(false);
    });
  });
});
