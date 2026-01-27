import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { FormatDateFields } from 'src/common/utils';
import { ListUpgradeApplyDto, ApproveUpgradeDto, ManualLevelDto } from './dto/upgrade.dto';
import { Prisma } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { UpgradeApplyRepository } from './upgrade-apply.repository';
import { UpgradeReferralService } from './services/upgrade-referral.service';
import { MemberLevel, MemberLevelNameMap } from '../member/member.constant';
import { UpgradeApplyVo, UpgradeStatsVo } from './vo/upgrade.vo';

/**
 * 管理端升级审批服务 (Admin Upgrade Service)
 * 门面层服务，协调审批流、等级变动及推荐码生成
 */
@Injectable()
export class AdminUpgradeService {
  private readonly logger = new Logger(AdminUpgradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly upgradeRepo: UpgradeApplyRepository,
    private readonly referralService: UpgradeReferralService,
  ) { }

  /**
   * 查询升级申请列表
   * @param query 查询参数
   */
  async findAll(query: ListUpgradeApplyDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.UmsUpgradeApplyWhereInput = {};
    // 租户隔离: 非超级管理员只能查看本租户数据
    if (!isSuper) where.tenantId = tenantId;

    if (query.memberId) where.memberId = query.memberId;
    if (query.status) where.status = query.status;
    if (query.applyType) where.applyType = query.applyType;

    const dateRange = query.getDateRange('createTime');
    if (dateRange) Object.assign(where, dateRange);

    // 1. 获取申请记录
    const [list, total] = await Promise.all([
      this.upgradeRepo.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createTime: 'desc' },
      }),
      this.upgradeRepo.count(where),
    ]);

    if (list.length === 0) return Result.page([], total);

    // 2. 批量填充会员信息
    const memberIds = [...new Set(list.map((a) => a.memberId))];
    const members = await this.prisma.umsMember.findMany({
      where: { memberId: { in: memberIds } },
      select: { memberId: true, nickname: true, mobile: true, avatar: true },
    });
    const memberMap = new Map(members.map((m) => [m.memberId, m]));

    // 3. 组装 VO
    const rows: UpgradeApplyVo[] = list.map((item) => ({
      ...item,
      member: memberMap.get(item.memberId) || undefined,
      fromLevelName: MemberLevelNameMap[item.fromLevel as MemberLevel] || `等级${item.fromLevel}`,
      toLevelName: MemberLevelNameMap[item.toLevel as MemberLevel] || `等级${item.toLevel}`,
    }));

    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 审批升级申请
   * @param applyId 申请记录 ID
   * @param dto 审批操作
   * @param operatorId 操作人 ID
   */
  @Transactional()
  async approve(applyId: string, dto: ApproveUpgradeDto, operatorId: string) {
    const apply = await this.upgradeRepo.findById(applyId);
    BusinessException.throwIfNull(apply, '申请不存在');
    BusinessException.throwIf(apply!.status !== 'PENDING', '该申请已处理');

    const client = this.prisma; // 获取事务客户端 (由 @Transactional 自动管理)

    if (dto.action === 'approve') {
      // 1. 更新申请状态为已通过
      await client.umsUpgradeApply.update({
        where: { id: applyId },
        data: { status: 'APPROVED' },
      });

      // 2. 执行会员等级变更
      await client.umsMember.update({
        where: { memberId: apply!.memberId },
        data: {
          levelId: apply!.toLevel,
          upgradedAt: new Date(),
          upgradeOrderId: apply!.orderId || null,
        },
      });

      // 3. 特殊逻辑: 升级到 C2 (股东) 时自动生成推荐码
      if (apply!.toLevel === MemberLevel.SHAREHOLDER) {
        await this.referralService.generateAndBindCode(client, apply!.memberId, apply!.tenantId);
      }

      this.logger.log(`审批通过: 申请 ${applyId}, 会员 ${apply!.memberId}, 等级 ${apply!.fromLevel}->${apply!.toLevel}, 操作人 ${operatorId}`);
      return Result.ok(null, '审批通过');
    } else {
      // 驳回逻辑
      await client.umsUpgradeApply.update({
        where: { id: applyId },
        data: { status: 'REJECTED' },
      });

      this.logger.log(`审批驳回: 申请 ${applyId}, 原因: ${dto.reason || '未填写'}, 操作人 ${operatorId}`);
      return Result.ok(null, '已驳回');
    }
  }

  /**
   * 手动调整会员等级
   * @param memberId 会员 ID
   * @param dto 目标等级
   * @param operatorId 操作人 ID
   */
  @Transactional()
  async manualLevel(memberId: string, dto: ManualLevelDto, operatorId: string) {
    const tenantId = TenantContext.getTenantId();
    const member = await this.prisma.umsMember.findUnique({ where: { memberId } });

    BusinessException.throwIfNull(member, '会员不存在');
    BusinessException.throwIf(member!.levelId === dto.targetLevel, '会员已是该等级');

    const client = this.prisma;

    // 1. 强制生成一条已通过的审批记录作为操作轨迹
    await client.umsUpgradeApply.create({
      data: {
        tenantId: tenantId!,
        memberId,
        fromLevel: member!.levelId,
        toLevel: dto.targetLevel,
        applyType: 'MANUAL_ADJUST',
        status: 'APPROVED',
        referrerId: operatorId, // 借用 referrerId 记录操作人 ID
      },
    });

    // 2. 更新会员等级
    await client.umsMember.update({
      where: { memberId },
      data: {
        levelId: dto.targetLevel,
        upgradedAt: new Date(),
      },
    });

    // 3. 如果调整为 C2 且尚无推荐码，则自动补全
    if (dto.targetLevel === MemberLevel.SHAREHOLDER && !member!.referralCode) {
      await this.referralService.generateAndBindCode(client, memberId, tenantId!);
    }

    this.logger.log(`手动调级: 会员 ${memberId}, 等级 ${member!.levelId}->${dto.targetLevel}, 操作人 ${operatorId}`);
    return Result.ok(null, '调级成功');
  }

  /**
   * 获取审批统计信息
   */
  async getStats(): Promise<Result<UpgradeStatsVo>> {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.UmsUpgradeApplyWhereInput = {};
    if (!isSuper) where.tenantId = tenantId;

    const [pendingCount, totalCount] = await Promise.all([
      this.upgradeRepo.countPending(where),
      this.upgradeRepo.count(where),
    ]);

    return Result.ok({ pendingCount, totalCount });
  }
}
