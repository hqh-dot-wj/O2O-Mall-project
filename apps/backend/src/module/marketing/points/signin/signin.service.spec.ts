import { Test, TestingModule } from '@nestjs/testing';
import { PointsTransactionType } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointsAccountService } from '../account/account.service';
import { PointsRuleService } from '../rule/rule.service';
import { PointsSigninService } from './signin.service';

describe('PointsSigninService', () => {
  let service: PointsSigninService;

  const mockPrisma = {
    mktPointsTransaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCls = {
    get: jest.fn(),
  };

  const mockAccountService = {
    addPoints: jest.fn(),
  };

  const mockRuleService = {
    getRules: jest.fn(),
  };

  beforeEach(async () => {
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('00000');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsSigninService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ClsService, useValue: mockCls },
        { provide: PointsAccountService, useValue: mockAccountService },
        { provide: PointsRuleService, useValue: mockRuleService },
      ],
    }).compile();

    service = module.get<PointsSigninService>(PointsSigninService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // R-PRE-SIGNIN-01
  it('Given 签到功能未启用, When signin, Then 抛出业务异常', async () => {
    mockRuleService.getRules.mockResolvedValue({
      data: {
        signinPointsEnabled: false,
        systemEnabled: true,
      },
    });

    await expect(service.signin('m1')).rejects.toThrow(BusinessException);
  });

  // R-FLOW-SIGNIN-01
  it('Given 今日未签到且规则启用, When signin, Then 发放签到积分', async () => {
    mockRuleService.getRules.mockResolvedValue({
      data: {
        signinPointsEnabled: true,
        systemEnabled: true,
        signinPointsAmount: 10,
      },
    });
    mockPrisma.mktPointsTransaction.findFirst.mockResolvedValue(null);
    mockAccountService.addPoints.mockResolvedValue({
      data: { id: 'tx-1' },
    });

    const result = await service.signin('m1');

    expect(mockAccountService.addPoints).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 'm1',
        amount: 10,
        type: PointsTransactionType.EARN_SIGNIN,
      }),
    );
    expect(result.data.points).toBe(10);
  });

  // R-FLOW-SIGNIN-02
  it('Given 连续3天签到数据, When checkSigninStatus, Then 单次查询计算连续天数', async () => {
    const now = new Date();
    const day0 = new Date(now);
    const day1 = new Date(now);
    day1.setDate(day1.getDate() - 1);
    const day2 = new Date(now);
    day2.setDate(day2.getDate() - 2);

    mockPrisma.mktPointsTransaction.findFirst.mockResolvedValue({
      createTime: day0,
    });
    mockPrisma.mktPointsTransaction.findMany.mockResolvedValue([
      { createTime: day0 },
      { createTime: day1 },
      { createTime: day2 },
    ]);
    mockPrisma.mktPointsTransaction.count.mockResolvedValue(12);

    const result = await service.checkSigninStatus('m1');

    expect(mockPrisma.mktPointsTransaction.findMany).toHaveBeenCalledTimes(1);
    expect(result.data.continuousDays).toBe(3);
    expect(result.data.monthSignins).toBe(12);
    expect(result.data.hasSignedToday).toBe(true);
  });
});
