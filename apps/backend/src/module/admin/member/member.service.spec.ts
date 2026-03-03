// @ts-nocheck
import { MemberService } from './member.service';
import { MemberRepository } from './member.repository';
import { MemberStatsService } from './services/member-stats.service';
import { MemberReferralService } from './services/member-referral.service';
import { MemberExportService } from './services/member-export.service';
import { PointsAccountService } from 'src/module/marketing/points/account/account.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { BusinessException } from 'src/common/exceptions';
import { MemberLevel, MemberStatus } from './member.constant';
import { ResponseCode } from 'src/common/response/response.interface';

// ── Mock Factories ──────────────────────────────────────────────

const createMemberRepoMock = () => ({
  findById: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
});

const createStatsServiceMock = () => ({
  getBatchStats: jest.fn().mockResolvedValue({
    consumptionMap: new Map(),
    commissionMap: new Map(),
  }),
});

const createReferralServiceMock = () => ({
  getBatchReferralInfo: jest.fn().mockResolvedValue({
    parentMap: new Map(),
    indirectParentMap: new Map(),
  }),
  validateAndGetIndirectParent: jest.fn(),
});

const createPointsServiceMock = () => ({
  addPoints: jest.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
  deductPoints: jest.fn().mockResolvedValue({ code: 200, msg: '操作成功' }),
  getTransactionsForAdmin: jest.fn().mockResolvedValue({
    code: 200,
    data: { rows: [], total: 0, pageNum: 1, pageSize: 10 },
  }),
});

const createExportServiceMock = () => ({
  export: jest.fn().mockResolvedValue(undefined),
});

const createPrismaMock = () => ({
  sysTenant: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
  },
});

// ── Test Data ───────────────────────────────────────────────────

const mockMember = {
  memberId: 'M001',
  nickname: '测试会员',
  avatar: 'https://example.com/avatar.png',
  mobile: '13800138000',
  status: MemberStatus.NORMAL,
  tenantId: 'T001',
  parentId: 'M002',
  indirectParentId: null,
  levelId: MemberLevel.MEMBER,
  balance: 100,
  createTime: new Date('2026-01-01'),
  updateTime: new Date('2026-01-01'),
};

const mockParent = {
  memberId: 'M002',
  nickname: '推荐人',
  mobile: '13900139000',
  tenantId: 'T001',
  parentId: 'M003',
  levelId: MemberLevel.CAPTAIN,
};

const mockShareholder = {
  memberId: 'M003',
  nickname: '股东',
  mobile: '13700137000',
  tenantId: 'T001',
  parentId: null,
  levelId: MemberLevel.SHAREHOLDER,
};

// ── Tests ───────────────────────────────────────────────────────

describe('MemberService', () => {
  let service: MemberService;
  let memberRepo: ReturnType<typeof createMemberRepoMock>;
  let statsService: ReturnType<typeof createStatsServiceMock>;
  let referralService: ReturnType<typeof createReferralServiceMock>;
  let pointsService: ReturnType<typeof createPointsServiceMock>;
  let exportService: ReturnType<typeof createExportServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    memberRepo = createMemberRepoMock();
    statsService = createStatsServiceMock();
    referralService = createReferralServiceMock();
    pointsService = createPointsServiceMock();
    exportService = createExportServiceMock();
    prisma = createPrismaMock();

    service = new MemberService(
      prisma as any,
      memberRepo as any,
      statsService as any,
      referralService as any,
      pointsService as any,
      exportService as any,
    );
  });

  // ── list ─────────────────────────────────────────────────────

  describe('list', () => {
    // R-FLOW-LIST-01: 有会员数据时返回分页结果含推荐人和统计数据
    it('Given 有会员数据, When list, Then 返回分页结果含推荐人和统计数据', async () => {
      memberRepo.count.mockResolvedValue(1);
      memberRepo.findMany.mockResolvedValue([mockMember]);
      referralService.getBatchReferralInfo.mockResolvedValue({
        parentMap: new Map([[mockParent.memberId, mockParent]]),
        indirectParentMap: new Map([[mockShareholder.memberId, mockShareholder]]),
      });
      statsService.getBatchStats.mockResolvedValue({
        consumptionMap: new Map([['M001', 500]]),
        commissionMap: new Map([['M001', 100]]),
      });
      prisma.sysTenant.findMany.mockResolvedValue([
        { tenantId: 'T001', companyName: '测试门店' },
      ]);

      const result = await TenantContext.run({ tenantId: '000000' }, () =>
        service.list({ pageNum: 1, pageSize: 10, skip: 0, take: 10 }),
      );

      expect(result.code).toBe(200);
      expect(result.data.rows).toHaveLength(1);
      const row = result.data.rows[0];
      expect(row.memberId).toBe('M001');
      expect(row.referrerId).toBe('M002');
      expect(row.referrerName).toBe('推荐人');
      expect(row.tenantName).toBe('测试门店');
      expect(row.totalConsumption).toBe(500);
      expect(row.commission).toBe(100);
    });

    // R-FLOW-LIST-02: 空列表时返回空分页
    it('Given 空列表, When list, Then 返回空分页', async () => {
      memberRepo.count.mockResolvedValue(0);
      memberRepo.findMany.mockResolvedValue([]);

      const result = await TenantContext.run({ tenantId: '000000' }, () =>
        service.list({ pageNum: 1, pageSize: 10, skip: 0, take: 10 }),
      );

      expect(result.code).toBe(200);
      expect(result.data.rows).toHaveLength(0);
      expect(result.data.total).toBe(0);
      // 空列表不应调用子服务
      expect(referralService.getBatchReferralInfo).not.toHaveBeenCalled();
      expect(statsService.getBatchStats).not.toHaveBeenCalled();
    });

    // R-FLOW-LIST-03: 非超管租户仅返回本租户数据
    it('Given 非超管租户, When list, Then where 条件包含 tenantId', async () => {
      memberRepo.count.mockResolvedValue(0);
      memberRepo.findMany.mockResolvedValue([]);

      await TenantContext.run({ tenantId: 'T001' }, () =>
        service.list({ pageNum: 1, pageSize: 10, skip: 0, take: 10 }),
      );

      // count 和 findMany 的 where 应包含 tenantId
      const countWhere = memberRepo.count.mock.calls[0][0];
      expect(countWhere.tenantId).toBe('T001');
    });
  });

  // ── detail ────────────────────────────────────────────────────

  describe('detail', () => {
    // R-FLOW-DETAIL-01: 会员存在时返回详情 VO
    it('Given 会员存在, When detail, Then 返回完整 VO', async () => {
      memberRepo.findById.mockResolvedValue(mockMember);
      referralService.getBatchReferralInfo.mockResolvedValue({
        parentMap: new Map([[mockParent.memberId, mockParent]]),
        indirectParentMap: new Map([[mockShareholder.memberId, mockShareholder]]),
      });
      statsService.getBatchStats.mockResolvedValue({
        consumptionMap: new Map([['M001', 500]]),
        commissionMap: new Map([['M001', 100]]),
      });
      prisma.sysTenant.findMany.mockResolvedValue([
        { tenantId: 'T001', companyName: '测试门店' },
      ]);

      const result = await service.detail('M001');

      expect(result.code).toBe(200);
      expect(result.data.memberId).toBe('M001');
      expect(result.data.nickname).toBe('测试会员');
      expect(result.data.referrerId).toBe('M002');
      expect(result.data.referrerName).toBe('推荐人');
      expect(result.data.tenantName).toBe('测试门店');
      expect(result.data.totalConsumption).toBe(500);
      expect(result.data.commission).toBe(100);
      expect(result.data.levelName).toBe('普通会员');
    });

    // R-PRE-DETAIL-01: 会员不存在时抛出异常
    it('Given 会员不存在, When detail, Then 抛出会员不存在', async () => {
      memberRepo.findById.mockResolvedValue(null);

      await expect(service.detail('NOT_EXIST')).rejects.toThrow(BusinessException);
    });

    // 无推荐人时推荐人字段为 undefined
    it('Given 会员无推荐人, When detail, Then 推荐人字段为 undefined', async () => {
      memberRepo.findById.mockResolvedValue({ ...mockMember, parentId: null, indirectParentId: null });
      referralService.getBatchReferralInfo.mockResolvedValue({
        parentMap: new Map(),
        indirectParentMap: new Map(),
      });
      prisma.sysTenant.findMany.mockResolvedValue([]);

      const result = await service.detail('M001');

      expect(result.code).toBe(200);
      expect(result.data.referrerId).toBeUndefined();
      expect(result.data.referrerName).toBeUndefined();
      expect(result.data.indirectReferrerId).toBeUndefined();
    });
  });

  // ── updateLevel ──────────────────────────────────────────────

  describe('updateLevel', () => {
    // R-FLOW-LEVEL-01: 升级到 C2 重置推荐关系
    it('Given 会员存在, When updateLevel to C2, Then 重置推荐关系', async () => {
      memberRepo.findById.mockResolvedValue({ ...mockMember, parentId: 'M002', indirectParentId: 'M003' });

      const result = await service.updateLevel({ memberId: 'M001', levelId: MemberLevel.SHAREHOLDER });

      expect(result.code).toBe(200);
      const updateCall = memberRepo.update.mock.calls[0];
      expect(updateCall[0]).toBe('M001');
      expect(updateCall[1]).toMatchObject({
        levelId: MemberLevel.SHAREHOLDER,
        parentId: null,
        indirectParentId: null,
      });
    });

    // R-FLOW-LEVEL-02: 升级到 C1 且跨店推荐时重置推荐关系
    it('Given 会员存在且有跨店推荐, When updateLevel to C1, Then 重置推荐关系', async () => {
      memberRepo.findById
        .mockResolvedValueOnce({ ...mockMember, parentId: 'M002', tenantId: 'T001' }) // member
        .mockResolvedValueOnce({ ...mockParent, tenantId: 'T002' }); // parent (不同租户)

      const result = await service.updateLevel({ memberId: 'M001', levelId: MemberLevel.CAPTAIN });

      expect(result.code).toBe(200);
      const updateCall = memberRepo.update.mock.calls[0];
      expect(updateCall[1]).toMatchObject({
        levelId: MemberLevel.CAPTAIN,
        parentId: null,
        indirectParentId: null,
      });
    });

    // R-FLOW-LEVEL-03: 升级到 C1 且同店推荐时保持推荐关系
    it('Given 会员存在且同店推荐, When updateLevel to C1, Then 保持推荐关系', async () => {
      memberRepo.findById
        .mockResolvedValueOnce({ ...mockMember, parentId: 'M002', tenantId: 'T001' }) // member
        .mockResolvedValueOnce({ ...mockParent, tenantId: 'T001' }); // parent (同租户)

      const result = await service.updateLevel({ memberId: 'M001', levelId: MemberLevel.CAPTAIN });

      expect(result.code).toBe(200);
      const updateCall = memberRepo.update.mock.calls[0];
      expect(updateCall[1]).toEqual({ levelId: MemberLevel.CAPTAIN });
    });

    // R-FLOW-LEVEL-04: 降级不处理推荐关系
    it('Given 会员存在, When updateLevel 降级到普通, Then 不处理推荐关系', async () => {
      memberRepo.findById.mockResolvedValue({ ...mockMember, levelId: MemberLevel.CAPTAIN });

      const result = await service.updateLevel({ memberId: 'M001', levelId: MemberLevel.MEMBER });

      expect(result.code).toBe(200);
      const updateCall = memberRepo.update.mock.calls[0];
      expect(updateCall[1]).toEqual({ levelId: MemberLevel.MEMBER });
    });

    // R-PRE-MEMBER-01: 会员不存在时抛出异常
    it('Given 会员不存在, When updateLevel, Then 抛出会员不存在', async () => {
      memberRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateLevel({ memberId: 'NOT_EXIST', levelId: MemberLevel.CAPTAIN }),
      ).rejects.toThrow(BusinessException);
    });
  });

  // ── updateParent ─────────────────────────────────────────────

  describe('updateParent', () => {
    // R-FLOW-PARENT-01: 合法推荐人(C1)时更新含间接推荐人
    it('Given 合法推荐人(C1), When updateParent, Then 更新推荐关系含间接推荐人', async () => {
      referralService.validateAndGetIndirectParent.mockResolvedValue('M003');

      const result = await service.updateParent({ memberId: 'M001', referrerId: 'M002' });

      expect(result.code).toBe(200);
      expect(memberRepo.update).toHaveBeenCalledWith('M001', {
        parentId: 'M002',
        indirectParentId: 'M003',
      });
    });

    // R-FLOW-PARENT-02: 合法推荐人(C2)时更新无间接推荐人
    it('Given 合法推荐人(C2), When updateParent, Then 更新推荐关系无间接推荐人', async () => {
      referralService.validateAndGetIndirectParent.mockResolvedValue(null);

      const result = await service.updateParent({ memberId: 'M001', referrerId: 'M003' });

      expect(result.code).toBe(200);
      expect(memberRepo.update).toHaveBeenCalledWith('M001', {
        parentId: 'M003',
        indirectParentId: null,
      });
    });

    // R-PRE-MEMBER-03: 自引用时抛出异常（由 referralService 抛出）
    it('Given memberId=referrerId, When updateParent, Then 抛出不可自引用', async () => {
      referralService.validateAndGetIndirectParent.mockRejectedValue(
        new BusinessException(ResponseCode.BUSINESS_ERROR, '不可将自己设为推荐人'),
      );

      await expect(
        service.updateParent({ memberId: 'M001', referrerId: 'M001' }),
      ).rejects.toThrow(BusinessException);
    });

    // R-PRE-MEMBER-02: 推荐人不存在时抛出异常
    it('Given 推荐人不存在, When updateParent, Then 抛出推荐人不存在', async () => {
      referralService.validateAndGetIndirectParent.mockRejectedValue(
        new BusinessException(ResponseCode.DATA_NOT_FOUND, '推荐人不存在'),
      );

      await expect(
        service.updateParent({ memberId: 'M001', referrerId: 'NOT_EXIST' }),
      ).rejects.toThrow(BusinessException);
    });
  });

  // ── updateTenant ─────────────────────────────────────────────

  describe('updateTenant', () => {
    // R-FLOW-TENANT-01: 租户存在时更新成功
    it('Given 租户存在, When updateTenant, Then 更新成功', async () => {
      prisma.sysTenant.findUnique.mockResolvedValue({ tenantId: 'T002', companyName: '新门店' });

      const result = await service.updateTenant({ memberId: 'M001', tenantId: 'T002' });

      expect(result.code).toBe(200);
      expect(memberRepo.update).toHaveBeenCalledWith('M001', { tenantId: 'T002' });
    });

    // R-PRE-MEMBER-05: 租户不存在时抛出异常
    it('Given 租户不存在, When updateTenant, Then 抛出目标租户不存在', async () => {
      prisma.sysTenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTenant({ memberId: 'M001', tenantId: 'NOT_EXIST' }),
      ).rejects.toThrow(BusinessException);
    });
  });

  // ── updateStatus ─────────────────────────────────────────────

  describe('updateStatus', () => {
    // R-FLOW-STATUS-01: status='0' 设为 NORMAL
    it('Given status=0, When updateStatus, Then 设为 NORMAL', async () => {
      const result = await service.updateStatus({ memberId: 'M001', status: '0' });

      expect(result.code).toBe(200);
      expect(memberRepo.update).toHaveBeenCalledWith('M001', { status: MemberStatus.NORMAL });
    });

    // R-FLOW-STATUS-02: status='1' 设为 DISABLED
    it('Given status=1, When updateStatus, Then 设为 DISABLED', async () => {
      const result = await service.updateStatus({ memberId: 'M001', status: '1' });

      expect(result.code).toBe(200);
      expect(memberRepo.update).toHaveBeenCalledWith('M001', { status: MemberStatus.DISABLED });
    });
  });

  // ── adjustMemberPoints ───────────────────────────────────────

  describe('adjustMemberPoints', () => {
    // R-FLOW-POINTS-01: amount>0 调用 addPoints
    it('Given amount>0, When adjustMemberPoints, Then 调用 addPoints', async () => {
      const result = await service.adjustMemberPoints({ memberId: 'M001', amount: 100, remark: '奖励' });

      expect(result.code).toBe(200);
      expect(pointsService.addPoints).toHaveBeenCalledWith({
        memberId: 'M001',
        amount: 100,
        type: 'EARN_ADMIN',
        remark: '奖励',
      });
      expect(pointsService.deductPoints).not.toHaveBeenCalled();
    });

    // R-FLOW-POINTS-02: amount<0 调用 deductPoints
    it('Given amount<0, When adjustMemberPoints, Then 调用 deductPoints', async () => {
      const result = await service.adjustMemberPoints({ memberId: 'M001', amount: -50, remark: '扣减' });

      expect(result.code).toBe(200);
      expect(pointsService.deductPoints).toHaveBeenCalledWith({
        memberId: 'M001',
        amount: 50,
        type: 'DEDUCT_ADMIN',
        remark: '扣减',
      });
      expect(pointsService.addPoints).not.toHaveBeenCalled();
    });

    // R-PRE-MEMBER-06: amount=0 抛出异常
    it('Given amount=0, When adjustMemberPoints, Then 抛出变动积分不能为 0', async () => {
      await expect(
        service.adjustMemberPoints({ memberId: 'M001', amount: 0 }),
      ).rejects.toThrow(BusinessException);
    });

    // 默认 remark
    it('Given 无 remark, When adjustMemberPoints, Then 使用默认备注', async () => {
      await service.adjustMemberPoints({ memberId: 'M001', amount: 10 });

      expect(pointsService.addPoints).toHaveBeenCalledWith(
        expect.objectContaining({ remark: '管理员调整' }),
      );
    });
  });

  // ── getPointHistory ──────────────────────────────────────────

  describe('getPointHistory', () => {
    // R-FLOW-HISTORY-01: 返回分页积分记录
    it('Given memberId, When getPointHistory, Then 返回分页积分记录', async () => {
      pointsService.getTransactionsForAdmin.mockResolvedValue({
        code: 200,
        data: {
          rows: [
            {
              id: '1',
              memberId: 'M001',
              amount: 100,
              balanceAfter: 200,
              type: 'EARN_ADMIN',
              remark: '管理员调整',
              createTime: new Date('2026-01-15'),
            },
          ],
          total: 1,
          pageNum: 1,
          pageSize: 10,
        },
      });

      const result = await service.getPointHistory({ memberId: 'M001', pageNum: 1, pageSize: 10 });

      expect(result.code).toBe(200);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].changePoints).toBe(100);
      expect(result.data.rows[0].afterPoints).toBe(200);
      expect(result.data.total).toBe(1);
    });

    // 空记录
    it('Given 无积分记录, When getPointHistory, Then 返回空结果', async () => {
      pointsService.getTransactionsForAdmin.mockResolvedValue({
        code: 200,
        data: { rows: [], total: 0, pageNum: 1, pageSize: 10 },
      });

      const result = await service.getPointHistory({ memberId: 'M001' });

      expect(result.code).toBe(200);
      expect(result.data.rows).toHaveLength(0);
    });
  });

  // ── export ───────────────────────────────────────────────────

  describe('export', () => {
    const mockRes = {} as any;

    // R-FLOW-EXPORT-01: 有会员数据时调用 exportService 导出
    it('Given 有会员数据, When export, Then 调用 exportService.export 并传入 rows', async () => {
      memberRepo.count.mockResolvedValue(1);
      memberRepo.findMany.mockResolvedValue([mockMember]);
      referralService.getBatchReferralInfo.mockResolvedValue({
        parentMap: new Map([[mockParent.memberId, mockParent]]),
        indirectParentMap: new Map(),
      });
      prisma.sysTenant.findMany.mockResolvedValue([]);

      await TenantContext.run({ tenantId: '000000' }, () =>
        service.export(mockRes, { pageNum: 1, pageSize: 10, skip: 0, take: 10 }),
      );

      expect(exportService.export).toHaveBeenCalledTimes(1);
      const [res, rows] = exportService.export.mock.calls[0];
      expect(res).toBe(mockRes);
      expect(rows).toHaveLength(1);
      expect(rows[0].memberId).toBe('M001');
    });

    // R-FLOW-EXPORT-02: 空数据时调用 exportService 传入空数组
    it('Given 空数据, When export, Then 调用 exportService.export 传入空数组', async () => {
      memberRepo.count.mockResolvedValue(0);
      memberRepo.findMany.mockResolvedValue([]);

      await TenantContext.run({ tenantId: '000000' }, () =>
        service.export(mockRes, { pageNum: 1, pageSize: 10, skip: 0, take: 10 }),
      );

      expect(exportService.export).toHaveBeenCalledWith(mockRes, []);
    });
  });
});
