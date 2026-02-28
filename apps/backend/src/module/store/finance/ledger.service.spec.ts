import { Test, TestingModule } from '@nestjs/testing';
import { StoreLedgerService } from './ledger.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response';
import { ListLedgerDto } from './dto/store-finance.dto';

describe('StoreLedgerService', () => {
  let service: StoreLedgerService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreLedgerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StoreLedgerService>(StoreLedgerService);
    prismaService = module.get<PrismaService>(PrismaService);

    // 清除所有 mock
    jest.clearAllMocks();
  });

  describe('getLedger - T-1: 深分页保护', () => {
    it('应该在 offset > 5000 时抛出错误', async () => {
      // Arrange
      const query = new ListLedgerDto();
      query.pageNum = 501; // skip = (501 - 1) * 10 = 5000
      query.pageSize = 11; // skip = 5000 + 11 = 5011

      // Mock TenantContext
      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      // Act & Assert
      await expect(service.getLedger(query)).rejects.toThrow();
    });

    it('应该在 offset = 5000 时正常执行', async () => {
      // Arrange
      const query = new ListLedgerDto();
      query.pageNum = 501; // skip = (501 - 1) * 10 = 5000
      query.pageSize = 10;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      mockPrismaService.$queryRaw.mockResolvedValueOnce([]); // 主查询
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 0 }]); // COUNT 查询

      // Act
      const result = await service.getLedger(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(200);
    });

    it('应该在 offset < 5000 时正常执行', async () => {
      // Arrange
      const query = new ListLedgerDto();
      query.pageNum = 1;
      query.pageSize = 10;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      mockPrismaService.$queryRaw.mockResolvedValueOnce([]); // 主查询
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 0 }]); // COUNT 查询

      // Act
      const result = await service.getLedger(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(200);
    });
  });

  describe('exportLedger - T-2: 导出数量限制', () => {
    it('应该在导出数据量 > 10000 时抛出错误', async () => {
      // Arrange
      const query = new ListLedgerDto();
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      // Mock COUNT 查询返回 10001 条
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: '10001' }]);

      // Act & Assert
      await expect(service.exportLedger(mockResponse, query)).rejects.toThrow();
    });

    it('应该在导出数据量 = 10000 时正常执行', async () => {
      // Arrange
      const query = new ListLedgerDto();
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      // Mock COUNT 查询返回 10000 条
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 10000 }]);
      // Mock 主查询
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      // Act
      await service.exportLedger(mockResponse, query);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalled();
    });

    it('应该在导出数据量 < 10000 时正常执行', async () => {
      // Arrange
      const query = new ListLedgerDto();
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as any;

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      // Mock COUNT 查询返回 100 条
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ total: 100 }]);
      // Mock 主查询
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      // Act
      await service.exportLedger(mockResponse, query);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalled();
    });
  });

  describe('getLedgerStats - T-3: 排除已取消佣金', () => {
    it('应该在统计查询中排除 CANCELLED 状态的佣金', async () => {
      // Arrange
      const query = new ListLedgerDto();

      jest.spyOn(TenantContext, 'getTenantId').mockReturnValue('tenant-1');
      jest.spyOn(TenantContext, 'isSuperTenant').mockReturnValue(false);

      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { type: 'ORDER_INCOME', total: 1000 },
        { type: 'COMMISSION_IN', total: 100 },
      ]);

      // Act
      const result = await service.getLedgerStats(query);

      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(200);
      // 验证 SQL 中包含 status != 'CANCELLED' 条件
      const sqlCall = mockPrismaService.$queryRaw.mock.calls[0][0];
      expect(sqlCall.sql).toContain("status != 'CANCELLED'");
    });
  });
});
