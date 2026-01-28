import { Test, TestingModule } from '@nestjs/testing';
import { CommissionProcessor } from './commission.processor';
import { CommissionService } from './commission.service';
import { Job } from 'bull';

describe('CommissionProcessor', () => {
  let processor: CommissionProcessor;
  let commissionService: CommissionService;

  const mockCommissionService = {
    calculateCommission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionProcessor,
        {
          provide: CommissionService,
          useValue: mockCommissionService,
        },
      ],
    }).compile();

    processor = module.get<CommissionProcessor>(CommissionProcessor);
    commissionService = module.get<CommissionService>(CommissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleCalcCommission', () => {
    const mockJob: Partial<Job> = {
      data: {
        orderId: 'order1',
        tenantId: 'tenant1',
      },
    };

    it('应该成功处理佣金计算任务', async () => {
      mockCommissionService.calculateCommission.mockResolvedValue(undefined);

      await processor.handleCalcCommission(mockJob as Job);

      expect(mockCommissionService.calculateCommission).toHaveBeenCalledWith(
        'order1',
        'tenant1',
      );
    });

    it('应该抛出异常以触发重试 - 计算失败', async () => {
      const error = new Error('Database error');
      mockCommissionService.calculateCommission.mockRejectedValue(error);

      await expect(processor.handleCalcCommission(mockJob as Job)).rejects.toThrow(
        'Database error',
      );

      expect(mockCommissionService.calculateCommission).toHaveBeenCalledWith(
        'order1',
        'tenant1',
      );
    });
  });
});
