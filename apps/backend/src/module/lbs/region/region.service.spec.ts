import { Test, TestingModule } from '@nestjs/testing';
import { RegionService } from './region.service';
import { RegionRepository } from './region.repository';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('RegionService', () => {
    let service: RegionService;
    let repo: RegionRepository;

    const mockRepo = {
        count: jest.fn(),
        createMany: jest.fn(),
        findAllRegions: jest.fn(),
        findRoots: jest.fn(),
        findChildren: jest.fn(),
        findById: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RegionService,
                {
                    provide: RegionRepository,
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<RegionService>(RegionService);
        repo = module.get<RegionRepository>(RegionRepository);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('onModuleInit', () => {
        it('should seed regions if count is 0', async () => {
            mockRepo.count.mockResolvedValue(0);
            const seedSpy = jest.spyOn(service, 'seedRegions').mockResolvedValue(undefined);

            await service.onModuleInit();

            expect(seedSpy).toHaveBeenCalled();
        });

        it('should not seed if regions exist', async () => {
            mockRepo.count.mockResolvedValue(100);
            const seedSpy = jest.spyOn(service, 'seedRegions');

            await service.onModuleInit();

            expect(seedSpy).not.toHaveBeenCalled();
        });
    });

    describe('getTree', () => {
        it('should build a tree from flat records', async () => {
            const mockRegions = [
                { code: '11', name: 'Province 1', parentCode: null },
                { code: '1101', name: 'City 1', parentCode: '11' },
                { code: '12', name: 'Province 2', parentCode: '' },
            ];
            mockRepo.findAllRegions.mockResolvedValue(mockRegions);

            const tree = await service.getTree();

            expect(tree.length).toBe(2);
            expect(tree[0].code).toBe('11');
            expect(tree[0].children.length).toBe(1);
            expect(tree[0].children[0].code).toBe('1101');
            expect(tree[1].code).toBe('12');
        });
    });

    describe('getChildren', () => {
        it('should call findRoots when no parentCode', async () => {
            await service.getChildren();
            expect(mockRepo.findRoots).toHaveBeenCalled();
        });

        it('should call findChildren when parentCode provided', async () => {
            await service.getChildren('110100');
            expect(mockRepo.findChildren).toHaveBeenCalledWith('110100');
        });
    });

    describe('getRegionName', () => {
        it('should return region name', async () => {
            mockRepo.findById.mockResolvedValue({ name: 'Beijing' });
            const name = await service.getRegionName('110000');
            expect(name).toBe('Beijing');
        });

        it('should return empty string if not found', async () => {
            mockRepo.findById.mockResolvedValue(null);
            const name = await service.getRegionName('000000');
            expect(name).toBe('');
        });
    });
});
