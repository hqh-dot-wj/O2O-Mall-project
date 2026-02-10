import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MemberVo } from './vo/member.vo';
import { Result } from 'src/common/response';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { Prisma } from '@prisma/client';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/response/response.interface';
import { FormatDateFields } from 'src/common/utils';
import { PointsAccountService } from 'src/module/marketing/points/account/account.service';
import { MemberRepository } from './member.repository';
import { MemberStatsService } from './services/member-stats.service';
import { MemberReferralService } from './services/member-referral.service';
import {
  ListMemberDto,
  UpdateMemberStatusDto,
  UpdateMemberLevelDto,
  UpdateReferrerDto,
  UpdateMemberTenantDto,
  PointHistoryQueryDto,
  AdjustMemberPointsDto,
} from './dto';
import { MemberLevel, MemberLevelNameMap, MemberStatus, MemberStatusMap } from './member.constant';

/**
 * 会员管理服务 (Member Service)
 * 作为门面层 (Facade) 协调各子服务处理会员基础信息、统计及推荐关系
 */
@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberRepo: MemberRepository,
    private readonly memberStatsService: MemberStatsService,
    private readonly memberReferralService: MemberReferralService,
    private readonly pointsAccountService: PointsAccountService,
  ) {}

  /**
   * 分页查询会员列表
   * 聚合上级信息、间接上级信息以及消费/佣金统计数据
   * @param query 查询参数
   */
  async list(query: ListMemberDto) {
    const where: Prisma.UmsMemberWhereInput = {};

    // 租户过滤 (数据隔离)
    const tenantId = TenantContext.getTenantId();
    if (tenantId && tenantId !== TenantContext.SUPER_TENANT_ID) {
      where.tenantId = tenantId;
    }

    if (query.nickname) {
      where.nickname = { contains: query.nickname };
    }
    if (query.mobile) {
      where.mobile = { contains: query.mobile };
    }

    // 1. 查询基础会员列表
    const [total, list] = await Promise.all([
      this.memberRepo.count(where),
      this.memberRepo.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createTime: 'desc' },
      }),
    ]);

    if (list.length === 0) return Result.page([], total);

    // 2. 批量获取关联数据 (子服务处理)
    const memberIds = list.map((m: any) => m.memberId);
    const [referralInfo, stats, tenantMap] = await Promise.all([
      this.memberReferralService.getBatchReferralInfo(list),
      this.memberStatsService.getBatchStats(memberIds),
      this.getTenantMap(list),
    ]);

    // 3. 组装 VO (View Object)
    const rows: MemberVo[] = list.map((item: any) => {
      const parent = item.parentId ? referralInfo.parentMap.get(item.parentId) : null;
      const indirectParentId = item.indirectParentId || parent?.parentId;
      const indirectParent = indirectParentId ? referralInfo.indirectParentMap.get(indirectParentId) : null;

      return {
        memberId: item.memberId,
        nickname: item.nickname,
        avatar: item.avatar,
        mobile: item.mobile,
        status: MemberStatusMap[item.status as MemberStatus] || '0',
        createTime: item.createTime,
        tenantId: item.tenantId,
        tenantName: tenantMap.get(item.tenantId) || '平台',
        referrerId: item.parentId || undefined,
        referrerName: parent?.nickname,
        referrerMobile: parent?.mobile,
        indirectReferrerId: indirectParentId || undefined,
        indirectReferrerName: indirectParent?.nickname,
        indirectReferrerMobile: indirectParent?.mobile,
        balance: Number(item.balance),
        commission: Number(stats.commissionMap.get(item.memberId) || 0),
        totalConsumption: Number(stats.consumptionMap.get(item.memberId) || 0),
        orderCount: 0, // 预留字段
        levelId: item.levelId,
        levelName: MemberLevelNameMap[item.levelId as MemberLevel] || '未知',
      };
    });

    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 获取租户 ID 到名称的映射
   */
  private async getTenantMap(list: any[]) {
    const tenantIds = [...new Set(list.map((item) => item.tenantId).filter((id) => id !== '000000'))];
    const tenants = await this.prisma.sysTenant.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { tenantId: true, companyName: true },
    });
    return new Map(tenants.map((t) => [t.tenantId, t.companyName]));
  }

  /**
   * 更新会员等级
   * 包含 C1/C2 级推荐关系重置逻辑
   */
  @Transactional()
  async updateLevel(dto: UpdateMemberLevelDto) {
    const { memberId, levelId } = dto;
    const member = await this.memberRepo.findById(memberId);
    BusinessException.throwIfNull(member, '会员不存在');

    const updateData: Prisma.UmsMemberUpdateInput = { levelId };

    // 升级规则：
    // - 升级到 C2 (股东)：重置所有推荐关系 (股东为顶级)
    if (levelId === MemberLevel.SHAREHOLDER) {
      Object.assign(updateData, { parentId: null, indirectParentId: null });
    }
    // - 升级到 C1 (团长)：如果存在跨店推荐，则重置关系
    else if (levelId === MemberLevel.CAPTAIN && member.parentId) {
      const parent = await this.memberRepo.findById(member.parentId);
      if (parent && parent.tenantId !== member.tenantId) {
        Object.assign(updateData, { parentId: null, indirectParentId: null });
      }
    }

    await this.memberRepo.update(memberId, updateData);
    return Result.ok(null, '等级调整成功');
  }

  /**
   * 手动更新会员推荐人 (C1/C2)
   */
  @Transactional()
  async updateParent(dto: UpdateReferrerDto) {
    const { memberId, referrerId } = dto;

    // 校验并计算间接推荐人 (由子服务处理)
    const indirectParentId = await this.memberReferralService.validateAndGetIndirectParent(memberId, referrerId);

    await this.memberRepo.update(memberId, {
      parentId: referrerId || null,
      indirectParentId: indirectParentId || null,
    } as any);

    return Result.ok(null, '推荐关系更新成功');
  }

  /**
   * 变更会员所属租户 (归属门店)
   */
  async updateTenant(dto: UpdateMemberTenantDto) {
    const { memberId, tenantId } = dto;
    const tenant = await this.prisma.sysTenant.findUnique({ where: { tenantId } });
    BusinessException.throwIfNull(tenant, '目标租户不存在');

    await this.memberRepo.update(memberId, { tenantId });
    return Result.ok(null, '租户变更成功');
  }

  /**
   * 更新会员账户状态
   */
  async updateStatus(dto: UpdateMemberStatusDto) {
    const { memberId, status } = dto;
    const dbStatus = status === '0' ? MemberStatus.NORMAL : MemberStatus.DISABLED;

    await this.memberRepo.update(memberId, { status: dbStatus });
    return Result.ok(null, '状态更新成功');
  }

  /**
   * 分页查询会员积分变动记录（管理端）
   */
  async getPointHistory(query: PointHistoryQueryDto) {
    const result = await this.pointsAccountService.getTransactionsForAdmin({
      memberId: query.memberId,
      pageNum: query.pageNum ?? 1,
      pageSize: query.pageSize ?? 10,
    });
    if (!result.data?.rows) return result;
    const total = result.data.total;
    const pageNumRes = result.data.pageNum ?? 1;
    const pageSizeRes = result.data.pageSize ?? 10;
    const rows = (result.data.rows as any[]).map((row) => ({
      id: row.id,
      memberId: row.memberId,
      changePoints: row.amount,
      afterPoints: row.balanceAfter,
      type: row.type,
      typeName: row.type,
      remark: row.remark,
      createTime: row.createTime,
    }));
    return Result.page(FormatDateFields(rows), total, pageNumRes, pageSizeRes);
  }

  /**
   * 管理员调整会员积分（增加或扣减）
   */
  async adjustMemberPoints(dto: AdjustMemberPointsDto) {
    const { memberId, amount, remark } = dto;
    BusinessException.throwIf(amount === 0, '变动积分不能为 0', ResponseCode.PARAM_INVALID);

    if (amount > 0) {
      return this.pointsAccountService.addPoints({
        memberId,
        amount,
        type: 'EARN_ADMIN',
        remark: remark ?? '管理员调整',
      });
    }
    return this.pointsAccountService.deductPoints({
      memberId,
      amount: Math.abs(amount),
      type: 'DEDUCT_ADMIN',
      remark: remark ?? '管理员调整',
    });
  }
}
