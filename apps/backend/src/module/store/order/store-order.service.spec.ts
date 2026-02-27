import { Test, TestingModule } from '@nestjs/testing';
import { StoreOrderService } from './store-order.service';
import { StoreOrderRepository } from './store-order.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionService } from 'src/module/finance/commission/commission.service';
import { OrderIntegrationService } from 'src/module/marketing/integration/integration.service';
import { PaymentGatewayPort } from 'src/module/payment/ports/payment-gateway.port';
import { BusinessException } from 'src/common/exceptions';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { OrderStatus, OrderType, CommissionStatus } from '@prisma/client';
import { RefundStatus } from 'src/module/payment/interfaces/payment-provider.interface';

describe('StoreOrderService', () => {
  let service: StoreOrderService;
  let prisma: PrismaService;
  let orderRepo: StoreOrderRepository;
  let commissionService: CommissionService;
  let orderIntegrationService: OrderIntegrationService;
  let paymentGateway: jest.Mocked<PaymentGatewayPort>;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    omsOrder: {
      findFirst: jest.fn(),
    },
    umsMember: {
      findUnique: jest.fn(),
    },
    srvWorker: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    sysTenant: {
      findUnique: jest.fn(),
    },
    finCommission: {
      update: jest.fn(),
    },
    finWallet: {
      update: jest.fn(),
    },
  };

  const mockOrderRepo = {
    findPage: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCommissionService = {
    getCommissionsByOrder: jest.fn(),
    updatePlanSettleTime: jest.fn(),
    cancelCommissions: jest.fn(),
  };

  const mockOrderIntegrationService = {
    handleOrderRefunded: jest.fn(),
  };

  const mockPaymentGateway = {
    refund: jest.fn(),
    prepay: jest.fn(),
    handleCallback: jest.fn(),
    queryPaymentStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreOrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StoreOrderRepository, useValue: mockOrderRepo },
        { provide: CommissionService, useValue: mockCommissionService },
        { provide: OrderIntegrationService, useValue: mockOrderIntegrationService },
        { provide: PaymentGatewayPort, useValue: mockPaymentGateway },
      ],
    }).compile();

    service = module.get<StoreOrderService>(StoreOrderService);
    prisma = module.get<PrismaService>(PrismaService);
    orderRepo = module.get<StoreOrderRepository>(StoreOrderRepository);
    commissionService = module.get<CommissionService>(CommissionService);
    orderIntegrationService = module.get<OrderIntegrationService>(OrderIntegrationService);
    paymentGateway = module.get(PaymentGatewayPort) as jest.Mocked<PaymentGatewayPort>;

    // Mock TenantContext
    jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant1');
    jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated orders with commissions', async () => {
      const mockResult = {
        rows: [
          {
            id: 'order1',
            tenantId: 'tenant1',
            payAmount: '100.00',
            items: [{ productImg: 'img1.jpg' }],
            tenant: { companyName: 'Tenant 1' },
          },
        ],
        total: 1,
      };
      mockOrderRepo.findPage.mockResolvedValue(mockResult);
      mockPrisma.$queryRaw.mockResolvedValue([{ orderId: 'order1', total: '10.00' }]);

      const query: any = { pageNum: 1, pageSize: 10, getDateRange: jest.fn() };
      const result = await service.findAll(query);

      const rows = result.data.rows as any[];
      expect(rows[0].commissionAmount).toBe(10.0);
      expect(rows[0].remainingAmount).toBe(90.0);
      expect(rows[0].tenantName).toBe('Tenant 1');
      expect(rows[0].productImg).toBe('img1.jpg');
    });
  });

  describe('findOne', () => {
    it('should throw error if order not found', async () => {
      mockPrisma.omsOrder.findFirst.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(BusinessException);
    });

    it('should return order details with worker and commissions', async () => {
      const mockOrder = {
        id: 'order1',
        memberId: 'm1',
        workerId: 1,
        tenantId: 't1',
        payAmount: '100.00',
        shareUserId: null as string | null,
      };
      mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.umsMember.findUnique.mockResolvedValue({ memberId: 'm1', nickname: 'Member 1', parentId: null });
      mockPrisma.srvWorker.findUnique.mockResolvedValue({ workerId: 1, name: 'Worker 1' });
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ tenantId: 't1', companyName: 'Tenant 1' });
      mockCommissionService.getCommissionsByOrder.mockResolvedValue([
        { amount: '20.00', status: CommissionStatus.FROZEN },
      ]);

      const result = await service.findOne('order1', true);

      const data = result.data as any;
      expect(data.order.id).toBe('order1');
      expect(data.customer.nickname).toBe('Member 1');
      expect(data.worker.name).toBe('Worker 1');
      expect(data.business.remainingAmount).toBe('80.00');
      expect(data.business.totalCommissionAmount).toBe('20.00');
    });

    it('should exclude cancelled commissions from calculation', async () => {
      const mockOrder = {
        id: 'order1',
        memberId: 'm1',
        workerId: null as number | null,
        tenantId: 't1',
        payAmount: '100.00',
        shareUserId: null as string | null,
      };
      mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.umsMember.findUnique.mockResolvedValue({ memberId: 'm1', nickname: 'Member 1', parentId: null });
      mockPrisma.sysTenant.findUnique.mockResolvedValue({ tenantId: 't1', companyName: 'Tenant 1' });
      mockCommissionService.getCommissionsByOrder.mockResolvedValue([
        { amount: '20.00', status: CommissionStatus.FROZEN },
        { amount: '10.00', status: CommissionStatus.CANCELLED },
      ]);

      const result = await service.findOne('order1', true);

      const data = result.data as any;
      expect(data.business.totalCommissionAmount).toBe('20.00');
      expect(data.business.remainingAmount).toBe('80.00');
    });
  });

  describe('reassignWorker', () => {
    it('should reassign worker for a paid order', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PAID });
      mockPrisma.srvWorker.findFirst.mockResolvedValue({ workerId: 2 });

      await service.reassignWorker({ orderId: 'order1', newWorkerId: 2 }, 'admin');

      expect(orderRepo.update).toHaveBeenCalledWith('order1', { workerId: 2 });
    });

    it('should throw error if order status not allowed', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.COMPLETED });
      await expect(service.reassignWorker({ orderId: 'order1', newWorkerId: 2 }, 'admin')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('verifyService', () => {
    it('should complete a shipped order', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.SHIPPED });
      mockCommissionService.updatePlanSettleTime.mockResolvedValue(undefined);

      await service.verifyService({ orderId: 'order1', remark: 'Done' }, 'admin');

      expect(orderRepo.update).toHaveBeenCalledWith(
        'order1',
        expect.objectContaining({
          status: OrderStatus.COMPLETED,
        }),
      );
      expect(commissionService.updatePlanSettleTime).toHaveBeenCalledWith('order1', 'VERIFY');
    });

    it('should throw error if order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyService({ orderId: 'order1' }, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if order status not SHIPPED', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PAID });

      await expect(service.verifyService({ orderId: 'order1' }, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if commission update fails', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.SHIPPED });
      mockCommissionService.updatePlanSettleTime.mockRejectedValue(new Error('Commission update failed'));

      await expect(service.verifyService({ orderId: 'order1' }, 'admin')).rejects.toThrow();
    });
  });

  describe('refundOrder', () => {
    it('should refund a paid order and cancel commissions', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PAID, memberId: 'm1', orderSn: 'ORDER123', payAmount: '100.00' });
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_ORDER123_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 10000,
      });
      mockCommissionService.cancelCommissions.mockResolvedValue(undefined);
      mockOrderIntegrationService.handleOrderRefunded.mockResolvedValue(undefined);

      await service.refundOrder('order1', 'Refund request', 'admin');

      expect(paymentGateway.refund).toHaveBeenCalledWith({
        orderSn: 'ORDER123',
        refundSn: expect.stringContaining('REFUND_ORDER123_'),
        refundAmount: '100.00',
        totalAmount: '100.00',
        reason: 'Refund request',
      });
      expect(orderRepo.update).toHaveBeenCalledWith(
        'order1',
        expect.objectContaining({
          status: OrderStatus.REFUNDED,
        }),
      );
      expect(commissionService.cancelCommissions).toHaveBeenCalledWith('order1');
      expect(orderIntegrationService.handleOrderRefunded).toHaveBeenCalledWith('order1', 'm1');
    });

    it('should throw error if order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.refundOrder('order1', 'Refund', 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if order status is PENDING_PAY', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PENDING_PAY });

      await expect(service.refundOrder('order1', 'Refund', 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if order already refunded', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.REFUNDED });

      await expect(service.refundOrder('order1', 'Refund', 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if wechat refund fails', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PAID, memberId: 'm1', orderSn: 'ORDER123', payAmount: '100.00' });
      mockPaymentGateway.refund.mockRejectedValue(new Error('Wechat API Error'));

      await expect(service.refundOrder('order1', 'Refund', 'admin')).rejects.toThrow(BusinessException);
      expect(paymentGateway.refund).toHaveBeenCalled();
    });

    it('should throw error if commission cancellation fails', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PAID, memberId: 'm1', orderSn: 'ORDER123', payAmount: '100.00' });
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_ORDER123_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 10000,
      });
      mockCommissionService.cancelCommissions.mockRejectedValue(new Error('Cancel failed'));

      await expect(service.refundOrder('order1', 'Refund', 'admin')).rejects.toThrow();
    });

    it('should throw error if integration service fails', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PAID, memberId: 'm1', orderSn: 'ORDER123', payAmount: '100.00' });
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_ORDER123_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 10000,
      });
      mockCommissionService.cancelCommissions.mockResolvedValue(undefined);
      mockOrderIntegrationService.handleOrderRefunded.mockRejectedValue(new Error('Integration failed'));

      await expect(service.refundOrder('order1', 'Refund', 'admin')).rejects.toThrow();
    });
  });

  describe('partialRefundOrder', () => {
    it('should partially refund order items', async () => {
      const mockOrder = {
        id: 'order1',
        status: OrderStatus.COMPLETED,
        memberId: 'm1',
        orderSn: 'ORDER123',
        payAmount: '100.00',
        couponDiscount: '10.00',
        pointsUsed: 100,
        userCouponId: 'coupon1',
        items: [
          { id: 1, price: '50.00', quantity: 2, productName: 'Product 1' },
          { id: 2, price: '25.00', quantity: 2, productName: 'Product 2' },
        ],
        commissions: [
          { id: 'comm1', amount: '20.00', status: CommissionStatus.FROZEN, beneficiaryId: 'm2' },
        ],
      };

      mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_ORDER123_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 5000,
      });
      mockPrisma.finCommission.update.mockResolvedValue({});
      mockOrderIntegrationService.handleOrderRefunded.mockResolvedValue(undefined);

      const dto = {
        orderId: 'order1',
        items: [{ itemId: 1, quantity: 1 }],
        remark: 'Partial refund',
      };

      const result = await service.partialRefundOrder(dto, 'admin');

      expect(paymentGateway.refund).toHaveBeenCalledWith({
        orderSn: 'ORDER123',
        refundSn: expect.stringContaining('REFUND_ORDER123_'),
        refundAmount: '50',
        totalAmount: '100.00',
        reason: 'Partial refund',
      });
      expect(result.data.refundAmount).toBe('50');
      expect(result.data.isFullRefund).toBe(false);
      expect(prisma.finCommission.update).toHaveBeenCalled();
    });

    it('should mark order as REFUNDED when all items are refunded', async () => {
      const mockOrder = {
        id: 'order1',
        status: OrderStatus.COMPLETED,
        memberId: 'm1',
        payAmount: '100.00',
        couponDiscount: '0.00',
        pointsUsed: 0,
        userCouponId: null as string | null,
        items: [{ id: 1, price: '100.00', quantity: 1, productName: 'Product 1' }],
        commissions: [] as unknown[],
      };

      mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_ORDER123_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 10000,
      });

      const dto = {
        orderId: 'order1',
        items: [{ itemId: 1, quantity: 1 }],
        remark: 'Full refund',
      };

      const result = await service.partialRefundOrder(dto, 'admin');

      expect(result.data.isFullRefund).toBe(true);
      expect(orderRepo.update).toHaveBeenCalledWith(
        'order1',
        expect.objectContaining({
          status: OrderStatus.REFUNDED,
        }),
      );
    });

    it('should throw error if order not found', async () => {
      mockPrisma.omsOrder.findFirst.mockResolvedValue(null);

      const dto = {
        orderId: 'order1',
        items: [{ itemId: 1, quantity: 1 }],
      };

      await expect(service.partialRefundOrder(dto, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if order item not found', async () => {
      const mockOrder = {
        id: 'order1',
        status: OrderStatus.COMPLETED,
        memberId: 'm1',
        payAmount: '100.00',
        items: [{ id: 1, price: '100.00', quantity: 1 }],
        commissions: [],
      };

      mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);

      const dto = {
        orderId: 'order1',
        items: [{ itemId: 999, quantity: 1 }],
      };

      await expect(service.partialRefundOrder(dto, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if refund quantity exceeds order quantity', async () => {
      const mockOrder = {
        id: 'order1',
        status: OrderStatus.COMPLETED,
        memberId: 'm1',
        payAmount: '100.00',
        items: [{ id: 1, price: '50.00', quantity: 2 }],
        commissions: [] as unknown[],
      };

      mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);

      const dto = {
        orderId: 'order1',
        items: [{ itemId: 1, quantity: 3 }],
      };

      await expect(service.partialRefundOrder(dto, 'admin')).rejects.toThrow(BusinessException);
    });

    it('should throw error if wechat partial refund fails', async () => {
      const mockOrder = {
        id: 'order1',
        status: OrderStatus.COMPLETED,
        memberId: 'm1',
        orderSn: 'ORDER123',
        payAmount: '100.00',
        items: [{ id: 1, price: '50.00', quantity: 2 }],
        commissions: [] as unknown[],
      };

      mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);
      mockPaymentGateway.refund.mockRejectedValue(new Error('Wechat API Error'));

      const dto = {
        orderId: 'order1',
        items: [{ itemId: 1, quantity: 1 }],
      };

      await expect(service.partialRefundOrder(dto, 'admin')).rejects.toThrow(BusinessException);
      expect(paymentGateway.refund).toHaveBeenCalled();
    });

    // TODO: 对接真实微信支付 API 后的集成测试
    it.todo('should integrate with real Wechat Pay refund API in sandbox (需要沙箱环境，见 Issue #T-7)');
    it.todo('should handle refund callback notification (需要实现回调接口，见 Issue #T-7)');
  });

  describe('batchVerify', () => {
    it('should verify multiple orders successfully', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.SHIPPED });
      mockCommissionService.updatePlanSettleTime.mockResolvedValue(undefined);

      const dto = {
        orderIds: ['order1', 'order2', 'order3'],
        remark: 'Batch verify',
      };

      const result = await service.batchVerify(dto, 'admin');

      expect(result.data.successCount).toBe(3);
      expect(result.data.failCount).toBe(0);
      expect(result.data.details).toHaveLength(3);
      expect(result.data.details[0].success).toBe(true);
      expect(orderRepo.update).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch verify', async () => {
      mockOrderRepo.findOne
        .mockResolvedValueOnce({ id: 'order1', status: OrderStatus.SHIPPED })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'order3', status: OrderStatus.SHIPPED });
      mockCommissionService.updatePlanSettleTime.mockResolvedValue(undefined);

      const dto = {
        orderIds: ['order1', 'order2', 'order3'],
        remark: 'Batch verify',
      };

      const result = await service.batchVerify(dto, 'admin');

      expect(result.data.successCount).toBe(2);
      expect(result.data.failCount).toBe(1);
      expect(result.data.details).toHaveLength(3);
      expect(result.data.details[0].success).toBe(true);
      expect(result.data.details[1].success).toBe(false);
      expect(result.data.details[1].error).toBeDefined();
      expect(result.data.details[2].success).toBe(true);
    });

    it('should continue processing after one order fails', async () => {
      mockOrderRepo.findOne
        .mockResolvedValueOnce({ id: 'order1', status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 'order2', status: OrderStatus.SHIPPED });
      mockCommissionService.updatePlanSettleTime.mockResolvedValue(undefined);

      const dto = {
        orderIds: ['order1', 'order2'],
        remark: 'Batch verify',
      };

      const result = await service.batchVerify(dto, 'admin');

      expect(result.data.successCount).toBe(1);
      expect(result.data.failCount).toBe(1);
      expect(result.data.details[0].success).toBe(false);
      expect(result.data.details[0].error).toContain('不允许核销');
      expect(result.data.details[1].success).toBe(true);
    });

    it('should return empty result for empty order list', async () => {
      const dto = {
        orderIds: [],
        remark: 'Batch verify',
      };

      const result = await service.batchVerify(dto, 'admin');

      expect(result.data.successCount).toBe(0);
      expect(result.data.failCount).toBe(0);
      expect(result.data.details).toHaveLength(0);
    });
  });

  describe('batchRefund', () => {
    it('should refund multiple orders successfully', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 'order1',
        status: OrderStatus.PAID,
        memberId: 'm1',
        orderSn: 'ORDER123',
        payAmount: '100.00',
      });
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_ORDER123_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 10000,
      });
      mockCommissionService.cancelCommissions.mockResolvedValue(undefined);
      mockOrderIntegrationService.handleOrderRefunded.mockResolvedValue(undefined);

      const dto = {
        orderIds: ['order1', 'order2', 'order3'],
        remark: 'Batch refund',
      };

      const result = await service.batchRefund(dto, 'admin');

      expect(result.data.successCount).toBe(3);
      expect(result.data.failCount).toBe(0);
      expect(result.data.details).toHaveLength(3);
      expect(result.data.details[0].success).toBe(true);
      expect(paymentGateway.refund).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch refund', async () => {
      mockOrderRepo.findOne
        .mockResolvedValueOnce({
          id: 'order1',
          status: OrderStatus.PAID,
          memberId: 'm1',
          orderSn: 'ORDER123',
          payAmount: '100.00',
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'order3',
          status: OrderStatus.PAID,
          memberId: 'm1',
          orderSn: 'ORDER456',
          payAmount: '100.00',
        });
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 10000,
      });
      mockCommissionService.cancelCommissions.mockResolvedValue(undefined);
      mockOrderIntegrationService.handleOrderRefunded.mockResolvedValue(undefined);

      const dto = {
        orderIds: ['order1', 'order2', 'order3'],
        remark: 'Batch refund',
      };

      const result = await service.batchRefund(dto, 'admin');

      expect(result.data.successCount).toBe(2);
      expect(result.data.failCount).toBe(1);
      expect(result.data.details).toHaveLength(3);
      expect(result.data.details[0].success).toBe(true);
      expect(result.data.details[1].success).toBe(false);
      expect(result.data.details[1].error).toBeDefined();
      expect(result.data.details[2].success).toBe(true);
    });

    it('should continue processing after wechat refund fails', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        id: 'order1',
        status: OrderStatus.PAID,
        memberId: 'm1',
        orderSn: 'ORDER123',
        payAmount: '100.00',
      });
      mockPaymentGateway.refund
        .mockRejectedValueOnce(new Error('Wechat API Error'))
        .mockResolvedValueOnce({
          refundSn: 'REFUND_123456',
          refundId: 'wx_refund_123',
          status: RefundStatus.SUCCESS,
          amount: 10000,
        });
      mockCommissionService.cancelCommissions.mockResolvedValue(undefined);
      mockOrderIntegrationService.handleOrderRefunded.mockResolvedValue(undefined);

      const dto = {
        orderIds: ['order1', 'order2'],
        remark: 'Batch refund',
      };

      const result = await service.batchRefund(dto, 'admin');

      expect(result.data.successCount).toBe(1);
      expect(result.data.failCount).toBe(1);
      expect(result.data.details[0].success).toBe(false);
      expect(result.data.details[0].error).toContain('退款失败');
      expect(result.data.details[1].success).toBe(true);
    });

    it('should return empty result for empty order list', async () => {
      const dto = {
        orderIds: [],
        remark: 'Batch refund',
      };

      const result = await service.batchRefund(dto, 'admin');

      expect(result.data.successCount).toBe(0);
      expect(result.data.failCount).toBe(0);
      expect(result.data.details).toHaveLength(0);
    });

    it('should handle orders with invalid status', async () => {
      mockOrderRepo.findOne
        .mockResolvedValueOnce({ id: 'order1', status: OrderStatus.PENDING_PAY })
        .mockResolvedValueOnce({
          id: 'order2',
          status: OrderStatus.PAID,
          memberId: 'm1',
          orderSn: 'ORDER123',
          payAmount: '100.00',
        });
      mockPaymentGateway.refund.mockResolvedValue({
        refundSn: 'REFUND_123456',
        refundId: 'wx_refund_123',
        status: RefundStatus.SUCCESS,
        amount: 10000,
      });
      mockCommissionService.cancelCommissions.mockResolvedValue(undefined);
      mockOrderIntegrationService.handleOrderRefunded.mockResolvedValue(undefined);

      const dto = {
        orderIds: ['order1', 'order2'],
        remark: 'Batch refund',
      };

      const result = await service.batchRefund(dto, 'admin');

      expect(result.data.successCount).toBe(1);
      expect(result.data.failCount).toBe(1);
      expect(result.data.details[0].success).toBe(false);
      expect(result.data.details[0].error).toContain('不可退款');
      expect(result.data.details[1].success).toBe(true);
    });
  });
});
