import { Test, TestingModule } from '@nestjs/testing';
import { CouponTemplateService } from '../../src/module/marketing/coupon/template/template.service';
import { CouponTemplateRepository } from '../../src/module/marketing/coupon/template/template.repository';
import { ClsService } from 'nestjs-cls';
import { CouponType } from '@prisma/client';
import { BusinessException } from '../../src/common/exceptions/business.exception';

/**
 * 优惠券模板服务单元测试
 */
describe('CouponTemplateService', () => {
  let service: CouponTemplateService;
  let repository: CouponTemplateRepository;
  let clsService: ClsService;

  const mockRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    findPage: jest.fn(),
    delete: jest.fn(),
  };

  const mockClsService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponTemplateService,
        {
          provide: CouponTemplateRepository,
          useValue: mockRepository,
        },
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile();

    service = module.get<CouponTemplateService>(CouponTemplateService);
    repository = module.get<CouponTemplateRepository>(CouponTemplateRepository);
    clsService = module.get<ClsService>(ClsService);

    // 默认返回租户ID
    mockClsService.get.mockReturnValue('test-tenant-001');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('应该成功创建满减券模板', async () => {
      const dto = {
        templateName: '满100减20',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 20,
        minOrderAmount: 100,
        totalStock: 1000,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS' as const,
        validityDays: 30,
        isEnabled: true,
      };

      const mockTemplate = {
        id: 'template-001',
        ...dto,
        tenantId: '00000',
        remainingStock: 1000,
        claimedCount: 0,
      };

      mockRepository.create.mockResolvedValue(mockTemplate);

      const result = await service.createTemplate(dto);

      expect(result.code).toBe(200);
      expect(result.data.id).toBe('template-001');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: dto.templateName,
          type: dto.type,
          discountAmount: dto.discountAmount,
        })
      );
    });

    it('应该验证满减券必须有折扣金额', async () => {
      const dto = {
        templateName: '测试券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 0, // 无效
        minOrderAmount: 100,
        totalStock: 1000,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS' as const,
        validityDays: 30,
        isEnabled: true,
      };

      await expect(service.createTemplate(dto)).rejects.toThrow(
        BusinessException
      );
    });

    it('应该验证折扣券必须有折扣比例', async () => {
      const dto = {
        templateName: '测试折扣券',
        type: CouponType.DISCOUNT,
        discountPercent: 0, // 无效
        minOrderAmount: 100,
        totalStock: 1000,
        perUserLimit: 1,
        validityType: 'FIXED_DAYS' as const,
        validityDays: 30,
        isEnabled: true,
      };

      await expect(service.createTemplate(dto)).rejects.toThrow(
        BusinessException
      );
    });

    it('应该验证库存必须大于0', async () => {
      const dto = {
        templateName: '测试券',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 10,
        minOrderAmount: 50,
        totalStock: 0, // 无效
        perUserLimit: 1,
        validityType: 'FIXED_DAYS' as const,
        validityDays: 30,
        isEnabled: true,
      };

      await expect(service.createTemplate(dto)).rejects.toThrow(
        BusinessException
      );
    });
  });

  describe('updateTemplate', () => {
    it('应该成功更新模板', async () => {
      const templateId = 'template-001';
      const dto = {
        templateName: '更新后的名称',
        isEnabled: false,
      };

      const mockTemplate = {
        id: templateId,
        templateName: '原名称',
        type: CouponType.FULL_REDUCTION,
        discountAmount: 20,
        claimedCount: 0,
      };

      mockRepository.findById.mockResolvedValue(mockTemplate);
      mockRepository.update.mockResolvedValue({
        ...mockTemplate,
        ...dto,
      });

      const result = await service.updateTemplate(templateId, dto);

      expect(result.code).toBe(200);
      expect(result.data.templateName).toBe(dto.templateName);
    });

    it('应该阻止修改已发放的模板的关键字段', async () => {
      const templateId = 'template-001';
      const dto = {
        discountAmount: 30, // 尝试修改折扣金额
      };

      const mockTemplate = {
        id: templateId,
        type: CouponType.FULL_REDUCTION,
        discountAmount: 20,
        claimedCount: 100, // 已发放100张
      };

      mockRepository.findById.mockResolvedValue(mockTemplate);

      await expect(
        service.updateTemplate(templateId, dto)
      ).rejects.toThrow('已发放的优惠券不可修改关键配置');
    });
  });

  describe('deactivateTemplate', () => {
    it('应该成功停用模板', async () => {
      const templateId = 'template-001';

      const mockTemplate = {
        id: templateId,
        isEnabled: true,
      };

      mockRepository.findById.mockResolvedValue(mockTemplate);
      mockRepository.update.mockResolvedValue({
        ...mockTemplate,
        isEnabled: false,
      });

      const result = await service.deactivateTemplate(templateId);

      expect(result.code).toBe(200);
      expect(mockRepository.update).toHaveBeenCalledWith(
        templateId,
        expect.objectContaining({ isEnabled: false })
      );
    });
  });

  describe('findAll', () => {
    it('应该返回分页结果', async () => {
      const query = {
        pageNum: 1,
        pageSize: 10,
      };

      const mockResult = {
        rows: [
          { id: 'template-001', templateName: '测试券1' },
          { id: 'template-002', templateName: '测试券2' },
        ],
        total: 2,
      };

      mockRepository.findPage.mockResolvedValue(mockResult);

      const result = await service.findAll(query);

      expect(result.code).toBe(200);
      expect(result.data.rows.length).toBe(2);
      expect(result.data.total).toBe(2);
    });

    it('应该支持按类型筛选', async () => {
      const query = {
        type: CouponType.FULL_REDUCTION,
        pageNum: 1,
        pageSize: 10,
      };

      mockRepository.findPage.mockResolvedValue({
        rows: [],
        total: 0,
      });

      await service.findAll(query);

      expect(mockRepository.findPage).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: CouponType.FULL_REDUCTION,
          }),
        })
      );
    });
  });

  describe('getTemplateStats', () => {
    it('应该返回模板统计信息', async () => {
      const templateId = 'template-001';

      const mockTemplate = {
        id: templateId,
        totalStock: 1000,
        remainingStock: 800,
        claimedCount: 200,
      };

      mockRepository.findById.mockResolvedValue(mockTemplate);

      const result = await service.getTemplateStats(templateId);

      expect(result.code).toBe(200);
      expect(result.data.totalStock).toBe(1000);
      expect(result.data.remainingStock).toBe(800);
      expect(result.data.claimedCount).toBe(200);
      expect(result.data.claimRate).toBe(20); // 200/1000 = 20%
    });
  });
});
