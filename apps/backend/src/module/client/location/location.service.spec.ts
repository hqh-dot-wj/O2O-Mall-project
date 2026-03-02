import { Test, TestingModule } from '@nestjs/testing';
import { BusinessException } from 'src/common/exceptions';
import { ClientLocationService } from './location.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeoService } from 'src/module/lbs/geo/geo.service';

describe('ClientLocationService', () => {
  let service: ClientLocationService;

  const mockPrisma = {
    sysTenant: {
      findUnique: jest.fn(),
    },
    sysTenantGeo: {
      findMany: jest.fn(),
    },
  };

  const mockGeoService = {
    findStationByPoint: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientLocationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: GeoService,
          useValue: mockGeoService,
        },
      ],
    }).compile();

    service = module.get<ClientLocationService>(ClientLocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('matchTenantByLocation', () => {
    it('should throw when station is not matched', async () => {
      mockGeoService.findStationByPoint.mockResolvedValue(null);

      await expect(service.matchTenantByLocation(30, 104)).rejects.toThrow(BusinessException);
    });

    it('should throw when tenant is inactive', async () => {
      mockGeoService.findStationByPoint.mockResolvedValue({
        stationId: 1,
        name: 'test',
        tenantId: 'tenant1',
      });
      mockPrisma.sysTenant.findUnique.mockResolvedValue({
        tenantId: 'tenant1',
        companyName: 'test tenant',
        status: 'STOP',
      });

      await expect(service.matchTenantByLocation(30, 104)).rejects.toThrow(BusinessException);
      try {
        await service.matchTenantByLocation(30, 104);
      } catch (error) {
        const response = (error as any).getResponse();
        expect(response.msg).toBe('服务商家暂不可用');
      }
    });

    it('should return tenant info when station and tenant are valid', async () => {
      mockGeoService.findStationByPoint.mockResolvedValue({
        stationId: 1,
        name: 'test',
        tenantId: 'tenant1',
      });
      mockPrisma.sysTenant.findUnique.mockResolvedValue({
        tenantId: 'tenant1',
        companyName: 'test tenant',
        status: 'NORMAL',
      });

      const result = await service.matchTenantByLocation(30, 104);
      expect(result).toEqual({
        tenantId: 'tenant1',
        companyName: 'test tenant',
      });
    });
  });
});
