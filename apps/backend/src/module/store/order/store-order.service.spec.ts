import { Test, TestingModule } from '@nestjs/testing';
import { StoreOrderService } from './store-order.service';
import { StoreOrderRepository } from './store-order.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommissionService } from 'src/module/finance/commission/commission.service';
import { BusinessException } from 'src/common/exceptions';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { OrderStatus, OrderType } from '@prisma/client';

describe('StoreOrderService', () => {
    let service: StoreOrderService;
    let prisma: PrismaService;
    let orderRepo: StoreOrderRepository;
    let commissionService: CommissionService;

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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StoreOrderService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: StoreOrderRepository, useValue: mockOrderRepo },
                { provide: CommissionService, useValue: mockCommissionService },
            ],
        }).compile();

        service = module.get<StoreOrderService>(StoreOrderService);
        prisma = module.get<PrismaService>(PrismaService);
        orderRepo = module.get<StoreOrderRepository>(StoreOrderRepository);
        commissionService = module.get<CommissionService>(CommissionService);

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
                rows: [{ id: 'order1', tenantId: 'tenant1', tenant: { companyName: 'Tenant 1' } }],
                total: 1,
            };
            mockOrderRepo.findPage.mockResolvedValue(mockResult);
            mockPrisma.$queryRaw.mockResolvedValue([{ orderId: 'order1', total: '10.00' }]);

            const query: any = { pageNum: 1, pageSize: 10, getDateRange: jest.fn() };
            const result = await service.findAll(query);

            const rows = result.data.rows as any[];
            expect(rows[0].commissionAmount).toBe('10.00');
            expect(rows[0].tenantName).toBe('Tenant 1');
        });
    });

    describe('findOne', () => {
        it('should throw error if order not found', async () => {
            mockPrisma.omsOrder.findFirst.mockResolvedValue(null);
            await expect(service.findOne('1')).rejects.toThrow(BusinessException);
        });

        it('should return order details with worker and commissions', async () => {
            const mockOrder = { id: 'order1', memberId: 'm1', workerId: 1, tenantId: 't1', payAmount: '100.00' };
            mockPrisma.omsOrder.findFirst.mockResolvedValue(mockOrder);
            mockPrisma.umsMember.findUnique.mockResolvedValue({ memberId: 'm1', nickname: 'Member 1' });
            mockPrisma.srvWorker.findUnique.mockResolvedValue({ workerId: 1, name: 'Worker 1' });
            mockPrisma.sysTenant.findUnique.mockResolvedValue({ tenantId: 't1', companyName: 'Tenant 1' });
            mockCommissionService.getCommissionsByOrder.mockResolvedValue([{ amount: '20.00' }]);

            const result = await service.findOne('order1', true);

            const data = result.data as any;
            expect(data.order.id).toBe('order1');
            expect(data.customer.nickname).toBe('Member 1');
            expect(data.worker.name).toBe('Worker 1');
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
            await expect(service.reassignWorker({ orderId: 'order1', newWorkerId: 2 }, 'admin')).rejects.toThrow(BusinessException);
        });
    });

    describe('verifyService', () => {
        it('should complete a shipped order', async () => {
            mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.SHIPPED });

            await service.verifyService({ orderId: 'order1', remark: 'Done' }, 'admin');

            expect(orderRepo.update).toHaveBeenCalledWith('order1', expect.objectContaining({
                status: OrderStatus.COMPLETED
            }));
            expect(commissionService.updatePlanSettleTime).toHaveBeenCalled();
        });
    });

    describe('refundOrder', () => {
        it('should refund a paid order and cancel commissions', async () => {
            mockOrderRepo.findOne.mockResolvedValue({ id: 'order1', status: OrderStatus.PAID });

            await service.refundOrder('order1', 'Refund request', 'admin');

            expect(orderRepo.update).toHaveBeenCalledWith('order1', expect.objectContaining({
                status: OrderStatus.REFUNDED
            }));
            expect(commissionService.cancelCommissions).toHaveBeenCalledWith('order1');
        });
    });
});
