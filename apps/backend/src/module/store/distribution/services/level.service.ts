import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/constants/response-code';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { CreateLevelDto } from '../dto/create-level.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { ListLevelDto } from '../dto/list-level.dto';
import { UpdateMemberLevelDto } from '../dto/update-member-level.dto';
import { ListMemberLevelLogDto } from '../dto/list-member-level-log.dto';
import { LevelVo, MemberLevelLogVo } from '../vo/level.vo';
import { LevelCheckVo, ConditionResultVo } from '../vo/level-check.vo';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { Decimal } from '@prisma/client/runtime/library';
import { LevelConditionService } from './level-condition.service';

@Injectable()
export class LevelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionService: LevelConditionService,
  ) {}

  /**
   * 创建等级配置
   */
  @Transactional()
  async create(tenantId: string, dto: CreateLevelDto, operator: string): Promise<LevelVo> {
    // 检查等级编号是否已存在
    const existing = await this.prisma.sysDistLevel.findUnique({
      where: {
        tenantId_levelId: {
          tenantId,
          levelId: dto.levelId,
        },
      },
    });

    BusinessException.throwIf(existing !== null, '该等级编号已存在');

    // 创建等级配置
    const level = await this.prisma.sysDistLevel.create({
      data: {
        tenantId,
        levelId: dto.levelId,
        levelName: dto.levelName,
        levelIcon: dto.levelIcon,
        level1Rate: new Decimal(dto.level1Rate).div(100), // 转换为小数
        level2Rate: new Decimal(dto.level2Rate).div(100),
        upgradeCondition: dto.upgradeCondition as any,
        maintainCondition: dto.maintainCondition as any,
        benefits: dto.benefits,
        sort: dto.sort ?? 0,
        isActive: dto.isActive ?? true,
        createBy: operator,
        updateBy: operator,
      },
    });

    return this.toVo(level);
  }

  /**
   * 更新等级配置
   */
  @Transactional()
  async update(tenantId: string, id: number, dto: UpdateLevelDto, operator: string): Promise<LevelVo> {
    // 检查等级是否存在
    const existing = await this.prisma.sysDistLevel.findFirst({
      where: { id, tenantId },
    });

    BusinessException.throwIfNull(existing, '等级配置不存在');

    // 如果修改了levelId，检查新的levelId是否已被使用
    if (dto.levelId !== undefined && dto.levelId !== existing.levelId) {
      const duplicate = await this.prisma.sysDistLevel.findUnique({
        where: {
          tenantId_levelId: {
            tenantId,
            levelId: dto.levelId,
          },
        },
      });

      BusinessException.throwIf(duplicate !== null, '该等级编号已被使用');
    }

    // 更新等级配置
    const level = await this.prisma.sysDistLevel.update({
      where: { id },
      data: {
        ...(dto.levelId !== undefined && { levelId: dto.levelId }),
        ...(dto.levelName !== undefined && { levelName: dto.levelName }),
        ...(dto.levelIcon !== undefined && { levelIcon: dto.levelIcon }),
        ...(dto.level1Rate !== undefined && { level1Rate: new Decimal(dto.level1Rate).div(100) }),
        ...(dto.level2Rate !== undefined && { level2Rate: new Decimal(dto.level2Rate).div(100) }),
        ...(dto.upgradeCondition !== undefined && { upgradeCondition: dto.upgradeCondition as any }),
        ...(dto.maintainCondition !== undefined && { maintainCondition: dto.maintainCondition as any }),
        ...(dto.benefits !== undefined && { benefits: dto.benefits }),
        ...(dto.sort !== undefined && { sort: dto.sort }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updateBy: operator,
      },
    });

    return this.toVo(level);
  }

  /**
   * 删除等级配置（软删除）
   */
  @Transactional()
  async delete(tenantId: string, id: number, operator: string): Promise<void> {
    // 检查等级是否存在
    const existing = await this.prisma.sysDistLevel.findFirst({
      where: { id, tenantId },
    });

    BusinessException.throwIfNull(existing, '等级配置不存在');

    // 检查是否有会员使用该等级
    const memberCount = await this.prisma.umsMember.count({
      where: {
        tenantId,
        levelId: existing.levelId,
      },
    });

    BusinessException.throwIf(memberCount > 0, `该等级下还有 ${memberCount} 个会员，无法删除`);

    // 软删除（设置为不激活）
    await this.prisma.sysDistLevel.update({
      where: { id },
      data: {
        isActive: false,
        updateBy: operator,
      },
    });
  }

  /**
   * 查询等级列表
   */
  async findAll(tenantId: string, dto: ListLevelDto): Promise<LevelVo[]> {
    const levels = await this.prisma.sysDistLevel.findMany({
      where: {
        tenantId,
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      orderBy: [{ sort: 'asc' }, { levelId: 'asc' }],
    });

    return levels.map((level) => this.toVo(level));
  }

  /**
   * 查询单个等级配置
   */
  async findOne(tenantId: string, id: number): Promise<LevelVo> {
    const level = await this.prisma.sysDistLevel.findFirst({
      where: { id, tenantId },
    });

    BusinessException.throwIfNull(level, '等级配置不存在');

    return this.toVo(level);
  }

  /**
   * 根据levelId查询等级配置
   */
  async findByLevelId(tenantId: string, levelId: number): Promise<LevelVo | null> {
    const level = await this.prisma.sysDistLevel.findUnique({
      where: {
        tenantId_levelId: {
          tenantId,
          levelId,
        },
      },
    });

    return level ? this.toVo(level) : null;
  }

  /**
   * 手动调整会员等级
   */
  @Transactional()
  async updateMemberLevel(tenantId: string, dto: UpdateMemberLevelDto, operator: string): Promise<void> {
    // 检查会员是否存在
    const member = await this.prisma.umsMember.findFirst({
      where: {
        memberId: dto.memberId,
        tenantId,
      },
    });

    BusinessException.throwIfNull(member, '会员不存在');

    // 检查目标等级配置是否存在
    if (dto.targetLevel > 0) {
      const targetLevel = await this.prisma.sysDistLevel.findUnique({
        where: {
          tenantId_levelId: {
            tenantId,
            levelId: dto.targetLevel,
          },
        },
      });

      BusinessException.throwIfNull(targetLevel, '目标等级配置不存在');
      BusinessException.throwIf(!targetLevel.isActive, '目标等级未激活');
    }

    const fromLevel = member.levelId;

    // 更新会员等级
    await this.prisma.umsMember.update({
      where: { memberId: dto.memberId },
      data: {
        levelId: dto.targetLevel,
        upgradedAt: new Date(),
      },
    });

    // 记录变更日志
    await this.prisma.sysDistLevelLog.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        fromLevel,
        toLevel: dto.targetLevel,
        changeType: 'MANUAL',
        reason: dto.reason,
        operator,
      },
    });
  }

  /**
   * 查询会员等级变更日志
   */
  async getMemberLevelLogs(tenantId: string, dto: ListMemberLevelLogDto) {
    const { pageNum = 1, pageSize = 10 } = dto;
    const { skip, take } = PaginationHelper.getPagination(pageNum, pageSize);

    const where = {
      tenantId,
      ...(dto.memberId && { memberId: dto.memberId }),
      ...(dto.changeType && { changeType: dto.changeType }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.sysDistLevelLog.findMany({
        where,
        skip,
        take,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.sysDistLevelLog.count({ where }),
    ]);

    return {
      rows: logs.map((log) => this.toLogVo(log)),
      total,
    };
  }

  /**
   * 检查会员是否满足升级条件
   */
  async checkUpgradeEligibility(tenantId: string, memberId: string): Promise<LevelCheckVo> {
    // 获取会员当前等级
    const member = await this.prisma.umsMember.findFirst({
      where: { memberId, tenantId },
    });

    BusinessException.throwIfNull(member, '会员不存在');

    const currentLevel = member.levelId;

    // 查询下一等级配置
    const nextLevel = await this.prisma.sysDistLevel.findFirst({
      where: {
        tenantId,
        levelId: currentLevel + 1,
        isActive: true,
      },
    });

    // 如果没有下一等级，返回不可升级
    if (!nextLevel || !nextLevel.upgradeCondition) {
      return {
        currentLevel,
        eligibleLevel: currentLevel,
        canUpgrade: false,
        conditionResults: [],
      };
    }

    // 检查升级条件
    const { passed, results } = await this.conditionService.checkCondition(
      tenantId,
      memberId,
      nextLevel.upgradeCondition as any,
    );

    return {
      currentLevel,
      eligibleLevel: passed ? nextLevel.levelId : currentLevel,
      canUpgrade: passed,
      conditionResults: results.map((r) => ({
        field: r.field,
        required: r.required,
        actual: r.actual,
        passed: r.passed,
      })),
    };
  }

  /**
   * 自动升级会员等级
   * 用于定时任务
   */
  @Transactional()
  async autoUpgradeMember(tenantId: string, memberId: string, targetLevel: number, reason: string): Promise<void> {
    const member = await this.prisma.umsMember.findFirst({
      where: { memberId, tenantId },
    });

    BusinessException.throwIfNull(member, '会员不存在');

    const fromLevel = member.levelId;

    // 更新会员等级
    await this.prisma.umsMember.update({
      where: { memberId },
      data: {
        levelId: targetLevel,
        upgradedAt: new Date(),
      },
    });

    // 记录变更日志
    await this.prisma.sysDistLevelLog.create({
      data: {
        tenantId,
        memberId,
        fromLevel,
        toLevel: targetLevel,
        changeType: 'UPGRADE',
        reason,
        operator: null, // 自动升级无操作人
      },
    });
  }

  /**
   * 自动降级会员等级
   * 用于定时任务
   */
  @Transactional()
  async autoDowngradeMember(tenantId: string, memberId: string, targetLevel: number, reason: string): Promise<void> {
    const member = await this.prisma.umsMember.findFirst({
      where: { memberId, tenantId },
    });

    BusinessException.throwIfNull(member, '会员不存在');

    const fromLevel = member.levelId;

    // 更新会员等级
    await this.prisma.umsMember.update({
      where: { memberId },
      data: {
        levelId: targetLevel,
        upgradedAt: new Date(),
      },
    });

    // 记录变更日志
    await this.prisma.sysDistLevelLog.create({
      data: {
        tenantId,
        memberId,
        fromLevel,
        toLevel: targetLevel,
        changeType: 'DOWNGRADE',
        reason,
        operator: null, // 自动降级无操作人
      },
    });
  }

  /**
   * 批量处理会员升级
   * 用于定时任务
   */
  async batchProcessUpgrade(tenantId: string): Promise<{ upgraded: number; failed: number }> {
    let upgraded = 0;
    let failed = 0;

    // 查询所有激活的等级配置（按levelId升序）
    const levels = await this.prisma.sysDistLevel.findMany({
      where: {
        tenantId,
        isActive: true,
        upgradeCondition: {
          not: null,
        },
      },
      orderBy: { levelId: 'asc' },
    });

    // 遍历每个等级，检查是否有会员满足升级条件
    for (const level of levels) {
      try {
        // 查询当前等级的所有会员
        const members = await this.prisma.umsMember.findMany({
          where: {
            tenantId,
            levelId: level.levelId - 1, // 查询上一等级的会员
          },
          select: { memberId: true },
        });

        if (members.length === 0) continue;

        const memberIds = members.map((m) => m.memberId);

        // 批量检查升级条件
        const checkResults = await this.conditionService.batchCheckUpgrade(
          tenantId,
          memberIds,
          level.levelId,
          level.upgradeCondition as any,
        );

        // 升级满足条件的会员
        for (const [memberId, passed] of checkResults.entries()) {
          if (passed) {
            try {
              await this.autoUpgradeMember(tenantId, memberId, level.levelId, '满足升级条件，自动升级');
              upgraded++;
            } catch (error) {
              failed++;
            }
          }
        }
      } catch (error) {
        // 记录错误但继续处理其他等级
        console.error(`处理等级 ${level.levelId} 升级失败:`, error);
      }
    }

    return { upgraded, failed };
  }

  /**
   * 批量处理会员降级
   * 用于定时任务
   */
  async batchProcessDowngrade(tenantId: string): Promise<{ downgraded: number; failed: number }> {
    let downgraded = 0;
    let failed = 0;

    // 查询所有激活的等级配置（按levelId降序，从高到低检查）
    const levels = await this.prisma.sysDistLevel.findMany({
      where: {
        tenantId,
        isActive: true,
        maintainCondition: {
          not: null,
        },
      },
      orderBy: { levelId: 'desc' },
    });

    // 遍历每个等级，检查是否有会员不满足保级条件
    for (const level of levels) {
      try {
        // 查询当前等级的所有会员
        const members = await this.prisma.umsMember.findMany({
          where: {
            tenantId,
            levelId: level.levelId,
          },
          select: { memberId: true },
        });

        if (members.length === 0) continue;

        const memberIds = members.map((m) => m.memberId);

        // 批量检查保级条件
        const checkResults = await this.conditionService.batchCheckMaintain(
          tenantId,
          memberIds,
          level.maintainCondition as any,
        );

        // 降级不满足条件的会员
        for (const [memberId, passed] of checkResults.entries()) {
          if (!passed) {
            try {
              const targetLevel = Math.max(0, level.levelId - 1); // 降一级，最低到0
              await this.autoDowngradeMember(tenantId, memberId, targetLevel, '不满足保级条件，自动降级');
              downgraded++;
            } catch (error) {
              failed++;
            }
          }
        }
      } catch (error) {
        console.error(`处理等级 ${level.levelId} 降级失败:`, error);
      }
    }

    return { downgraded, failed };
  }

  /**
   * 转换为VO
   */
  private toVo(level: any): LevelVo {
    return {
      id: level.id,
      tenantId: level.tenantId,
      levelId: level.levelId,
      levelName: level.levelName,
      levelIcon: level.levelIcon,
      level1Rate: new Decimal(level.level1Rate).mul(100).toFixed(2), // 转换为百分比
      level2Rate: new Decimal(level.level2Rate).mul(100).toFixed(2),
      upgradeCondition: level.upgradeCondition as any,
      maintainCondition: level.maintainCondition as any,
      benefits: level.benefits,
      sort: level.sort,
      isActive: level.isActive,
      createBy: level.createBy,
      createTime: level.createTime,
      updateBy: level.updateBy,
      updateTime: level.updateTime,
    };
  }

  /**
   * 转换为日志VO
   */
  private toLogVo(log: any): MemberLevelLogVo {
    return {
      id: log.id,
      tenantId: log.tenantId,
      memberId: log.memberId,
      fromLevel: log.fromLevel,
      toLevel: log.toLevel,
      changeType: log.changeType,
      reason: log.reason,
      operator: log.operator,
      createTime: log.createTime,
    };
  }
}
