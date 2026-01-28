import { Test, TestingModule } from '@nestjs/testing';
import { GeoService } from './geo.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('GeoService', () => {
  let service: GeoService;
  let prisma: PrismaService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<GeoService>(GeoService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toPolygonWKT', () => {
    it('should throw error if less than 3 points', () => {
      expect(() =>
        service.toPolygonWKT([
          [1, 2],
          [2, 3],
        ]),
      ).toThrow('多边形必须至少包含 3 个点');
    });

    it('should close the polygon if not closed', () => {
      const coords = [
        [100, 0],
        [101, 0],
        [101, 1],
        [100, 1],
      ];
      const wkt = service.toPolygonWKT(coords);
      expect(wkt).toBe('POLYGON((100 0,101 0,101 1,100 1,100 0))');
    });

    it('should handle already closed polygon', () => {
      const coords = [
        [100, 0],
        [101, 0],
        [101, 1],
        [100, 1],
        [100, 0],
      ];
      const wkt = service.toPolygonWKT(coords);
      expect(wkt).toBe('POLYGON((100 0,101 0,101 1,100 1,100 0))');
    });
  });

  describe('findStationByPoint', () => {
    it('should return station info when point is inside fence', async () => {
      const mockResult = [{ stationId: 1, name: 'Test Station', tenantId: 'tenant1' }];
      mockPrisma.$queryRaw.mockResolvedValue(mockResult);

      const result = await service.findStationByPoint(30, 104);
      expect(result).toEqual(mockResult[0]);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return null when no station found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findStationByPoint(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('should return distance from PostGIS', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ distance: 1000 }]);

      const result = await service.calculateDistance(30, 104, 30.01, 104.01);
      expect(result).toBe(1000);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return 0 when result is empty', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await service.calculateDistance(0, 0, 0, 0);
      expect(result).toBe(0);
    });
  });
});
