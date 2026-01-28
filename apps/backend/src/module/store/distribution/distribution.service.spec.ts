import { Test, TestingModule } from '@nestjs/testing';
import { DistributionService } from './distribution.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { BusinessConstants } from 'src/common/constants/business.constants';

describe('DistributionService', () => {
    let service: DistributionService;
    let prisma: PrismaService;

    const mockPrisma = {
        sysDistConfig: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        sysDistConfigLog: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
        sysTenant: {
            findUnique: jest.fn(),
        },
        umsMember: {
            findUnique: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DistributionService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<DistributionService>(DistributionService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getConfig', () => {
        it('should return default config if none exists', async () => {
            mockPrisma.sysDistConfig.findUnique.mockResolvedValue(null);
            const result = await service.getConfig('tenant1');

            expect(result.data.level1Rate).toBe(BusinessConstants.DISTRIBUTION.DEFAULT_LEVEL1_RATE * 100);
            expect(result.data.enableLV0).toBe(true);
        });

        it('should return stored config', async () => {
            const mockConfig = {
                id: 1,
                tenantId: 'tenant1',
                level1Rate: 0.15,
                level2Rate: 0.1,
                enableLV0: true,
                createTime: new Date(),
            };
            mockPrisma.sysDistConfig.findUnique.mockResolvedValue(mockConfig);

            const result = await service.getConfig('tenant1');
            expect(result.data.level1Rate).toBe(15);
            expect(result.data.level2Rate).toBe(10);
        });
    });

    describe('updateConfig', () => {
        const dto = {
            level1Rate: 20,
            level2Rate: 10,
            enableLV0: true,
            enableCrossTenant: true,
            crossTenantRate: 80,
            crossMaxDaily: 1000,
        };

        it('should throw error if total rate > 100%', async () => {
            const invalidDto = { ...dto, level1Rate: 60, level2Rate: 50 };
            await expect(service.updateConfig('tenant1', invalidDto, 'admin'))
                .rejects.toThrow(BusinessException);
        });

        it('should successfully update and log config', async () => {
            mockPrisma.sysDistConfig.upsert.mockResolvedValue({});
            mockPrisma.sysDistConfigLog.create.mockResolvedValue({});

            await service.updateConfig('tenant1', dto, 'admin');

            expect(mockPrisma.sysDistConfig.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: expect.objectContaining({
                        level1Rate: 0.2,
                        level2Rate: 0.1,
                    }),
                })
            );
            expect(mockPrisma.sysDistConfigLog.create).toHaveBeenCalled();
        });
    });

    describe('getCommissionPreview', () => {
        it('should return preview info for local share', async () => {
            mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
            mockPrisma.sysDistConfig.findUnique.mockResolvedValue({ level1Rate: 0.15, enableCrossTenant: false });
            mockPrisma.umsMember.findUnique.mockResolvedValue({ tenantId: 'tenant1' });

            const result = await service.getCommissionPreview('tenant1', 'member1');

            expect(result.data.tenantName).toBe('Store A');
            expect(result.data.commissionRate).toBe('15%');
            expect(result.data.isLocalReferrer).toBe(true);
        });

        it('should show cross-tenant notice if enabled', async () => {
            mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
            mockPrisma.sysDistConfig.findUnique.mockResolvedValue({
                level1Rate: 0.1,
                enableCrossTenant: true,
                crossTenantRate: 0.8
            });
            mockPrisma.umsMember.findUnique.mockResolvedValue({ tenantId: 'tenant2' });

            const result = await service.getCommissionPreview('tenant1', 'member1');

            expect(result.data.commissionRate).toBe('8%'); // 0.1 * 0.8 = 0.08
            expect(result.data.notice).toContain('Store A');
        });

        it('should show 0% commission if cross-tenant disabled', async () => {
            mockPrisma.sysTenant.findUnique.mockResolvedValue({ companyName: 'Store A' });
            mockPrisma.sysDistConfig.findUnique.mockResolvedValue({
                level1Rate: 0.1,
                enableCrossTenant: false
            });
            mockPrisma.umsMember.findUnique.mockResolvedValue({ tenantId: 'tenant2' });

            const result = await service.getCommissionPreview('tenant1', 'member1');

            expect(result.data.commissionRate).toBe('0%');
            expect(result.data.notice).toContain('未开启跨店分销');
        });
    });
});
