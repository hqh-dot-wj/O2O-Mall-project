// @ts-nocheck
import { MemberReferralService } from './member-referral.service';
import { BusinessException } from 'src/common/exceptions';
import { MemberLevel } from '../member.constant';

// ── Mock Factories ──────────────────────────────────────────────

const createPrismaMock = () => ({
  umsMember: {
    findMany: jest.fn().mockResolvedValue([]),
  },
});

const createMemberRepoMock = () => ({
  findById: jest.fn(),
});

// ── Tests ───────────────────────────────────────────────────────

describe('MemberReferralService', () => {
  let service: MemberReferralService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let memberRepo: ReturnType<typeof createMemberRepoMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    memberRepo = createMemberRepoMock();
    service = new MemberReferralService(prisma, memberRepo);
  });

  // ── getBatchReferralInfo ────────────────────────────────────

  describe('getBatchReferralInfo', () => {
    // R-FLOW-REFERRAL-01: 返回 parentMap 和 indirectParentMap
    it('Given 会员列表含推荐人, When getBatchReferralInfo, Then 返回 parentMap 和 indirectParentMap', async () => {
      const list = [
        { memberId: 'M001', parentId: 'M002' },
        { memberId: 'M003', parentId: 'M002' },
      ];

      prisma.umsMember.findMany
        .mockResolvedValueOnce([
          { memberId: 'M002', nickname: '团长', mobile: '13900139000', parentId: 'M004' },
        ])
        .mockResolvedValueOnce([
          { memberId: 'M004', nickname: '股东', mobile: '13700137000' },
        ]);

      const result = await service.getBatchReferralInfo(list);

      expect(result.parentMap.get('M002')).toMatchObject({ nickname: '团长' });
      expect(result.indirectParentMap.get('M004')).toMatchObject({ nickname: '股东' });
      // 验证批量查询（避免 N+1）
      expect(prisma.umsMember.findMany).toHaveBeenCalledTimes(2);
    });

    // R-FLOW-REFERRAL-02: 空列表返回空 Map
    it('Given 无推荐人的列表, When getBatchReferralInfo, Then parentMap 为空', async () => {
      const list = [
        { memberId: 'M001', parentId: null },
        { memberId: 'M003', parentId: null },
      ];

      prisma.umsMember.findMany.mockResolvedValue([]);

      const result = await service.getBatchReferralInfo(list);

      expect(result.parentMap.size).toBe(0);
      expect(result.indirectParentMap.size).toBe(0);
    });
  });

  // ── validateAndGetIndirectParent ────────────────────────────

  describe('validateAndGetIndirectParent', () => {
    // R-PRE-MEMBER-03: 自引用抛出异常
    it('Given memberId=parentId, When validateAndGetIndirectParent, Then 抛出不可自引用', async () => {
      await expect(
        service.validateAndGetIndirectParent('M001', 'M001'),
      ).rejects.toThrow(BusinessException);
    });

    // R-PRE-MEMBER-02: 推荐人不存在
    it('Given 推荐人不存在, When validateAndGetIndirectParent, Then 抛出推荐人不存在', async () => {
      memberRepo.findById.mockResolvedValue(null);

      await expect(
        service.validateAndGetIndirectParent('M001', 'NOT_EXIST'),
      ).rejects.toThrow(BusinessException);
    });

    // R-PRE-MEMBER-04: 推荐人为普通会员（等级不足）
    it('Given 推荐人为普通会员, When validateAndGetIndirectParent, Then 抛出推荐人等级不足', async () => {
      memberRepo.findById.mockResolvedValue({
        memberId: 'M002',
        levelId: MemberLevel.MEMBER,
        parentId: null,
      });

      await expect(
        service.validateAndGetIndirectParent('M001', 'M002'),
      ).rejects.toThrow(BusinessException);
    });

    // R-FLOW-PARENT-01: 推荐人是 C1 时返回间接推荐人
    it('Given 推荐人是 C1 且有上级, When validateAndGetIndirectParent, Then 返回间接推荐人 ID', async () => {
      memberRepo.findById.mockResolvedValue({
        memberId: 'M002',
        levelId: MemberLevel.CAPTAIN,
        parentId: 'M003',
      });

      const result = await service.validateAndGetIndirectParent('M001', 'M002');

      expect(result).toBe('M003');
    });

    // R-FLOW-PARENT-02: 推荐人是 C2 时无间接推荐人
    it('Given 推荐人是 C2, When validateAndGetIndirectParent, Then 返回 null', async () => {
      memberRepo.findById.mockResolvedValue({
        memberId: 'M003',
        levelId: MemberLevel.SHAREHOLDER,
        parentId: null,
      });

      const result = await service.validateAndGetIndirectParent('M001', 'M003');

      expect(result).toBeNull();
    });

    // C1 无上级时间接推荐人为 null
    it('Given 推荐人是 C1 但无上级, When validateAndGetIndirectParent, Then 返回 null', async () => {
      memberRepo.findById.mockResolvedValue({
        memberId: 'M002',
        levelId: MemberLevel.CAPTAIN,
        parentId: null,
      });

      const result = await service.validateAndGetIndirectParent('M001', 'M002');

      expect(result).toBeNull();
    });

    // R-PRE-MEMBER-07: 循环推荐 A→B→A 检测
    it('Given B 的推荐人是 A, When 将 A 的推荐人设为 B, Then 抛出不能形成循环推荐', async () => {
      memberRepo.findById
        .mockResolvedValueOnce({ memberId: 'M002', levelId: MemberLevel.CAPTAIN, parentId: 'M001' }) // 校验推荐人
        .mockResolvedValueOnce({ memberId: 'M002', levelId: MemberLevel.CAPTAIN, parentId: 'M001' }); // 循环检测

      try {
        await service.validateAndGetIndirectParent('M001', 'M002');
        fail('应抛出 BusinessException');
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessException);
        expect(e.getResponse().msg).toBe('不能形成循环推荐');
      }
    });

    // 多级循环 A→B→C→A 检测
    it('Given C→B→A 链, When 将 A 的推荐人设为 C, Then 抛出不能形成循环推荐', async () => {
      memberRepo.findById
        .mockResolvedValueOnce({ memberId: 'M003', levelId: MemberLevel.CAPTAIN, parentId: 'M002' }) // 校验推荐人
        .mockResolvedValueOnce({ memberId: 'M003', levelId: MemberLevel.CAPTAIN, parentId: 'M002' }) // 循环检测: M003
        .mockResolvedValueOnce({ memberId: 'M002', levelId: MemberLevel.CAPTAIN, parentId: 'M001' }); // 循环检测: M002

      try {
        await service.validateAndGetIndirectParent('M001', 'M003');
        fail('应抛出 BusinessException');
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessException);
        expect(e.getResponse().msg).toBe('不能形成循环推荐');
      }
    });

    // parentId 为空时直接返回 null
    it('Given parentId 为空, When validateAndGetIndirectParent, Then 返回 null', async () => {
      const result = await service.validateAndGetIndirectParent('M001', '');

      expect(result).toBeNull();
      expect(memberRepo.findById).not.toHaveBeenCalled();
    });
  });
});
