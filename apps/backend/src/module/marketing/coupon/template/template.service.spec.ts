import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { TenantContext } from 'src/common/tenant';
import { PrismaService } from 'src/prisma/prisma.service';
import { CouponTemplateRepository } from './template.repository';
import { CouponTemplateService } from './template.service';

describe('CouponTemplateService', () => {
  let service: CouponTemplateService;

  const mockRepo = {
    search: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getStatsForTemplates: jest.fn(),
    countDistributed: jest.fn(),
    countUsed: jest.fn(),
    hasDistributed: jest.fn(),
  };

  const mockPrisma = {};
  const mockCls = { get: jest.fn().mockReturnValue('user1') };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('00000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponTemplateService,
        { provide: CouponTemplateRepository, useValue: mockRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get<CouponTemplateService>(CouponTemplateService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('应返回分页列表并合并统计', async () => {
      mockRepo.search.mockResolvedValue({
        rows: [{ id: 't1', name: '满100减20' }],
        total: 1,
      });
      mockRepo.getStatsForTemplates.mockResolvedValue(
        new Map([['t1', { distributedCount: 10, usedCount: 2, usageRate: 20 }]]),
      );

      const result = await service.findAll({ pageNum: 1, pageSize: 10 } as any);

      expect(result.data?.rows).toHaveLength(1);
      expect(result.data?.rows[0].distributedCount).toBe(10);
      expect(result.data?.rows[0].usedCount).toBe(2);
    });
  });

  describe('findOne', () => {
    it('模板不存在应抛异常', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('t1')).rejects.toThrow(BusinessException);
    });

    it('应返回详情含统计', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 't1',
        name: '满100减20',
        type: 'DISCOUNT',
      });
      mockRepo.countDistributed.mockResolvedValue(50);
      mockRepo.countUsed.mockResolvedValue(10);

      const result = await service.findOne('t1');

      expect(result.data).toBeDefined();
      expect(result.data.distributedCount).toBe(50);
      expect(result.data.usedCount).toBe(10);
    });
  });

  describe('create', () => {
    it('满减券未设置 discountAmount 应抛异常', async () => {
      await expect(
        service.create({
          name: '券',
          type: 'DISCOUNT',
          totalStock: 100,
          limitPerUser: 1,
          validityType: 'RELATIVE',
          validDays: 30,
        } as any),
      ).rejects.toThrow(BusinessException);
    });

    it('折扣券 discountPercent 不在 1-99 应抛异常', async () => {
      await expect(
        service.create({
          name: '券',
          type: 'PERCENTAGE',
          discountPercent: 0,
          totalStock: 100,
          limitPerUser: 1,
          validityType: 'RELATIVE',
          validDays: 30,
        } as any),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功创建模板', async () => {
      mockRepo.create.mockResolvedValue({
        id: 't1',
        name: '满100减20',
        type: 'DISCOUNT',
        discountAmount: 20,
        remainingStock: 100,
        status: 'ACTIVE',
      });

      const result = await service.create({
        name: '满100减20',
        type: 'DISCOUNT',
        discountAmount: 20,
        minOrderAmount: 100,
        totalStock: 100,
        limitPerUser: 1,
        validityType: 'RELATIVE',
        validDays: 30,
      } as any);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '满100减20',
          type: 'DISCOUNT',
          remainingStock: 100,
          status: 'ACTIVE',
        }),
      );
      expect(result.data).toBeDefined();
    });
  });

  describe('update', () => {
    it('模板不存在应抛异常', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('t1', { name: '新名称' } as any),
      ).rejects.toThrow(BusinessException);
    });

    it('已发放的模板不能修改应抛异常', async () => {
      mockRepo.findById.mockResolvedValue({ id: 't1' });
      mockRepo.hasDistributed.mockResolvedValue(true);

      await expect(
        service.update('t1', { name: '新名称' } as any),
      ).rejects.toThrow(BusinessException);
    });

    it('应成功更新', async () => {
      mockRepo.findById.mockResolvedValue({ id: 't1', type: 'DISCOUNT' });
      mockRepo.hasDistributed.mockResolvedValue(false);
      mockRepo.update.mockResolvedValue({ id: 't1', name: '新名称' });

      const result = await service.update('t1', { name: '新名称' } as any);

      expect(result.data).toBeDefined();
    });
  });

  describe('deactivate / setStatus', () => {
    it('应成功停用模板', async () => {
      mockRepo.findById.mockResolvedValue({ id: 't1' });
      mockRepo.update.mockResolvedValue({ id: 't1', status: 'INACTIVE' });

      const result = await service.deactivate('t1');

      expect(mockRepo.update).toHaveBeenCalledWith('t1', { status: 'INACTIVE' });
      expect(result.msg).toContain('已停用');
    });
  });
});
