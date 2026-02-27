import { Test, TestingModule } from '@nestjs/testing';
import { StockAlertService } from './stock-alert.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/module/notification/notification.service';

describe('StockAlertService', () => {
  let service: StockAlertService;

  const mockPrisma = {
    sysConfig: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    sysTenant: {
      findMany: jest.fn(),
    },
    pmsTenantSku: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAlertService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<StockAlertService>(StockAlertService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getThreshold', () => {
    it('应该返回默认阈值 10（无配置时）', async () => {
      mockPrisma.sysConfig.findFirst.mockResolvedValue(null);

      const result = await service.getThreshold('t1');

      expect(result.data?.threshold).toBe(10);
    });

    it('应该返回配置的阈值', async () => {
      mockPrisma.sysConfig.findFirst.mockResolvedValue({
        configKey: 'store.product.stockAlertThreshold',
        configValue: '20',
      });

      const result = await service.getThreshold('t1');

      expect(result.data?.threshold).toBe(20);
    });
  });

  describe('setThreshold', () => {
    it('应该成功创建新配置', async () => {
      mockPrisma.sysConfig.findFirst.mockResolvedValue(null);
      mockPrisma.sysConfig.create.mockResolvedValue({});

      const result = await service.setThreshold('t1', { threshold: 15 });

      expect(result.data?.threshold).toBe(15);
      expect(mockPrisma.sysConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ configValue: '15' }),
        }),
      );
    });

    it('应该成功更新已有配置', async () => {
      mockPrisma.sysConfig.findFirst.mockResolvedValue({ configId: 1 });
      mockPrisma.sysConfig.update.mockResolvedValue({});

      const result = await service.setThreshold('t1', { threshold: 20 });

      expect(result.data?.threshold).toBe(20);
      expect(mockPrisma.sysConfig.update).toHaveBeenCalledWith({
        where: { configId: 1 },
        data: { configValue: '20' },
      });
    });
  });

  describe('checkLowStock', () => {
    it('无租户时不应发送消息', async () => {
      mockPrisma.sysTenant.findMany.mockResolvedValue([]);

      await service.checkLowStock();

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });

    it('有低库存时应发送预警消息', async () => {
      mockPrisma.sysTenant.findMany.mockResolvedValue([
        { tenantId: 't1', companyName: '门店A' },
      ]);
      mockPrisma.sysConfig.findFirst.mockResolvedValue({
        configKey: 'store.product.stockAlertThreshold',
        configValue: '10',
      });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([
        {
          stock: 5,
          globalSku: { specValues: '红色' },
          tenantProd: { product: { name: '商品A' } },
        },
      ]);
      mockNotificationService.send.mockResolvedValue(undefined);

      await service.checkLowStock();

      expect(mockNotificationService.send).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '库存预警',
          template: 'STOCK_ALERT',
          target: 't1',
          tenantId: 't1',
          channel: 'IN_APP',
        }),
      );
      expect(mockNotificationService.send.mock.calls[0][0].content).toContain('商品A');
      expect(mockNotificationService.send.mock.calls[0][0].content).toContain('库存 5');
    });

    it('无低库存时不应发送消息', async () => {
      mockPrisma.sysTenant.findMany.mockResolvedValue([
        { tenantId: 't1', companyName: '门店A' },
      ]);
      mockPrisma.sysConfig.findFirst.mockResolvedValue({ configValue: '10' });
      mockPrisma.pmsTenantSku.findMany.mockResolvedValue([]);

      await service.checkLowStock();

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });
});
