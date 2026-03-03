// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionService } from './admission.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { LbsMetricsService } from '../monitoring/lbs-metrics.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';

describe('AdmissionService', () => {
  let service: AdmissionService;
  let prismaService: jest.Mocked<PrismaService>;
  let geoService: jest.Mocked<GeoService>;
  let metricsService: jest.Mocked<LbsMetricsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionService,
        {
          provide: PrismaService,
          useValue: {
            sysTenant: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: GeoService,
          useValue: {
            findStationByPoint: jest.fn(),
            calculateDistance: jest.fn(),
          },
        },
        {
          provide: LbsMetricsService,
          useValue: {
            recordMatchRequest: jest.fn(),
            recordFenceHit: jest.fn(),
            recordRadiusFallback: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdmissionService>(AdmissionService);
    prismaService = module.get(PrismaService);
    geoService = module.get(GeoService);
    metricsService = module.get(LbsMetricsService);
  });

  // R-PRE-TENANT-01: 租户存在性校验
  it('Given tenant not exists, When checkLocationAdmission, Then throw 租户不存在', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue(null);

    await expect(service.checkLocationAdmission('tenant-1', 30.0, 120.0)).rejects.toThrow(BusinessException);
  });

  // R-PRE-TENANT-02: 租户状态校验
  it('Given tenant status is STOP, When checkLocationAdmission, Then throw 租户不可用', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      status: 'STOP',
      geoConfig: null,
    } as any);

    await expect(service.checkLocationAdmission('tenant-1', 30.0, 120.0)).rejects.toThrow(BusinessException);
  });

  // R-FLOW-FENCE-01: 围栏优先匹配
  it('Given location hits fence, When checkLocationAdmission, Then return true', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      status: 'NORMAL',
      geoConfig: null,
    } as any);

    geoService.findStationByPoint.mockResolvedValue({
      stationId: 1,
      name: 'Station A',
      tenantId: 'tenant-1',
    });

    const result = await service.checkLocationAdmission('tenant-1', 30.0, 120.0);
    expect(result).toBe(true);
  });

  // R-FLOW-RADIUS-01: 半径降级匹配
  it('Given fence miss but within radius, When checkLocationAdmission, Then return true', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      status: 'NORMAL',
      geoConfig: {
        latitude: 30.0,
        longitude: 120.0,
        serviceRadius: 5000,
      },
    } as any);

    geoService.findStationByPoint.mockResolvedValue(null);
    geoService.calculateDistance.mockResolvedValue(3000);

    const result = await service.checkLocationAdmission('tenant-1', 30.01, 120.01);
    expect(result).toBe(true);
  });

  // R-BRANCH-OUTOFRANGE-01: 超出范围异常
  it('Given fence miss and out of radius, When checkLocationAdmission, Then throw 超出服务范围', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      status: 'NORMAL',
      geoConfig: {
        latitude: 30.0,
        longitude: 120.0,
        serviceRadius: 5000,
      },
    } as any);

    geoService.findStationByPoint.mockResolvedValue(null);
    geoService.calculateDistance.mockResolvedValue(8000);

    await expect(service.checkLocationAdmission('tenant-1', 30.1, 120.1)).rejects.toThrow(BusinessException);
  });

  // R-BRANCH-NOCONFIG-01: 无配置时拒绝
  it('Given no fence and no radius config, When checkLocationAdmission, Then throw 超出服务范围', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      status: 'NORMAL',
      geoConfig: null,
    } as any);

    geoService.findStationByPoint.mockResolvedValue(null);

    await expect(service.checkLocationAdmission('tenant-1', 30.0, 120.0)).rejects.toThrow(BusinessException);
  });

  // R-FLOW-NOEXCEPT-01: 不抛异常版本
  it('Given out of range, When isLocationInRange, Then return false', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      status: 'NORMAL',
      geoConfig: null,
    } as any);

    geoService.findStationByPoint.mockResolvedValue(null);

    const result = await service.isLocationInRange('tenant-1', 30.0, 120.0);
    expect(result).toBe(false);
  });

  // R-FLOW-NOEXCEPT-02: 不抛异常版本（在范围内）
  it('Given in range, When isLocationInRange, Then return true', async () => {
    prismaService.sysTenant.findUnique.mockResolvedValue({
      tenantId: 'tenant-1',
      status: 'NORMAL',
      geoConfig: null,
    } as any);

    geoService.findStationByPoint.mockResolvedValue({
      stationId: 1,
      name: 'Station A',
      tenantId: 'tenant-1',
    });

    const result = await service.isLocationInRange('tenant-1', 30.0, 120.0);
    expect(result).toBe(true);
  });
});
