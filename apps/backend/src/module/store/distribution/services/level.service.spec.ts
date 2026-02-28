import { Test, TestingModule } from '@nestjs/testing';
import { LevelService } from './level.service';
import { LevelConditionService } from './level-condition.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { Decimal } from '@prisma/client/runtime/library';

describe('LevelService', () => {
  let service: LevelService;
  let prisma: PrismaService;

  const mockPrismaService = {
    sysDistLevel: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    umsMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    sysDistLevelLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockLevelConditionService = {
    checkCondition: jest.fn(),
    batchCheckUpgrade: jest.fn(),
    batchCheckMaintain: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LevelConditionService,
          useValue: mockLevelConditionService,
        },
      ],
    }).compile();

    service = module.get<LevelService>(LevelService);
    prisma = module.get<PrismaService>(PrismaService);

    // 清除所有mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const tenantId = 'T001';
    const operator = 'admin';
    const createDto = {
      levelId: 1,
      levelName: '初级分销员',
      levelIcon: '/icons/level-1.png',
      level1Rate: 10,
      level2Rate: 5,
      sort: 1,
      isActive: true,
    };

    it('应该成功创建等级配置', async () => {
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue(null);
      mockPrismaService.sysDistLevel.create.mockResolvedValue({
        id: 1,
        tenantId,
        levelId: 1,
        levelName: '初级分销员',
        levelIcon: '/icons/level-1.png',
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        upgradeCondition: null,
        maintainCondition: null,
        benefits: null,
        sort: 1,
        isActive: true,
        createBy: operator,
        createTime: new Date(),
        updateBy: operator,
        updateTime: new Date(),
      });

      const result = await service.create(tenantId, createDto, operator);

      expect(result).toBeDefined();
      expect(result.levelId).toBe(1);
      expect(result.levelName).toBe('初级分销员');
      expect(result.level1Rate).toBe('10.00');
      expect(result.level2Rate).toBe('5.00');
      expect(mockPrismaService.sysDistLevel.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_levelId: {
            tenantId,
            levelId: 1,
          },
        },
      });
      expect(mockPrismaService.sysDistLevel.create).toHaveBeenCalled();
    });

    it('应该在等级编号已存在时抛出异常', async () => {
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue({
        id: 1,
        levelId: 1,
      });

      await expect(service.create(tenantId, createDto, operator)).rejects.toThrow(BusinessException);
      expect(mockPrismaService.sysDistLevel.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const tenantId = 'T001';
    const operator = 'admin';
    const levelId = 1;
    const updateDto = {
      levelName: '初级分销员（更新）',
      level1Rate: 12,
    };

    it('应该成功更新等级配置', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: levelId,
        tenantId,
        levelId: 1,
        levelName: '初级分销员',
      });
      mockPrismaService.sysDistLevel.update.mockResolvedValue({
        id: levelId,
        tenantId,
        levelId: 1,
        levelName: '初级分销员（更新）',
        levelIcon: '/icons/level-1.png',
        level1Rate: new Decimal(0.12),
        level2Rate: new Decimal(0.05),
        upgradeCondition: null,
        maintainCondition: null,
        benefits: null,
        sort: 1,
        isActive: true,
        createBy: operator,
        createTime: new Date(),
        updateBy: operator,
        updateTime: new Date(),
      });

      const result = await service.update(tenantId, levelId, updateDto, operator);

      expect(result).toBeDefined();
      expect(result.levelName).toBe('初级分销员（更新）');
      expect(result.level1Rate).toBe('12.00');
      expect(mockPrismaService.sysDistLevel.update).toHaveBeenCalled();
    });

    it('应该在等级不存在时抛出异常', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue(null);

      await expect(service.update(tenantId, levelId, updateDto, operator)).rejects.toThrow(BusinessException);
      expect(mockPrismaService.sysDistLevel.update).not.toHaveBeenCalled();
    });

    it('应该在修改levelId时检查重复', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: levelId,
        tenantId,
        levelId: 1,
      });
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue({
        id: 2,
        levelId: 2,
      });

      await expect(
        service.update(tenantId, levelId, { ...updateDto, levelId: 2 }, operator),
      ).rejects.toThrow(BusinessException);
      expect(mockPrismaService.sysDistLevel.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const tenantId = 'T001';
    const operator = 'admin';
    const levelId = 1;

    it('应该成功删除等级配置（软删除）', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: levelId,
        tenantId,
        levelId: 1,
      });
      mockPrismaService.umsMember.count.mockResolvedValue(0);
      mockPrismaService.sysDistLevel.update.mockResolvedValue({});

      await service.delete(tenantId, levelId, operator);

      expect(mockPrismaService.sysDistLevel.update).toHaveBeenCalledWith({
        where: { id: levelId },
        data: {
          isActive: false,
          updateBy: operator,
        },
      });
    });

    it('应该在等级不存在时抛出异常', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue(null);

      await expect(service.delete(tenantId, levelId, operator)).rejects.toThrow(BusinessException);
      expect(mockPrismaService.sysDistLevel.update).not.toHaveBeenCalled();
    });

    it('应该在有会员使用该等级时抛出异常', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: levelId,
        tenantId,
        levelId: 1,
      });
      mockPrismaService.umsMember.count.mockResolvedValue(5);

      await expect(service.delete(tenantId, levelId, operator)).rejects.toThrow(BusinessException);
      expect(mockPrismaService.sysDistLevel.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const tenantId = 'T001';

    it('应该返回所有激活的等级配置', async () => {
      mockPrismaService.sysDistLevel.findMany.mockResolvedValue([
        {
          id: 1,
          tenantId,
          levelId: 1,
          levelName: '初级分销员',
          levelIcon: '/icons/level-1.png',
          level1Rate: new Decimal(0.1),
          level2Rate: new Decimal(0.05),
          upgradeCondition: null,
          maintainCondition: null,
          benefits: null,
          sort: 1,
          isActive: true,
          createBy: 'admin',
          createTime: new Date(),
          updateBy: 'admin',
          updateTime: new Date(),
        },
        {
          id: 2,
          tenantId,
          levelId: 2,
          levelName: '中级分销员',
          levelIcon: '/icons/level-2.png',
          level1Rate: new Decimal(0.12),
          level2Rate: new Decimal(0.06),
          upgradeCondition: null,
          maintainCondition: null,
          benefits: null,
          sort: 2,
          isActive: true,
          createBy: 'admin',
          createTime: new Date(),
          updateBy: 'admin',
          updateTime: new Date(),
        },
      ]);

      const result = await service.findAll(tenantId, { isActive: true });

      expect(result).toHaveLength(2);
      expect(result[0].levelName).toBe('初级分销员');
      expect(result[1].levelName).toBe('中级分销员');
      expect(mockPrismaService.sysDistLevel.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: [{ sort: 'asc' }, { levelId: 'asc' }],
      });
    });

    it('应该返回所有等级配置（包括未激活）', async () => {
      mockPrismaService.sysDistLevel.findMany.mockResolvedValue([]);

      const result = await service.findAll(tenantId, {});

      expect(result).toHaveLength(0);
      expect(mockPrismaService.sysDistLevel.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
        },
        orderBy: [{ sort: 'asc' }, { levelId: 'asc' }],
      });
    });
  });

  describe('findOne', () => {
    const tenantId = 'T001';
    const levelId = 1;

    it('应该返回指定的等级配置', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: levelId,
        tenantId,
        levelId: 1,
        levelName: '初级分销员',
        levelIcon: '/icons/level-1.png',
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        upgradeCondition: null,
        maintainCondition: null,
        benefits: null,
        sort: 1,
        isActive: true,
        createBy: 'admin',
        createTime: new Date(),
        updateBy: 'admin',
        updateTime: new Date(),
      });

      const result = await service.findOne(tenantId, levelId);

      expect(result).toBeDefined();
      expect(result.levelName).toBe('初级分销员');
      expect(mockPrismaService.sysDistLevel.findFirst).toHaveBeenCalledWith({
        where: { id: levelId, tenantId },
      });
    });

    it('应该在等级不存在时抛出异常', async () => {
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, levelId)).rejects.toThrow(BusinessException);
    });
  });

  describe('findByLevelId', () => {
    const tenantId = 'T001';
    const levelId = 1;

    it('应该根据levelId返回等级配置', async () => {
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue({
        id: 1,
        tenantId,
        levelId: 1,
        levelName: '初级分销员',
        levelIcon: '/icons/level-1.png',
        level1Rate: new Decimal(0.1),
        level2Rate: new Decimal(0.05),
        upgradeCondition: null,
        maintainCondition: null,
        benefits: null,
        sort: 1,
        isActive: true,
        createBy: 'admin',
        createTime: new Date(),
        updateBy: 'admin',
        updateTime: new Date(),
      });

      const result = await service.findByLevelId(tenantId, levelId);

      expect(result).toBeDefined();
      expect(result?.levelId).toBe(1);
      expect(mockPrismaService.sysDistLevel.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_levelId: {
            tenantId,
            levelId,
          },
        },
      });
    });

    it('应该在等级不存在时返回null', async () => {
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue(null);

      const result = await service.findByLevelId(tenantId, levelId);

      expect(result).toBeNull();
    });
  });

  describe('updateMemberLevel', () => {
    const tenantId = 'T001';
    const operator = 'admin';
    const dto = {
      memberId: 'M001',
      targetLevel: 2,
      reason: '手动调整',
    };

    it('应该成功调整会员等级', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId: 'M001',
        tenantId,
        levelId: 1,
      });
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue({
        id: 2,
        tenantId,
        levelId: 2,
        isActive: true,
      });
      mockPrismaService.umsMember.update.mockResolvedValue({});
      mockPrismaService.sysDistLevelLog.create.mockResolvedValue({});

      await service.updateMemberLevel(tenantId, dto, operator);

      expect(mockPrismaService.umsMember.update).toHaveBeenCalledWith({
        where: { memberId: dto.memberId },
        data: {
          levelId: dto.targetLevel,
          upgradedAt: expect.any(Date),
        },
      });
      expect(mockPrismaService.sysDistLevelLog.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          memberId: dto.memberId,
          fromLevel: 1,
          toLevel: dto.targetLevel,
          changeType: 'MANUAL',
          reason: dto.reason,
          operator,
        },
      });
    });

    it('应该在会员不存在时抛出异常', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue(null);

      await expect(service.updateMemberLevel(tenantId, dto, operator)).rejects.toThrow(BusinessException);
      expect(mockPrismaService.umsMember.update).not.toHaveBeenCalled();
    });

    it('应该在目标等级不存在时抛出异常', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId: 'M001',
        tenantId,
        levelId: 1,
      });
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue(null);

      await expect(service.updateMemberLevel(tenantId, dto, operator)).rejects.toThrow(BusinessException);
      expect(mockPrismaService.umsMember.update).not.toHaveBeenCalled();
    });

    it('应该在目标等级未激活时抛出异常', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId: 'M001',
        tenantId,
        levelId: 1,
      });
      mockPrismaService.sysDistLevel.findUnique.mockResolvedValue({
        id: 2,
        tenantId,
        levelId: 2,
        isActive: false,
      });

      await expect(service.updateMemberLevel(tenantId, dto, operator)).rejects.toThrow(BusinessException);
      expect(mockPrismaService.umsMember.update).not.toHaveBeenCalled();
    });

    it('应该允许降级到0级（普通用户）', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId: 'M001',
        tenantId,
        levelId: 1,
      });
      mockPrismaService.umsMember.update.mockResolvedValue({});
      mockPrismaService.sysDistLevelLog.create.mockResolvedValue({});

      await service.updateMemberLevel(tenantId, { ...dto, targetLevel: 0 }, operator);

      expect(mockPrismaService.umsMember.update).toHaveBeenCalled();
      expect(mockPrismaService.sysDistLevel.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getMemberLevelLogs', () => {
    const tenantId = 'T001';

    it('应该返回会员等级变更日志', async () => {
      mockPrismaService.sysDistLevelLog.findMany.mockResolvedValue([
        {
          id: 1,
          tenantId,
          memberId: 'M001',
          fromLevel: 1,
          toLevel: 2,
          changeType: 'UPGRADE',
          reason: '满足升级条件',
          operator: null,
          createTime: new Date(),
        },
      ]);
      mockPrismaService.sysDistLevelLog.count.mockResolvedValue(1);

      const result = await service.getMemberLevelLogs(tenantId, {
        pageNum: 1,
        pageSize: 10,
      });

      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.rows[0].changeType).toBe('UPGRADE');
    });

    it('应该支持按会员ID筛选', async () => {
      mockPrismaService.sysDistLevelLog.findMany.mockResolvedValue([]);
      mockPrismaService.sysDistLevelLog.count.mockResolvedValue(0);

      await service.getMemberLevelLogs(tenantId, {
        pageNum: 1,
        pageSize: 10,
        memberId: 'M001',
      });

      expect(mockPrismaService.sysDistLevelLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          memberId: 'M001',
        },
        skip: 0,
        take: 10,
        orderBy: { createTime: 'desc' },
      });
    });

    it('应该支持按变更类型筛选', async () => {
      mockPrismaService.sysDistLevelLog.findMany.mockResolvedValue([]);
      mockPrismaService.sysDistLevelLog.count.mockResolvedValue(0);

      await service.getMemberLevelLogs(tenantId, {
        pageNum: 1,
        pageSize: 10,
        changeType: 'MANUAL',
      });

      expect(mockPrismaService.sysDistLevelLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          changeType: 'MANUAL',
        },
        skip: 0,
        take: 10,
        orderBy: { createTime: 'desc' },
      });
    });
  });

  describe('checkUpgradeEligibility', () => {
    const tenantId = 'T001';
    const memberId = 'M001';

    it('应该返回会员当前等级信息', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId,
        tenantId,
        levelId: 1,
      });

      const result = await service.checkUpgradeEligibility(tenantId, memberId);

      expect(result).toBeDefined();
      expect(result.currentLevel).toBe(1);
      expect(result.eligibleLevel).toBe(1);
      expect(result.canUpgrade).toBe(false);
      expect(result.conditionResults).toEqual([]);
    });

    it('应该在会员不存在时抛出异常', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue(null);

      await expect(service.checkUpgradeEligibility(tenantId, memberId)).rejects.toThrow(BusinessException);
    });

    describe('完整实现', () => {
    const tenantId = 'T001';
    const memberId = 'M001';

    it('应该返回可以升级的结果', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId,
        tenantId,
        levelId: 1,
      });
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: 2,
        tenantId,
        levelId: 2,
        isActive: true,
        upgradeCondition: {
          type: 'AND',
          rules: [
            {
              field: 'totalCommission',
              operator: '>=',
              value: 1000,
            },
          ],
        },
      });
      mockLevelConditionService.checkCondition.mockResolvedValue({
        passed: true,
        results: [
          {
            field: 'totalCommission',
            required: 1000,
            actual: 1500,
            passed: true,
          },
        ],
      });

      const result = await service.checkUpgradeEligibility(tenantId, memberId);

      expect(result.currentLevel).toBe(1);
      expect(result.eligibleLevel).toBe(2);
      expect(result.canUpgrade).toBe(true);
      expect(result.conditionResults).toHaveLength(1);
      expect(result.conditionResults[0].passed).toBe(true);
    });

    it('应该返回不可升级的结果（不满足条件）', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId,
        tenantId,
        levelId: 1,
      });
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: 2,
        tenantId,
        levelId: 2,
        isActive: true,
        upgradeCondition: {
          type: 'AND',
          rules: [
            {
              field: 'totalCommission',
              operator: '>=',
              value: 1000,
            },
          ],
        },
      });
      mockLevelConditionService.checkCondition.mockResolvedValue({
        passed: false,
        results: [
          {
            field: 'totalCommission',
            required: 1000,
            actual: 500,
            passed: false,
          },
        ],
      });

      const result = await service.checkUpgradeEligibility(tenantId, memberId);

      expect(result.currentLevel).toBe(1);
      expect(result.eligibleLevel).toBe(1);
      expect(result.canUpgrade).toBe(false);
      expect(result.conditionResults[0].passed).toBe(false);
    });

    it('应该在没有下一等级时返回不可升级', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId,
        tenantId,
        levelId: 10,
      });
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue(null);

      const result = await service.checkUpgradeEligibility(tenantId, memberId);

      expect(result.currentLevel).toBe(10);
      expect(result.eligibleLevel).toBe(10);
      expect(result.canUpgrade).toBe(false);
      expect(result.conditionResults).toHaveLength(0);
    });

    it('应该在下一等级没有升级条件时返回不可升级', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId,
        tenantId,
        levelId: 1,
      });
      mockPrismaService.sysDistLevel.findFirst.mockResolvedValue({
        id: 2,
        tenantId,
        levelId: 2,
        isActive: true,
        upgradeCondition: null,
      });

      const result = await service.checkUpgradeEligibility(tenantId, memberId);

      expect(result.canUpgrade).toBe(false);
    });
  });

  describe('autoUpgradeMember', () => {
    const tenantId = 'T001';
    const memberId = 'M001';
    const targetLevel = 2;
    const reason = '满足升级条件';

    it('应该成功自动升级会员', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId,
        tenantId,
        levelId: 1,
      });
      mockPrismaService.umsMember.update.mockResolvedValue({});
      mockPrismaService.sysDistLevelLog.create.mockResolvedValue({});

      await service.autoUpgradeMember(tenantId, memberId, targetLevel, reason);

      expect(mockPrismaService.umsMember.update).toHaveBeenCalledWith({
        where: { memberId },
        data: {
          levelId: targetLevel,
          upgradedAt: expect.any(Date),
        },
      });
      expect(mockPrismaService.sysDistLevelLog.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          memberId,
          fromLevel: 1,
          toLevel: targetLevel,
          changeType: 'UPGRADE',
          reason,
          operator: null,
        },
      });
    });

    it('应该在会员不存在时抛出异常', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue(null);

      await expect(service.autoUpgradeMember(tenantId, memberId, targetLevel, reason)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('autoDowngradeMember', () => {
    const tenantId = 'T001';
    const memberId = 'M001';
    const targetLevel = 1;
    const reason = '不满足保级条件';

    it('应该成功自动降级会员', async () => {
      mockPrismaService.umsMember.findFirst.mockResolvedValue({
        memberId,
        tenantId,
        levelId: 2,
      });
      mockPrismaService.umsMember.update.mockResolvedValue({});
      mockPrismaService.sysDistLevelLog.create.mockResolvedValue({});

      await service.autoDowngradeMember(tenantId, memberId, targetLevel, reason);

      expect(mockPrismaService.umsMember.update).toHaveBeenCalledWith({
        where: { memberId },
        data: {
          levelId: targetLevel,
          upgradedAt: expect.any(Date),
        },
      });
      expect(mockPrismaService.sysDistLevelLog.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          memberId,
          fromLevel: 2,
          toLevel: targetLevel,
          changeType: 'DOWNGRADE',
          reason,
          operator: null,
        },
      });
    });
  });

  describe('batchProcessUpgrade', () => {
    const tenantId = 'T001';

    it('应该批量处理会员升级', async () => {
      // Mock等级配置
      mockPrismaService.sysDistLevel.findMany.mockResolvedValue([
        {
          id: 2,
          tenantId,
          levelId: 2,
          upgradeCondition: {
            type: 'AND',
            rules: [{ field: 'totalCommission', operator: '>=', value: 1000 }],
          },
        },
      ]);

      // Mock会员列表
      mockPrismaService.umsMember.findMany.mockResolvedValue([
        { memberId: 'M001' },
        { memberId: 'M002' },
        { memberId: 'M003' },
      ]);

      // Mock条件检查结果
      const checkResults = new Map([
        ['M001', true],
        ['M002', false],
        ['M003', true],
      ]);
      mockLevelConditionService.batchCheckUpgrade.mockResolvedValue(checkResults);

      // Mock自动升级
      jest.spyOn(service, 'autoUpgradeMember').mockResolvedValue(undefined);

      const result = await service.batchProcessUpgrade(tenantId);

      expect(result.upgraded).toBe(2); // M001和M003升级
      expect(result.failed).toBe(0);
      expect(service.autoUpgradeMember).toHaveBeenCalledTimes(2);
    });

    it('应该处理升级失败的情况', async () => {
      mockPrismaService.sysDistLevel.findMany.mockResolvedValue([
        {
          id: 2,
          tenantId,
          levelId: 2,
          upgradeCondition: { type: 'AND', rules: [] },
        },
      ]);
      mockPrismaService.umsMember.findMany.mockResolvedValue([{ memberId: 'M001' }]);

      const checkResults = new Map([['M001', true]]);
      mockLevelConditionService.batchCheckUpgrade.mockResolvedValue(checkResults);
      jest.spyOn(service, 'autoUpgradeMember').mockRejectedValue(new Error('升级失败'));

      const result = await service.batchProcessUpgrade(tenantId);

      expect(result.upgraded).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('batchProcessDowngrade', () => {
    const tenantId = 'T001';

    it('应该批量处理会员降级', async () => {
      mockPrismaService.sysDistLevel.findMany.mockResolvedValue([
        {
          id: 2,
          tenantId,
          levelId: 2,
          maintainCondition: {
            type: 'AND',
            rules: [{ field: 'recentCommission', operator: '>=', value: 100, days: 30 }],
          },
        },
      ]);

      mockPrismaService.umsMember.findMany.mockResolvedValue([
        { memberId: 'M001' },
        { memberId: 'M002' },
      ]);

      const checkResults = new Map([
        ['M001', true], // 满足保级条件
        ['M002', false], // 不满足保级条件
      ]);
      mockLevelConditionService.batchCheckMaintain.mockResolvedValue(checkResults);
      jest.spyOn(service, 'autoDowngradeMember').mockResolvedValue(undefined);

      const result = await service.batchProcessDowngrade(tenantId);

      expect(result.downgraded).toBe(1); // 只有M002降级
      expect(result.failed).toBe(0);
      expect(service.autoDowngradeMember).toHaveBeenCalledTimes(1);
      expect(service.autoDowngradeMember).toHaveBeenCalledWith(
        tenantId,
        'M002',
        1, // 从2级降到1级
        '不满足保级条件，自动降级',
      );
    });
  });
  });
});
