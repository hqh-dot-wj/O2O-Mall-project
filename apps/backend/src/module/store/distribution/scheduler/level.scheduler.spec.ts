// @ts-nocheck
 
import { Test, TestingModule } from '@nestjs/testing';
import { LevelScheduler } from './level.scheduler';
import { LevelService } from '../services/level.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('LevelScheduler', () => {
  let scheduler: LevelScheduler;
  let levelService: LevelService;
  let prisma: PrismaService;

  const mockLevelService = {
    batchProcessUpgrade: jest.fn(),
    batchProcessDowngrade: jest.fn(),
  };

  const mockPrismaService = {
    sysTenant: {
      findMany: jest.fn(),
    },
    umsMember: {
      findMany: jest.fn(),
    },
    sysDistLevel: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelScheduler,
        {
          provide: LevelService,
          useValue: mockLevelService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    scheduler = module.get<LevelScheduler>(LevelScheduler);
    levelService = module.get<LevelService>(LevelService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  describe('processUpgrade', () => {
    it('应该成功处理所有租户的升级任务', async () => {
      // Mock租户数据
      mockPrismaService.sysTenant.findMany.mockResolvedValue([
        { tenantId: 'T001', companyName: '租户1' },
        { tenantId: 'T002', companyName: '租户2' },
      ]);

      // Mock升级结果
      mockLevelService.batchProcessUpgrade
        .mockResolvedValueOnce({ upgraded: 5, failed: 0 })
        .mockResolvedValueOnce({ upgraded: 3, failed: 1 });

      await scheduler.processUpgrade();

      expect(mockPrismaService.sysTenant.findMany).toHaveBeenCalledWith({
        where: { status: 'NORMAL' },
        select: { tenantId: true, companyName: true },
      });
      expect(mockLevelService.batchProcessUpgrade).toHaveBeenCalledTimes(2);
      expect(mockLevelService.batchProcessUpgrade).toHaveBeenCalledWith('T001');
      expect(mockLevelService.batchProcessUpgrade).toHaveBeenCalledWith('T002');
    });

    it('应该处理单个租户升级失败的情况', async () => {
      mockPrismaService.sysTenant.findMany.mockResolvedValue([
        { tenantId: 'T001', companyName: '租户1' },
        { tenantId: 'T002', companyName: '租户2' },
      ]);

      mockLevelService.batchProcessUpgrade
        .mockResolvedValueOnce({ upgraded: 5, failed: 0 })
        .mockRejectedValueOnce(new Error('升级失败'));

      await scheduler.processUpgrade();

      // 应该继续处理其他租户
      expect(mockLevelService.batchProcessUpgrade).toHaveBeenCalledTimes(2);
    });

    it('应该处理查询租户失败的情况', async () => {
      mockPrismaService.sysTenant.findMany.mockRejectedValue(new Error('数据库错误'));

      await scheduler.processUpgrade();

      // 不应该调用升级方法
      expect(mockLevelService.batchProcessUpgrade).not.toHaveBeenCalled();
    });

    it('应该只处理正常状态的租户', async () => {
      mockPrismaService.sysTenant.findMany.mockResolvedValue([
        { tenantId: 'T001', companyName: '租户1' },
      ]);

      mockLevelService.batchProcessUpgrade.mockResolvedValue({ upgraded: 5, failed: 0 });

      await scheduler.processUpgrade();

      expect(mockPrismaService.sysTenant.findMany).toHaveBeenCalledWith({
        where: { status: 'NORMAL' },
        select: { tenantId: true, companyName: true },
      });
    });
  });

  describe('processDowngrade', () => {
    it('应该成功处理所有租户的降级任务', async () => {
      mockPrismaService.sysTenant.findMany.mockResolvedValue([
        { tenantId: 'T001', companyName: '租户1' },
        { tenantId: 'T002', companyName: '租户2' },
      ]);

      mockLevelService.batchProcessDowngrade
        .mockResolvedValueOnce({ downgraded: 2, failed: 0 })
        .mockResolvedValueOnce({ downgraded: 1, failed: 0 });

      await scheduler.processDowngrade();

      expect(mockPrismaService.sysTenant.findMany).toHaveBeenCalledWith({
        where: { status: 'NORMAL' },
        select: { tenantId: true, companyName: true },
      });
      expect(mockLevelService.batchProcessDowngrade).toHaveBeenCalledTimes(2);
      expect(mockLevelService.batchProcessDowngrade).toHaveBeenCalledWith('T001');
      expect(mockLevelService.batchProcessDowngrade).toHaveBeenCalledWith('T002');
    });

    it('应该处理单个租户降级失败的情况', async () => {
      mockPrismaService.sysTenant.findMany.mockResolvedValue([
        { tenantId: 'T001', companyName: '租户1' },
        { tenantId: 'T002', companyName: '租户2' },
      ]);

      mockLevelService.batchProcessDowngrade
        .mockResolvedValueOnce({ downgraded: 2, failed: 0 })
        .mockRejectedValueOnce(new Error('降级失败'));

      await scheduler.processDowngrade();

      expect(mockLevelService.batchProcessDowngrade).toHaveBeenCalledTimes(2);
    });

    it('应该处理查询租户失败的情况', async () => {
      mockPrismaService.sysTenant.findMany.mockRejectedValue(new Error('数据库错误'));

      await scheduler.processDowngrade();

      expect(mockLevelService.batchProcessDowngrade).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('应该检查会员等级的有效性', async () => {
      mockPrismaService.sysTenant.findMany.mockResolvedValue([{ tenantId: 'T001' }]);

      mockPrismaService.umsMember.findMany.mockResolvedValue([
        { memberId: 'M001', levelId: 1 },
        { memberId: 'M002', levelId: 2 },
        { memberId: 'M003', levelId: 99 }, // 无效等级
      ]);

      mockPrismaService.sysDistLevel.findMany.mockResolvedValue([
        { levelId: 1 },
        { levelId: 2 },
      ]);

      await scheduler.healthCheck();

      expect(mockPrismaService.sysTenant.findMany).toHaveBeenCalled();
      expect(mockPrismaService.umsMember.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'T001',
          levelId: {
            gt: 0,
          },
        },
        select: {
          memberId: true,
          levelId: true,
        },
      });
      expect(mockPrismaService.sysDistLevel.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'T001',
          isActive: true,
        },
        select: { levelId: true },
      });
    });

    it('应该处理没有分销员的情况', async () => {
      mockPrismaService.sysTenant.findMany.mockResolvedValue([{ tenantId: 'T001' }]);
      mockPrismaService.umsMember.findMany.mockResolvedValue([]);

      await scheduler.healthCheck();

      expect(mockPrismaService.umsMember.findMany).toHaveBeenCalled();
      // 不应该查询等级配置
      expect(mockPrismaService.sysDistLevel.findMany).not.toHaveBeenCalled();
    });

    it('应该处理健康检查失败的情况', async () => {
      mockPrismaService.sysTenant.findMany.mockRejectedValue(new Error('数据库错误'));

      await scheduler.healthCheck();

      // 不应该抛出异常
      expect(mockPrismaService.umsMember.findMany).not.toHaveBeenCalled();
    });

    it('应该处理所有会员等级都有效的情况', async () => {
      mockPrismaService.sysTenant.findMany.mockResolvedValue([{ tenantId: 'T001' }]);

      mockPrismaService.umsMember.findMany.mockResolvedValue([
        { memberId: 'M001', levelId: 1 },
        { memberId: 'M002', levelId: 2 },
      ]);

      mockPrismaService.sysDistLevel.findMany.mockResolvedValue([
        { levelId: 1 },
        { levelId: 2 },
      ]);

      await scheduler.healthCheck();

      expect(mockPrismaService.sysDistLevel.findMany).toHaveBeenCalled();
    });
  });
});
