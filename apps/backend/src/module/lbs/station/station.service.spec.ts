import { Test, TestingModule } from '@nestjs/testing';
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

            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Station',
                latitude: 30,
                longitude: 104,
            }));
            expect(mockGeoService.toPolygonWKT).toHaveBeenCalled();
            expect(mockRepo.createFenceWithGeom).toHaveBeenCalledWith(1, 'SERVICE', 'POLYGON(...)');
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
