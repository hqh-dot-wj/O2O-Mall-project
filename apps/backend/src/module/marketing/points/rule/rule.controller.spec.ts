import { Test, TestingModule } from '@nestjs/testing';
import { PointsRuleController } from './rule.controller';
import { PointsRuleService } from './rule.service';
import { UpdatePointsRuleDto } from './dto/update-points-rule.dto';

describe('PointsRuleController', () => {
  let controller: PointsRuleController;
  let service: jest.Mocked<PointsRuleService>;

  const mockRuleResponse = {
    code: 200,
    data: {
      id: 'rule-id-1',
      tenantId: '000000',
      orderPointsEnabled: true,
      orderPointsRatio: 1,
      orderPointsBase: 1,
      signinPointsEnabled: true,
      signinPointsAmount: 10,
      pointsValidityEnabled: false,
      pointsValidityDays: null as number | null,
      pointsRedemptionEnabled: true,
      pointsRedemptionRatio: 100,
      pointsRedemptionBase: 1,
      maxPointsPerOrder: null as number | null,
      maxDiscountPercentOrder: 50,
      systemEnabled: true,
      createBy: 'admin',
      createTime: '2025-02-09T00:00:00.000Z',
      updateBy: null as string | null,
      updateTime: '2025-02-09T00:00:00.000Z',
    },
  };

  beforeEach(async () => {
    const mockService = {
      getRules: jest.fn().mockResolvedValue(mockRuleResponse),
      updateRules: jest.fn().mockImplementation((dto: UpdatePointsRuleDto) =>
        Promise.resolve({
          ...mockRuleResponse,
          data: { ...mockRuleResponse.data, ...dto },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointsRuleController],
      providers: [{ provide: PointsRuleService, useValue: mockService }],
    }).compile();

    controller = module.get<PointsRuleController>(PointsRuleController);
    service = module.get(PointsRuleService);
  });

  it('应该被定义', () => {
    expect(controller).toBeDefined();
  });

  describe('getRules', () => {
    it('GET - 应该返回积分规则配置', async () => {
      const result = await controller.getRules();

      expect(service.getRules).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRuleResponse);
      expect(result.data).toHaveProperty('orderPointsEnabled', true);
      expect(result.data).toHaveProperty('signinPointsAmount', 10);
      expect(result.data).toHaveProperty('pointsRedemptionRatio', 100);
    });
  });

  describe('updateRules', () => {
    it('PUT - 应该更新积分规则配置', async () => {
      const dto: UpdatePointsRuleDto = {
        signinPointsAmount: 20,
        maxDiscountPercentOrder: 30,
      };

      const result = await controller.updateRules(dto);

      expect(service.updateRules).toHaveBeenCalledWith(dto);
      expect(service.updateRules).toHaveBeenCalledTimes(1);
      expect(result.data).toMatchObject({
        signinPointsAmount: 20,
        maxDiscountPercentOrder: 30,
      });
    });

    it('PUT - 应该支持更新消费积分规则', async () => {
      const dto: UpdatePointsRuleDto = {
        orderPointsEnabled: true,
        orderPointsRatio: 2,
        orderPointsBase: 2,
      };

      const result = await controller.updateRules(dto);

      expect(service.updateRules).toHaveBeenCalledWith(dto);
      expect(result.data).toMatchObject({
        orderPointsRatio: 2,
        orderPointsBase: 2,
      });
    });

    it('PUT - 应该支持更新积分抵扣规则', async () => {
      const dto: UpdatePointsRuleDto = {
        pointsRedemptionEnabled: true,
        pointsRedemptionRatio: 50,
        pointsRedemptionBase: 1,
        maxPointsPerOrder: 5000,
      };

      const result = await controller.updateRules(dto);

      expect(service.updateRules).toHaveBeenCalledWith(dto);
      expect(result.data).toMatchObject({
        pointsRedemptionRatio: 50,
        maxPointsPerOrder: 5000,
      });
    });

    it('PUT - 应该支持更新积分有效期', async () => {
      const dto: UpdatePointsRuleDto = {
        pointsValidityEnabled: true,
        pointsValidityDays: 365,
      };

      const result = await controller.updateRules(dto);

      expect(service.updateRules).toHaveBeenCalledWith(dto);
      expect(result.data).toMatchObject({
        pointsValidityEnabled: true,
        pointsValidityDays: 365,
      });
    });

    it('PUT - 空 DTO 不应报错', async () => {
      const result = await controller.updateRules({});

      expect(service.updateRules).toHaveBeenCalledWith({});
      expect(result).toBeDefined();
    });
  });
});
