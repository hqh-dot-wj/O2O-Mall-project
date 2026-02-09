import { Injectable } from '@nestjs/common';
import { MktPointsRule, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 积分规则仓储
 * 
 * @description 继承 BaseRepository，自动处理租户隔离
 */
@Injectable()
export class PointsRuleRepository extends BaseRepository<
  MktPointsRule,
  Prisma.MktPointsRuleCreateInput,
  Prisma.MktPointsRuleUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'mktPointsRule', 'id', 'tenantId');
  }

  /**
   * 根据租户ID查询积分规则
   * 
   * @param tenantId 租户ID
   * @returns 积分规则
   */
  async findByTenantId(tenantId: string): Promise<MktPointsRule | null> {
    return this.findOne({
      where: {
        tenantId,
      },
    });
  }

  /**
   * 创建或更新积分规则
   * 
   * @param tenantId 租户ID
   * @param data 规则数据
   * @param userId 操作用户ID
   * @returns 积分规则
   */
  async upsert(
    tenantId: string,
    data: Partial<MktPointsRule>,
    userId: string,
  ): Promise<MktPointsRule> {
    const existing = await this.findByTenantId(tenantId);

    if (existing) {
      return this.update(existing.id, {
        ...data,
        updateBy: userId,
      } as any);
    } else {
      return this.create({
        ...data,
        tenantId,
        createBy: userId,
      } as any);
    }
  }
}
