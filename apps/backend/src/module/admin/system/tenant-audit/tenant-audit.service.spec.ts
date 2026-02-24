import { Test, TestingModule } from '@nestjs/testing';
import { TenantAuditService, AuditLogData } from './tenant-audit.service';
import { TenantAuditRepository } from './tenant-audit.repository';

describe('TenantAuditService', () => {
  let service: TenantAuditService;
  let repository: TenantAuditRepository;

  const mockRepository = {
    create: jest.fn(),
    findPage: jest.fn(),
    count: jest.fn(),
    countCrossTenantByUser: jest.fn(),
    countCrossTenantByModel: jest.fn(),
    detectAnomalies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantAuditService,
        {
          provide: TenantAuditRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TenantAuditService>(TenantAuditService);
    repository = module.get<TenantAuditRepository>(TenantAuditRepository);

    // 清除所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordAccess', () => {
    it('应该成功记录审计日志', async () => {
      const auditData: AuditLogData = {
        userId: 'user123',
        userName: 'testuser',
        userType: 'admin',
        requestTenantId: 'T001',
        accessTenantId: 'T001',
        action: 'data_access',
        modelName: 'sysUser',
        operation: 'query',
        isSuperTenant: false,
        isIgnoreTenant: false,
        isCrossTenant: false,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        requestPath: '/api/users',
        requestMethod: 'GET',
        traceId: 'trace123',
        duration: 100,
        status: 'success',
      };

      mockRepository.create.mockResolvedValue({
        id: 'audit123',
        ...auditData,
        createTime: new Date(),
      });

      await service.recordAccess(auditData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: auditData.userId,
          userName: auditData.userName,
          userType: auditData.userType,
          action: auditData.action,
          modelName: auditData.modelName,
          operation: auditData.operation,
        }),
      );
    });

    it('应该处理审计日志记录失败的情况', async () => {
      const auditData: AuditLogData = {
        userId: 'user123',
        userName: 'testuser',
        userType: 'admin',
        action: 'data_access',
        modelName: 'sysUser',
        operation: 'query',
        isSuperTenant: false,
        isIgnoreTenant: false,
        isCrossTenant: false,
        status: 'success',
      };

      mockRepository.create.mockRejectedValue(new Error('Database error'));

      // 不应该抛出异常
      await expect(service.recordAccess(auditData)).resolves.not.toThrow();
    });

    it('应该截断过长的 userAgent', async () => {
      const longUserAgent = 'A'.repeat(600);
      const auditData: AuditLogData = {
        userId: 'user123',
        userName: 'testuser',
        userType: 'admin',
        action: 'data_access',
        modelName: 'sysUser',
        operation: 'query',
        isSuperTenant: false,
        isIgnoreTenant: false,
        isCrossTenant: false,
        userAgent: longUserAgent,
        status: 'success',
      };

      mockRepository.create.mockResolvedValue({
        id: 'audit123',
        ...auditData,
        createTime: new Date(),
      });

      await service.recordAccess(auditData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: longUserAgent.substring(0, 500),
        }),
      );
    });
  });

  describe('getCrossTenantStats', () => {
    it('应该返回跨租户访问统计', async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      mockRepository.count
        .mockResolvedValueOnce(1000) // totalCount
        .mockResolvedValueOnce(50); // todayCount

      mockRepository.countCrossTenantByUser.mockResolvedValue([
        { userId: 'user1', userName: 'User 1', count: 100 },
        { userId: 'user2', userName: 'User 2', count: 80 },
      ]);

      mockRepository.countCrossTenantByModel.mockResolvedValue([
        { modelName: 'sysUser', count: 200 },
        { modelName: 'omsOrder', count: 150 },
      ]);

      const result = await service.getCrossTenantStats();

      expect(result).toEqual({
        totalCount: 1000,
        todayCount: 50,
        topUsers: [
          { userId: 'user1', userName: 'User 1', count: 100 },
          { userId: 'user2', userName: 'User 2', count: 80 },
        ],
        topModels: [
          { modelName: 'sysUser', count: 200 },
          { modelName: 'omsOrder', count: 150 },
        ],
      });

      expect(mockRepository.count).toHaveBeenCalledWith({ isCrossTenant: true });
      expect(mockRepository.count).toHaveBeenCalledWith({
        isCrossTenant: true,
        createTime: { gte: expect.any(Date) },
      });
    });
  });

  describe('analyzeAnomalies', () => {
    it('应该检测高频跨租户访问', async () => {
      mockRepository.detectAnomalies
        .mockResolvedValueOnce([
          {
            userId: 'user1',
            userName: 'User 1',
            count: 150,
            lastTime: new Date(),
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.analyzeAnomalies();

      expect(result.suspiciousAccess).toHaveLength(1);
      expect(result.suspiciousAccess[0]).toMatchObject({
        userId: 'user1',
        userName: 'User 1',
        pattern: 'high_frequency_cross_tenant',
        severity: 'low',
        count: 150,
      });
    });

    it('应该根据访问次数设置不同的严重程度', async () => {
      mockRepository.detectAnomalies
        .mockResolvedValueOnce([
          {
            userId: 'user1',
            userName: 'User 1',
            count: 600, // high
            lastTime: new Date(),
          },
          {
            userId: 'user2',
            userName: 'User 2',
            count: 300, // medium
            lastTime: new Date(),
          },
          {
            userId: 'user3',
            userName: 'User 3',
            count: 150, // low
            lastTime: new Date(),
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.analyzeAnomalies();

      expect(result.suspiciousAccess[0].severity).toBe('high');
      expect(result.suspiciousAccess[1].severity).toBe('medium');
      expect(result.suspiciousAccess[2].severity).toBe('low');
    });

    it('应该避免重复报告同一用户', async () => {
      mockRepository.detectAnomalies
        .mockResolvedValueOnce([
          {
            userId: 'user1',
            userName: 'User 1',
            count: 150,
            lastTime: new Date(),
          },
        ])
        .mockResolvedValueOnce([
          {
            userId: 'user1',
            userName: 'User 1',
            count: 600,
            lastTime: new Date(),
          },
        ]);

      const result = await service.analyzeAnomalies();

      // 应该只有一条记录
      expect(result.suspiciousAccess).toHaveLength(1);
      expect(result.suspiciousAccess[0].pattern).toBe('high_frequency_cross_tenant');
    });
  });
});
