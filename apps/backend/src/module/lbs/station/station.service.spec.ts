import { Test, TestingModule } from '@nestjs/testing';
import { BusinessException } from 'src/common/exceptions';
import { StationService } from './station.service';
import { StationRepository } from './station.repository';
import { GeoService } from '../geo/geo.service';

describe('StationService', () => {
  let service: StationService;
  let repo: StationRepository;
  let geoService: GeoService;

  const mockRepo = {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    findMany: jest.fn(),
    createFenceWithGeom: jest.fn(),
    deleteFencesByStationId: jest.fn(),
  };

  const mockGeoService = {
    toPolygonWKT: jest.fn(),
    findStationByPoint: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationService,
        {
          provide: StationRepository,
          useValue: mockRepo,
        },
        {
          provide: GeoService,
          useValue: mockGeoService,
        },
      ],
    }).compile();

    service = module.get<StationService>(StationService);
    repo = module.get<StationRepository>(StationRepository);
    geoService = module.get<GeoService>(GeoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create station and its fence', async () => {
      const dto = {
        tenantId: 'tenant1',
        name: 'Test Station',
        address: 'Test Address',
        location: { lat: 30, lng: 104 },
        fence: {
          points: [
            { lat: 30, lng: 104 },
            { lat: 31, lng: 104 },
            { lat: 31, lng: 105 },
            { lat: 30, lng: 104 },
          ],
        },
      };

      mockRepo.create.mockResolvedValue({ stationId: 1 });
      mockGeoService.toPolygonWKT.mockReturnValue('POLYGON(...)');

      await service.create(dto as any);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant1',
          name: 'Test Station',
          latitude: 30,
          longitude: 104,
        }),
      );
      expect(mockGeoService.toPolygonWKT).toHaveBeenCalledWith([
        [104, 30],
        [104, 31],
        [105, 31],
        [104, 30],
      ]);
      expect(mockRepo.createFenceWithGeom).toHaveBeenCalledWith(1, 'SERVICE', 'POLYGON(...)');
    });

    it('should throw when tenantId is missing', async () => {
      const dto = {
        name: 'Test Station',
        location: { lat: 30, lng: 104 },
      };

      await expect(service.create(dto as any)).rejects.toThrow(BusinessException);
      try {
        await service.create(dto as any);
      } catch (error) {
        const response = (error as any).getResponse();
        expect(response.msg).toBe('tenantId 不能为空');
      }
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should support legacy flat coordinates', async () => {
      const dto = {
        tenantId: 'tenant1',
        name: 'Legacy Station',
        latitude: 30,
        longitude: 104,
      };

      mockRepo.create.mockResolvedValue({ stationId: 2 });
      await service.create(dto as any);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 30,
          longitude: 104,
        }),
      );
    });

    it('should throw when fence conversion fails', async () => {
      const dto = {
        tenantId: 'tenant1',
        name: 'Test Station',
        location: { lat: 30, lng: 104 },
        fence: {
          points: [
            { lat: 30, lng: 104 },
            { lat: 31, lng: 104 },
            { lat: 31, lng: 105 },
          ],
        },
      };

      mockRepo.create.mockResolvedValue({ stationId: 3 });
      mockGeoService.toPolygonWKT.mockImplementation(() => {
        throw new Error('invalid fence');
      });

      await expect(service.create(dto as any)).rejects.toThrow('invalid fence');
      expect(mockRepo.createFenceWithGeom).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should call repo.findMany', async () => {
      await service.findAll('tenant1');
      expect(mockRepo.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant1' },
      });
    });
  });

  describe('findNearby', () => {
    it('should call geoService.findStationByPoint', async () => {
      await service.findNearby(30, 104);
      expect(mockGeoService.findStationByPoint).toHaveBeenCalledWith(30, 104);
    });
  });

  describe('upsertMainStation', () => {
    it('should update existing station', async () => {
      const tenantId = 'tenant1';
      const data = { latitude: 30, longitude: 104 };

      mockRepo.findOne.mockResolvedValue({ stationId: 1 });
      mockRepo.update.mockResolvedValue({ stationId: 1 });

      await service.upsertMainStation(tenantId, data);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ tenantId });
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('should create new station if not exists', async () => {
      const tenantId = 'tenant1';
      const data = { latitude: 30, longitude: 104 };

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ stationId: 2 });

      await service.upsertMainStation(tenantId, data);

      expect(mockRepo.create).toHaveBeenCalled();
    });
  });
});
