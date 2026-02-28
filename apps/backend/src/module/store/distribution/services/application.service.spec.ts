// @ts-nocheck
 
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationService } from './application.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationStatus } from '../dto/list-application.dto';
import { ReviewResult } from '../dto/review-application.dto';
import { Prisma } from '@prisma/client';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    umsMember: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sysDistApplication: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sysDistReviewConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    omsOrder: {
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrismaService);
      }
      return Promise.resolve(callback);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createApplication', () => {
    it('应该成功创建申请（手动审核）', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';
      const dto = { applyReason: '我想成为分销员' };

      mockPrismaService.umsMember.findUnique.mockResolvedValue({
        levelId: 0,
        createTime: new Date(),
        mobile: '13800138000',
      });

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue(null);

      mockPrismaService.sysDistReviewConfig.findUnique.mockResolvedValue({
        enableAutoReview: false,
        minRegisterDays: 0,
        minOrderCount: 0,
        minOrderAmount: new Prisma.Decimal(0),
        requireRealName: false,
        requirePhone: true,
      });

      mockPrismaService.sysDistApplication.create.mockResolvedValue({
        id: 1,
        tenantId,
        memberId,
        applyReason: dto.applyReason,
        status: ApplicationStatus.PENDING,
        autoReviewed: false,
        createTime: new Date(),
        updateTime: new Date(),
      });

      const result = await service.createApplication(tenantId, memberId, dto);

      expect(result.data.status).toBe(ApplicationStatus.PENDING);
      expect(result.data.autoReviewed).toBe(false);
      expect(mockPrismaService.sysDistApplication.create).toHaveBeenCalled();
    });

    it('应该自动审核通过', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';
      const dto = { applyReason: '我想成为分销员' };

      mockPrismaService.umsMember.findUnique.mockResolvedValue({
        levelId: 0,
        createTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前注册
        mobile: '13800138000',
      });

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue(null);

      mockPrismaService.sysDistReviewConfig.findUnique.mockResolvedValue({
        enableAutoReview: true,
        minRegisterDays: 7,
        minOrderCount: 1,
        minOrderAmount: new Prisma.Decimal(100),
        requireRealName: false,
        requirePhone: true,
      });

      mockPrismaService.omsOrder.aggregate.mockResolvedValue({
        _count: 5,
        _sum: { payAmount: new Prisma.Decimal(500) },
      });

      mockPrismaService.sysDistApplication.create.mockResolvedValue({
        id: 1,
        tenantId,
        memberId,
        applyReason: dto.applyReason,
        status: ApplicationStatus.APPROVED,
        autoReviewed: true,
        reviewTime: new Date(),
        createTime: new Date(),
        updateTime: new Date(),
      });

      mockPrismaService.umsMember.update.mockResolvedValue({});

      const result = await service.createApplication(tenantId, memberId, dto);

      expect(result.data.status).toBe(ApplicationStatus.APPROVED);
      expect(result.data.autoReviewed).toBe(true);
      expect(mockPrismaService.umsMember.update).toHaveBeenCalledWith({
        where: { memberId },
        data: { levelId: 1 },
      });
    });

    it('应该拒绝已是分销员的申请', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';
      const dto = { applyReason: '我想成为分销员' };

      mockPrismaService.umsMember.findUnique.mockResolvedValue({
        levelId: 1, // 已是分销员
        createTime: new Date(),
        mobile: '13800138000',
      });

      await expect(service.createApplication(tenantId, memberId, dto)).rejects.toThrow();
    });

    it('应该拒绝重复申请', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';
      const dto = { applyReason: '我想成为分销员' };

      mockPrismaService.umsMember.findUnique.mockResolvedValue({
        levelId: 0,
        createTime: new Date(),
        mobile: '13800138000',
      });

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: 1,
        status: ApplicationStatus.PENDING,
      });

      await expect(service.createApplication(tenantId, memberId, dto)).rejects.toThrow();
    });

    it('应该检查手机号要求', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';
      const dto = { applyReason: '我想成为分销员' };

      mockPrismaService.umsMember.findUnique.mockResolvedValue({
        levelId: 0,
        createTime: new Date(),
        phone: null, // 没有手机号
      });

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue(null);

      mockPrismaService.sysDistReviewConfig.findUnique.mockResolvedValue({
        enableAutoReview: false,
        minRegisterDays: 0,
        minOrderCount: 0,
        minOrderAmount: new Prisma.Decimal(0),
        requireRealName: false,
        requirePhone: true, // 要求手机号
      });

      await expect(service.createApplication(tenantId, memberId, dto)).rejects.toThrow();
    });
  });

  describe('getApplicationStatus', () => {
    it('应该返回无申请状态', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue(null);

      const result = await service.getApplicationStatus(tenantId, memberId);

      expect(result.data.hasApplication).toBe(false);
      expect(result.data.canReapply).toBe(true);
    });

    it('应该返回待审核状态', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: 1,
        status: ApplicationStatus.PENDING,
        createTime: new Date(),
      });

      const result = await service.getApplicationStatus(tenantId, memberId);

      expect(result.data.hasApplication).toBe(true);
      expect(result.data.status).toBe(ApplicationStatus.PENDING);
      expect(result.data.canReapply).toBe(false);
    });

    it('应该返回可重新申请状态', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: 1,
        status: ApplicationStatus.REJECTED,
        createTime: new Date(),
        reviewTime: new Date(),
        reviewRemark: '不符合条件',
      });

      const result = await service.getApplicationStatus(tenantId, memberId);

      expect(result.data.hasApplication).toBe(true);
      expect(result.data.status).toBe(ApplicationStatus.REJECTED);
      expect(result.data.canReapply).toBe(true);
    });
  });

  describe('cancelApplication', () => {
    it('应该成功撤回申请', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: 1,
        status: ApplicationStatus.PENDING,
      });

      mockPrismaService.sysDistApplication.update.mockResolvedValue({});

      const result = await service.cancelApplication(tenantId, memberId);

      expect(result.data).toBe(true);
      expect(mockPrismaService.sysDistApplication.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: ApplicationStatus.CANCELLED },
      });
    });

    it('应该拒绝撤回不存在的申请', async () => {
      const tenantId = 'T001';
      const memberId = 'M001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue(null);

      await expect(service.cancelApplication(tenantId, memberId)).rejects.toThrow();
    });
  });

  describe('reviewApplication', () => {
    it('应该审核通过申请', async () => {
      const tenantId = 'T001';
      const applicationId = 1;
      const dto = { result: ReviewResult.APPROVED, remark: '符合条件' };
      const reviewerId = 'ADMIN001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: applicationId,
        memberId: 'M001',
        status: ApplicationStatus.PENDING,
      });

      mockPrismaService.sysDistApplication.update.mockResolvedValue({});
      mockPrismaService.umsMember.update.mockResolvedValue({});

      const result = await service.reviewApplication(tenantId, applicationId, dto, reviewerId);

      expect(result.data).toBe(true);
      expect(mockPrismaService.sysDistApplication.update).toHaveBeenCalledWith({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.APPROVED,
          reviewerId,
          reviewTime: expect.any(Date),
          reviewRemark: dto.remark,
        },
      });
      expect(mockPrismaService.umsMember.update).toHaveBeenCalledWith({
        where: { memberId: 'M001' },
        data: { levelId: 1 },
      });
    });

    it('应该审核拒绝申请', async () => {
      const tenantId = 'T001';
      const applicationId = 1;
      const dto = { result: ReviewResult.REJECTED, remark: '不符合条件' };
      const reviewerId = 'ADMIN001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: applicationId,
        memberId: 'M001',
        status: ApplicationStatus.PENDING,
      });

      mockPrismaService.sysDistApplication.update.mockResolvedValue({});

      const result = await service.reviewApplication(tenantId, applicationId, dto, reviewerId);

      expect(result.data).toBe(true);
      expect(mockPrismaService.sysDistApplication.update).toHaveBeenCalledWith({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.REJECTED,
          reviewerId,
          reviewTime: expect.any(Date),
          reviewRemark: dto.remark,
        },
      });
      expect(mockPrismaService.umsMember.update).not.toHaveBeenCalled();
    });

    it('应该拒绝审核不存在的申请', async () => {
      const tenantId = 'T001';
      const applicationId = 999;
      const dto = { result: ReviewResult.APPROVED };
      const reviewerId = 'ADMIN001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue(null);

      await expect(service.reviewApplication(tenantId, applicationId, dto, reviewerId)).rejects.toThrow();
    });

    it('应该拒绝审核已审核的申请', async () => {
      const tenantId = 'T001';
      const applicationId = 1;
      const dto = { result: ReviewResult.APPROVED };
      const reviewerId = 'ADMIN001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: applicationId,
        status: ApplicationStatus.APPROVED, // 已审核
      });

      await expect(service.reviewApplication(tenantId, applicationId, dto, reviewerId)).rejects.toThrow();
    });
  });

  describe('listApplications', () => {
    it('应该返回申请列表', async () => {
      const tenantId = 'T001';
      const query = { pageNum: 1, pageSize: 10 };

      const applications = [
        {
          id: 1,
          memberId: 'M001',
          status: ApplicationStatus.PENDING,
          autoReviewed: false,
          createTime: new Date(),
          updateTime: new Date(),
        },
        {
          id: 2,
          memberId: 'M002',
          status: ApplicationStatus.APPROVED,
          autoReviewed: true,
          reviewTime: new Date(),
          createTime: new Date(),
          updateTime: new Date(),
        },
      ];

      mockPrismaService.$transaction.mockResolvedValue([applications, 2]);

      const result = await service.listApplications(tenantId, query);

      expect(result.data.rows).toHaveLength(2);
      expect(result.data.total).toBe(2);
    });

    it('应该支持状态筛选', async () => {
      const tenantId = 'T001';
      const query = { pageNum: 1, pageSize: 10, status: ApplicationStatus.PENDING };

      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.listApplications(tenantId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('batchReview', () => {
    it('应该批量审核成功', async () => {
      const tenantId = 'T001';
      const dto = { ids: [1, 2, 3], result: ReviewResult.APPROVED };
      const reviewerId = 'ADMIN001';

      mockPrismaService.sysDistApplication.findFirst.mockResolvedValue({
        id: 1,
        memberId: 'M001',
        status: ApplicationStatus.PENDING,
      });

      mockPrismaService.sysDistApplication.update.mockResolvedValue({});
      mockPrismaService.umsMember.update.mockResolvedValue({});

      const result = await service.batchReview(tenantId, dto, reviewerId);

      expect(result.data.success).toBe(3);
      expect(result.data.failed).toBe(0);
    });
  });

  describe('reviewConfig', () => {
    it('应该获取审核配置', async () => {
      const tenantId = 'T001';

      mockPrismaService.sysDistReviewConfig.findUnique.mockResolvedValue({
        id: 1,
        tenantId,
        enableAutoReview: true,
        minRegisterDays: 7,
        minOrderCount: 1,
        minOrderAmount: new Prisma.Decimal(100),
        requireRealName: false,
        requirePhone: true,
        createTime: new Date(),
      });

      const result = await service.getReviewConfig(tenantId);

      expect(result.data.enableAutoReview).toBe(true);
      expect(result.data.minRegisterDays).toBe(7);
    });

    it('应该更新审核配置', async () => {
      const tenantId = 'T001';
      const dto = {
        enableAutoReview: true,
        minRegisterDays: 7,
        minOrderCount: 1,
        minOrderAmount: 100,
        requireRealName: false,
        requirePhone: true,
      };
      const operator = 'ADMIN001';

      mockPrismaService.sysDistReviewConfig.upsert.mockResolvedValue({});

      const result = await service.updateReviewConfig(tenantId, dto, operator);

      expect(result.data).toBe(true);
      expect(mockPrismaService.sysDistReviewConfig.upsert).toHaveBeenCalled();
    });
  });
});
