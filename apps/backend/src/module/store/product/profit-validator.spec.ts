// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { ProfitValidator } from './profit-validator';
import { DistributionMode } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

describe('ProfitValidator', () => {
  let validator: ProfitValidator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfitValidator],
    }).compile();

    validator = module.get<ProfitValidator>(ProfitValidator);
  });

  describe('validate', () => {
    it('应该通过验证 - 利润充足', () => {
      expect(() => {
        validator.validate(100, new Decimal(50), 0.1, DistributionMode.RATIO);
      }).not.toThrow();
    });

    it('应该抛出异常 - 价格低于成本价', () => {
      expect(() => {
        validator.validate(50, new Decimal(100), 0.1, DistributionMode.RATIO);
      }).toThrow(BusinessException);
    });

    it('应该抛出异常 - 利润不足以支付佣金', () => {
      expect(() => {
        validator.validate(100, new Decimal(95), 0.1, DistributionMode.RATIO);
      }).toThrow(BusinessException);
    });

    it('应该通过验证 - 固定金额模式', () => {
      expect(() => {
        validator.validate(100, new Decimal(50), 10, DistributionMode.FIXED);
      }).not.toThrow();
    });

    it('应该抛出异常 - 固定金额模式利润不足', () => {
      expect(() => {
        validator.validate(100, new Decimal(95), 10, DistributionMode.FIXED);
      }).toThrow(BusinessException);
    });
  });

  describe('calculateProfit', () => {
    it('应该正确计算利润 - 百分比模式', () => {
      const result = validator.calculateProfit(100, new Decimal(50), 0.1, DistributionMode.RATIO);

      expect(result.profit.toNumber()).toBe(40);
      expect(result.profitRate.toNumber()).toBe(0.4);
      expect(result.commission.toNumber()).toBe(10);
      expect(result.isValid).toBe(true);
    });

    it('应该正确计算利润 - 固定金额模式', () => {
      const result = validator.calculateProfit(100, new Decimal(50), 10, DistributionMode.FIXED);

      expect(result.profit.toNumber()).toBe(40);
      expect(result.profitRate.toNumber()).toBe(0.4);
      expect(result.commission.toNumber()).toBe(10);
      expect(result.isValid).toBe(true);
    });

    it('应该返回无效结果 - 价格低于成本', () => {
      const result = validator.calculateProfit(50, new Decimal(100), 0.1, DistributionMode.RATIO);

      expect(result.isValid).toBe(false);
    });

    it('应该返回无效结果 - 利润不足', () => {
      const result = validator.calculateProfit(100, new Decimal(95), 0.1, DistributionMode.RATIO);

      expect(result.isValid).toBe(false);
    });

    it('应该处理边界情况 - 利润刚好等于佣金', () => {
      const result = validator.calculateProfit(110, new Decimal(100), 0.1, DistributionMode.RATIO);

      expect(result.profit.toNumber()).toBe(-1);
      expect(result.commission.toNumber()).toBe(11);
      expect(result.isValid).toBe(false);
    });

    it('应该处理零佣金', () => {
      const result = validator.calculateProfit(100, new Decimal(50), 0, DistributionMode.NONE);

      expect(result.profit.toNumber()).toBe(50);
      expect(result.commission.toNumber()).toBe(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDistRateRange', () => {
    it('应该通过验证 - 费率在允许范围内', () => {
      expect(() => {
        validator.validateDistRateRange(0.15, 0.10, 0.20);
      }).not.toThrow();
    });

    it('应该通过验证 - 费率等于最小值', () => {
      expect(() => {
        validator.validateDistRateRange(0.10, 0.10, 0.20);
      }).not.toThrow();
    });

    it('应该通过验证 - 费率等于最大值', () => {
      expect(() => {
        validator.validateDistRateRange(0.20, 0.10, 0.20);
      }).not.toThrow();
    });

    it('应该抛出异常 - 费率低于最小值', () => {
      expect(() => {
        validator.validateDistRateRange(0.05, 0.10, 0.20);
      }).toThrow(BusinessException);
    });

    it('应该抛出异常 - 费率高于最大值', () => {
      expect(() => {
        validator.validateDistRateRange(0.25, 0.10, 0.20);
      }).toThrow(BusinessException);
    });

    it('应该抛出异常 - 店铺费率为负数', () => {
      expect(() => {
        validator.validateDistRateRange(-0.05, 0.10, 0.20);
      }).toThrow(BusinessException);
    });

    it('应该抛出异常 - 最小费率为负数', () => {
      expect(() => {
        validator.validateDistRateRange(0.15, -0.10, 0.20);
      }).toThrow(BusinessException);
    });

    it('应该抛出异常 - 最大费率为负数', () => {
      expect(() => {
        validator.validateDistRateRange(0.15, 0.10, -0.20);
      }).toThrow(BusinessException);
    });

    it('应该抛出异常 - 最小费率大于最大费率', () => {
      expect(() => {
        validator.validateDistRateRange(0.15, 0.20, 0.10);
      }).toThrow(BusinessException);
    });

    it('应该通过验证 - 边界情况: 最小值等于最大值', () => {
      expect(() => {
        validator.validateDistRateRange(0.15, 0.15, 0.15);
      }).not.toThrow();
    });

    it('应该通过验证 - 零费率在零范围内', () => {
      expect(() => {
        validator.validateDistRateRange(0, 0, 0);
      }).not.toThrow();
    });
  });
});
