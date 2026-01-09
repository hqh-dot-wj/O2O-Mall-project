import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Prisma, SysTenant } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatusEnum, DelFlagEnum } from 'src/common/enum';
import { TenantContext } from 'src/common/tenant/tenant.context';

/**
 * 租户 Repository
 * 封装租户相关的数据访问逻辑
 */
@Injectable()
export class TenantRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) { }

  /**
   * 获取 Prisma 原始客户端（用于复杂查询）
   * 如果在事务上下文中，返回事务客户端
   */
  protected get client(): PrismaService | Prisma.TransactionClient {
    const tx = this.cls.get<Prisma.TransactionClient>('PRISMA_TX');
    if (tx) {
      return tx;
    }
    return this.prisma;
  }

  /**
   * 根据租户ID查找租户
   */
  async findByTenantId(tenantId: string): Promise<SysTenant | null> {
    return this.client.sysTenant.findUnique({
      where: { tenantId },
    });
  }

  /**
   * 查找所有活跃租户
   */
  async findAllActive(): Promise<SysTenant[]> {
    return this.client.sysTenant.findMany({
      where: {
        status: StatusEnum.NORMAL,
        delFlag: DelFlagEnum.NORMAL,
      },
      orderBy: { createTime: 'desc' },
    });
  }

  /**
   * 查找所有非超级管理员租户
   */
  async findAllNonSuper(): Promise<Array<Pick<SysTenant, 'tenantId' | 'companyName' | 'status' | 'expireTime'>>> {
    return this.client.sysTenant.findMany({
      where: {
        status: StatusEnum.NORMAL,
        delFlag: DelFlagEnum.NORMAL,
        tenantId: { not: TenantContext.SUPER_TENANT_ID },
      },
      select: {
        tenantId: true,
        companyName: true,
        status: true,
        expireTime: true,
      },
    });
  }

  /**
   * 根据公司名称查找租户
   */
  async findByCompanyName(companyName: string): Promise<SysTenant | null> {
    return this.client.sysTenant.findFirst({
      where: {
        companyName,
        delFlag: DelFlagEnum.NORMAL,
      },
    });
  }

  /**
   * 获取最后创建的租户（用于生成新租户ID）
   */
  async findLastTenant(): Promise<SysTenant | null> {
    return this.client.sysTenant.findFirst({
      where: {
        tenantId: { not: TenantContext.SUPER_TENANT_ID },
      },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * 检查租户ID是否存在
   */
  async existsByTenantId(tenantId: string): Promise<boolean> {
    const count = await this.client.sysTenant.count({
      where: { tenantId },
    });
    return count > 0;
  }

  /**
   * 分页查询租户列表
   */
  async findPaginated(
    where: Prisma.SysTenantWhereInput,
    skip: number,
    take: number,
  ): Promise<{ list: SysTenant[]; total: number }> {
    const client = this.client;
    // 如果已经在事务中，或者 simple client，我们使用 Promise.all 模拟
    // 只有 PrismaClient 实例有 $transaction 方法 (且不带 Client generic 时的调用方式)
    // 但这里我们简单判断: 如果是 TransactionClient，它没有 $transaction 属性
    // PrismaService extends PrismaClient so it has it.

    // 注意: this.client 返回 PrismaService | Prisma.TransactionClient
    // 运行时判断
    let promises: [Promise<SysTenant[]>, Promise<number>];

    const findMany = client.sysTenant.findMany({
      where,
      skip,
      take,
      orderBy: { createTime: 'desc' },
    });
    const count = client.sysTenant.count({ where });

    if ('$transaction' in client) {
      // It's the main client
      const [list, total] = await (client as PrismaService).$transaction([findMany, count]);
      return { list, total };
    } else {
      // It's a transaction client, just run parallel
      const [list, total] = await Promise.all([findMany, count]);
      return { list, total };
    }
  }

  /**
   * 创建租户
   */
  async create(data: Prisma.SysTenantCreateInput): Promise<SysTenant> {
    return this.client.sysTenant.create({ data });
  }

  /**
   * 更新租户
   */
  async update(tenantId: string, data: Prisma.SysTenantUpdateInput): Promise<SysTenant> {
    return this.client.sysTenant.update({
      where: { tenantId },
      data,
    });
  }

  /**
   * 更新租户状态
   */
  async updateStatus(tenantId: string, status: StatusEnum): Promise<SysTenant> {
    return this.client.sysTenant.update({
      where: { tenantId },
      data: { status },
    });
  }

  /**
   * 软删除
   */
  async softDelete(tenantId: string): Promise<SysTenant> {
    return this.client.sysTenant.update({
      where: { tenantId },
      data: { delFlag: DelFlagEnum.DELETE },
    });
  }

  /**
   * 批量更新租户套餐
   */
  async updatePackageForTenants(tenantIds: string[], packageId: number): Promise<number> {
    const result = await this.client.sysTenant.updateMany({
      where: {
        tenantId: { in: tenantIds },
      },
      data: {
        packageId,
      },
    });
    return result.count;
  }
}
