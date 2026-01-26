import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { FormatDateFields } from 'src/common/utils';
import { ListUpgradeApplyDto, ApproveUpgradeDto, ManualLevelDto } from './dto/upgrade.dto';
import { Prisma } from '@prisma/client';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { nanoid } from 'nanoid';

/**
 * 管理端升级审批服务
 */
@Injectable()
export class AdminUpgradeService {
  private readonly logger = new Logger(AdminUpgradeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 查询升级申请列表
   */
  async findAll(query: ListUpgradeApplyDto) {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.UmsUpgradeApplyWhereInput = {};
    if (!isSuper) where.tenantId = tenantId;

    if (query.memberId) where.memberId = query.memberId;
    if (query.status) where.status = query.status;
    if (query.applyType) where.applyType = query.applyType;

    const dateRange = query.getDateRange('createTime');
    if (dateRange) Object.assign(where, dateRange);

    const [list, total] = await Promise.all([
      this.prisma.umsUpgradeApply.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.umsUpgradeApply.count({ where }),
    ]);

    // 批量获取会员信息
    const memberIds = [...new Set(list.map((a) => a.memberId))];
    const members = await this.prisma.umsMember.findMany({
      where: { memberId: { in: memberIds } },
      select: { memberId: true, nickname: true, mobile: true, avatar: true },
    });
    const memberMap = new Map(members.map((m) => [m.memberId, m]));

    const rows = list.map((item) => ({
      ...item,
      member: memberMap.get(item.memberId) || null,
      fromLevelName: this.getLevelName(item.fromLevel),
      toLevelName: this.getLevelName(item.toLevel),
    }));

    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 审批升级申请
   */
  async approve(applyId: string, dto: ApproveUpgradeDto, operatorId: string) {
    const apply = await this.prisma.umsUpgradeApply.findUnique({
      where: { id: applyId },
    });

    BusinessException.throwIfNull(apply, '申请不存在');
    BusinessException.throwIf(apply!.status !== 'PENDING', '该申请已处理');

    if (dto.action === 'approve') {
      // 通过: 升级会员
      await this.prisma.$transaction(async (tx) => {
        // 更新申请状态
        await tx.umsUpgradeApply.update({
          where: { id: applyId },
          data: { status: 'APPROVED' },
        });

        // 升级会员
        await tx.umsMember.update({
          where: { memberId: apply!.memberId },
          data: {
            levelId: apply!.toLevel,
            upgradedAt: new Date(),
            upgradeOrderId: apply!.orderId,
          },
        });

        // C2 自动生成推荐码
        if (apply!.toLevel === 2) {
          await this.generateReferralCode(tx, apply!.memberId, apply!.tenantId);
        }
      });

      this.logger.log(`审批通过: 申请${applyId}, 操作人${operatorId}`);
      return Result.ok(null, '审批通过');
    } else {
      // 驳回
      await this.prisma.umsUpgradeApply.update({
        where: { id: applyId },
        data: {
          status: 'REJECTED',
          // reason: dto.reason, // 如需记录原因，需要在 schema 中添加字段
        },
      });

      this.logger.log(`审批驳回: 申请${applyId}, 原因: ${dto.reason}`);
      return Result.ok(null, '已驳回');
    }
  }

  /**
   * 手动调整会员等级
   */
  async manualLevel(memberId: string, dto: ManualLevelDto, operatorId: string) {
    const tenantId = TenantContext.getTenantId();

    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });

    BusinessException.throwIfNull(member, '会员不存在');
    BusinessException.throwIf(member!.levelId === dto.targetLevel, '会员已是该等级');

    await this.prisma.$transaction(async (tx) => {
      // 创建操作记录
      await tx.umsUpgradeApply.create({
        data: {
          tenantId: tenantId!,
          memberId,
          fromLevel: member!.levelId,
          toLevel: dto.targetLevel,
          applyType: 'MANUAL_ADJUST',
          status: 'APPROVED',
          referrerId: operatorId, // 记录操作人
        },
      });

      // 更新会员等级
      await tx.umsMember.update({
        where: { memberId },
        data: {
          levelId: dto.targetLevel,
          upgradedAt: new Date(),
        },
      });

      // C2 自动生成推荐码
      if (dto.targetLevel === 2 && !member!.referralCode) {
        await this.generateReferralCode(tx, memberId, tenantId!);
      }
    });

    this.logger.log(`手动调级: ${memberId} → 等级${dto.targetLevel}, 操作人${operatorId}`);
    return Result.ok(null, '调级成功');
  }

  /**
   * 获取统计
   */
  async getStats() {
    const tenantId = TenantContext.getTenantId();
    const isSuper = TenantContext.isSuperTenant();

    const where: Prisma.UmsUpgradeApplyWhereInput = {};
    if (!isSuper) where.tenantId = tenantId;

    const [pendingCount, totalCount] = await Promise.all([
      this.prisma.umsUpgradeApply.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.umsUpgradeApply.count({ where }),
    ]);

    return Result.ok({ pendingCount, totalCount });
  }

  // ========== 私有方法 ==========

  private getLevelName(level: number): string {
    const names: Record<number, string> = { 0: 'C普通', 1: 'C1团长', 2: 'C2股东' };
    return names[level] || `未知(${level})`;
  }

  private async generateReferralCode(tx: Prisma.TransactionClient, memberId: string, tenantId: string) {
    const prefix = tenantId.slice(0, 4).toUpperCase();
    const randomPart = nanoid(4).toUpperCase();
    const code = `${prefix}-${randomPart}`;

    await tx.umsReferralCode.create({
      data: { tenantId, memberId, code, isActive: true },
    });

    await tx.umsMember.update({
      where: { memberId },
      data: { referralCode: code },
    });

    this.logger.log(`为C2会员 ${memberId} 生成推荐码: ${code}`);
  }
}
