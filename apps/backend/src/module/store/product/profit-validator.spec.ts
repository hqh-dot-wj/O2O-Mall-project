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
        validator.validate(
          100,
          new Decimal(50),
          10,
          DistributionMode.PERCENTAGE,
        );
      }).not.toThrow();
    });

    it('应该抛出异常 - 价格低于成本价', () => {
      expect(() => {
        validator.validate(
          50,
          new Decimal(100),
          10,
          DistributionMode.PERCENTAGE,
        );
      }).toThrow(BusinessException);
    });

    it('应该抛出异常 - 利润不足以支付佣金', () => {
      expect(() => {
        validator.validate(
          100,
          new Decimal(95),
          10,
          DistributionMode.PERCENTAGE,
        );
      }).toThrow(BusinessException);
    });

    it('应该通过验证 - 固定金额模式', () => {
      expect(() => {
        validator.validate(
          100,
          new Decimal(50),
          10,
          DistributionMode.FIXED,
        );
      }).not.toThrow();
    });

    it('应该抛出异常 - 固定金额模式利润不足', () => {
      expect(() => {
        validator.validate(
          100,
          new Decimal(95),
          10,
          DistributionMode.FIXED,
        );
      }).toThrow(BusinessException);
    });
  });

  describe('calculateProfit', () => {
    it('应该正确计算利润 - 百分比模式', () => {
      const result = validator.calculateProfit(
        100,
        new Decimal(50),
        10,
        DistributionMode.PERCENTAGE,
      );

      expect(result.profit.toNumber()).toBe(50);
      expect(result.profitRate.toNumber()).toBe(50);
      expect(result.commission.toNumber()).toBe(10);
      expect(result.isValid).toBe(true);
    });

    it('应该正确计算利润 - 固定金额模式', () => {
      const result = validator.calculateProfit(
        100,
        new Decimal(50),
        10,
        DistributionMode.FIXED,
      );

      expect(result.profit.toNumber()).toBe(50);
      expect(result.profitRate.toNumber()).toBe(50);
      expect(result.commission.toNumber()).toBe(10);
      expect(result.isValid).toBe(true);
    });

    it('应该返回无效结果 - 价格低于成本', () => {
      const result = validator.calculateProfit(
        50,
        new Decimal(100),
        10,
        DistributionMode.PERCENTAGE,
      );

      expect(result.isValid).toBe(false);
    });

    it('应该返回无效结果 - 利润不足', () => {
      const result = validator.calculateProfit(
        100,
        new Decimal(95),
        10,
        DistributionMode.PERCENTAGE,
      );

      expect(result.isValid).toBe(false);
    });

    it('应该处理边界情况 - 利润刚好等于佣金', () => {
      const result = validator.calculateProfit(
        110,
        new Decimal(100),
        10,
        DistributionMode.PERCENTAGE,
      );

      expect(result.profit.toNumber()).toBe(10);
      expect(result.commission.toNumber()).toBe(11);
      expect(result.isValid).toBe(false);
    });

    it('应该处理零佣金', () => {
      const result = validator.calculateProfit(
        100,
        new Decimal(50),
        0,
        DistributionMode.PERCENTAGE,
      );

      expect(result.profit.toNumber()).toBe(50);
      expect(result.commission.toNumber()).toBe(0);
      expect(result.isValid).toBe(true);
    });
  });
});
