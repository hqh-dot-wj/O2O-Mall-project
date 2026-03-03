import { Test, TestingModule } from '@nestjs/testing';
import { OrderQueryAdapter } from './order-query.adapter';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderType } from '@prisma/client';

describe('OrderQueryAdapter', () => {
  let adapter: OrderQueryAdapter;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    omsOrder: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderQueryAdapter,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    adapter = module.get<OrderQueryAdapter>(OrderQueryAdapter);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOrderForCommission', () => {
    // R-FLOW-OQA-01: 正常获取订单信息
    it('Given 存在的订单ID, When findOrderForCommission, Then 返回订单信息', async () => {
      const mockOrder = {
        id: 'order1',
        tenantId: 'tenant1',
        memberId: 'member1',
        shareUserId: 'sharer1',
        orderType: OrderType.PRODUCT,
        totalAmount: new Decimal('100.00'),
        payAmount: new Decimal('90.00'),
        couponDiscount: new Decimal('10.00'),
        pointsDiscount: new Decimal('0'),
        items: [
          {
            skuId: 'sku1',
            productId: 'product1',
            quantity: 2,
            price: new Decimal('45.00'),
          },
        ],
      };

      mockPrismaService.omsOrder.findUnique.mockResolvedValue(mockOrder);

      const result = await adapter.findOrderForCommission('order1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('order1');
      expect(result?.memberId).toBe('member1');
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0].productId).toBe('product1');
    });

    // R-FLOW-OQA-02: 订单不存在返回 null
    it('Given 不存在的订单ID, When findOrderForCommission, Then 返回 null', async () => {
      mockPrismaService.omsOrder.findUnique.mockResolvedValue(null);

      const result = await adapter.findOrderForCommission('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findOrdersForCommission', () => {
    // R-FLOW-OQA-03: 批量获取订单
    it('Given 多个订单ID, When findOrdersForCommission, Then 返回订单Map', async () => {
      const mockOrders = [
        {
          id: 'order1',
          tenantId: 'tenant1',
          memberId: 'member1',
          shareUserId: null,
          orderType: OrderType.PRODUCT,
          totalAmount: new Decimal('100.00'),
          payAmount: new Decimal('100.00'),
          couponDiscount: null,
          pointsDiscount: null,
          items: [],
        },
        {
          id: 'order2',
          tenantId: 'tenant1',
          memberId: 'member2',
          shareUserId: null,
          orderType: OrderType.SERVICE,
          totalAmount: new Decimal('200.00'),
          payAmount: new Decimal('200.00'),
          couponDiscount: null,
          pointsDiscount: null,
          items: [],
        },
      ];

      mockPrismaService.omsOrder.findMany.mockResolvedValue(mockOrders);

      const result = await adapter.findOrdersForCommission(['order1', 'order2']);

      expect(result.size).toBe(2);
      expect(result.get('order1')?.memberId).toBe('member1');
      expect(result.get('order2')?.memberId).toBe('member2');
    });

    // R-FLOW-OQA-04: 空数组返回空Map
    it('Given 空数组, When findOrdersForCommission, Then 返回空Map', async () => {
      const result = await adapter.findOrdersForCommission([]);

      expect(result.size).toBe(0);
      expect(mockPrismaService.omsOrder.findMany).not.toHaveBeenCalled();
    });
  });
});
