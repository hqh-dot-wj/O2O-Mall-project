import { Test, TestingModule } from '@nestjs/testing';
import { StockAlertScheduler } from './stock-alert.scheduler';
import { StockAlertService } from './stock-alert.service';

describe('StockAlertScheduler', () => {
  let scheduler: StockAlertScheduler;
  const mockStockAlertService = {
    checkLowStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAlertScheduler,
        {
          provide: StockAlertService,
          useValue: mockStockAlertService,
        },
      ],
    }).compile();

    scheduler = module.get<StockAlertScheduler>(StockAlertScheduler);
    jest.clearAllMocks();
  });

  it('应该被正确创建', () => {
    expect(scheduler).toBeDefined();
  });

  describe('handleStockAlert', () => {
    it('应该调用 StockAlertService.checkLowStock', async () => {
      mockStockAlertService.checkLowStock.mockResolvedValue(undefined);

      await scheduler.handleStockAlert();

      expect(mockStockAlertService.checkLowStock).toHaveBeenCalledTimes(1);
    });
  });
});
