import { Test, TestingModule } from '@nestjs/testing';
import { MemberQueryAdapter } from './member-query.adapter';
import { PrismaService } from 'src/prisma/prisma.service';

describe('MemberQueryAdapter', () => {
  let adapter: MemberQueryAdapter;

  const mockPrismaService = {
    umsMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberQueryAdapter,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    adapter = module.get<MemberQueryAdapter>(MemberQueryAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findMemberForCommission', () => {
    // R-FLOW-MQA-01: 正常获取会员信息
    it('Given 存在的会员ID, When findMemberForCommission, Then 返回会员信息', async () => {
      const mockMember = {
        memberId: 'member1',
        tenantId: 'tenant1',
        parentId: 'parent1',
        indirectParentId: 'indirect1',
        levelId: 2,
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(mockMember);

      const result = await adapter.findMemberForCommission('member1');

      expect(result).not.toBeNull();
      expect(result?.memberId).toBe('member1');
      expect(result?.parentId).toBe('parent1');
      expect(result?.levelId).toBe(2);
    });

    // R-FLOW-MQA-02: 会员不存在返回 null
    it('Given 不存在的会员ID, When findMemberForCommission, Then 返回 null', async () => {
      mockPrismaService.umsMember.findUnique.mockResolvedValue(null);

      const result = await adapter.findMemberForCommission('nonexistent');

      expect(result).toBeNull();
    });

    // R-FLOW-MQA-03: levelId 为 null 时返回 0
    it('Given levelId为null的会员, When findMemberForCommission, Then levelId返回0', async () => {
      const mockMember = {
        memberId: 'member1',
        tenantId: 'tenant1',
        parentId: null,
        indirectParentId: null,
        levelId: null,
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(mockMember);

      const result = await adapter.findMemberForCommission('member1');

      expect(result?.levelId).toBe(0);
    });
  });

  describe('findMemberBrief', () => {
    // R-FLOW-MQA-04: 获取会员简要信息
    it('Given 存在的会员ID, When findMemberBrief, Then 返回简要信息', async () => {
      const mockMember = {
        memberId: 'member1',
        tenantId: 'tenant1',
        levelId: 1,
        parentId: 'parent1',
        nickname: '测试用户',
      };

      mockPrismaService.umsMember.findUnique.mockResolvedValue(mockMember);

      const result = await adapter.findMemberBrief('member1');

      expect(result).not.toBeNull();
      expect(result?.nickname).toBe('测试用户');
    });
  });

  describe('findMembersBrief', () => {
    // R-FLOW-MQA-05: 批量获取会员信息
    it('Given 多个会员ID, When findMembersBrief, Then 返回会员Map', async () => {
      const mockMembers = [
        { memberId: 'member1', tenantId: 'tenant1', levelId: 1, parentId: null },
        { memberId: 'member2', tenantId: 'tenant1', levelId: 2, parentId: 'member1' },
      ];

      mockPrismaService.umsMember.findMany.mockResolvedValue(mockMembers);

      const result = await adapter.findMembersBrief(['member1', 'member2']);

      expect(result.size).toBe(2);
      expect(result.get('member1')?.levelId).toBe(1);
      expect(result.get('member2')?.parentId).toBe('member1');
    });

    // R-FLOW-MQA-06: 空数组返回空Map
    it('Given 空数组, When findMembersBrief, Then 返回空Map', async () => {
      const result = await adapter.findMembersBrief([]);

      expect(result.size).toBe(0);
      expect(mockPrismaService.umsMember.findMany).not.toHaveBeenCalled();
    });
  });

  describe('checkCircularReferral', () => {
    // R-FLOW-MQA-07: 检测到循环推荐
    it('Given 存在循环推荐, When checkCircularReferral, Then 返回 true', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ parentId: 'member3' })
        .mockResolvedValueOnce({ parentId: 'member1' }); // 循环回到 member1

      const result = await adapter.checkCircularReferral('member1', 'member2');

      expect(result).toBe(true);
    });

    // R-FLOW-MQA-08: 无循环推荐
    it('Given 不存在循环推荐, When checkCircularReferral, Then 返回 false', async () => {
      mockPrismaService.umsMember.findUnique
        .mockResolvedValueOnce({ parentId: 'member3' })
        .mockResolvedValueOnce({ parentId: null }); // 链条终止

      const result = await adapter.checkCircularReferral('member1', 'member2');

      expect(result).toBe(false);
    });

    // R-FLOW-MQA-09: 达到最大深度
    it('Given 链条超过最大深度, When checkCircularReferral, Then 返回 false', async () => {
      // 模拟 10 层深度都有上级
      for (let i = 0; i < 10; i++) {
        mockPrismaService.umsMember.findUnique.mockResolvedValueOnce({
          parentId: `member${i + 3}`,
        });
      }

      const result = await adapter.checkCircularReferral('member1', 'member2');

      expect(result).toBe(false);
    });
  });
});
