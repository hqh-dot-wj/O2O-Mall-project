import { Prisma, PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { DelFlagEnum } from 'src/common/enum/index';
import { PrismaService } from '../../prisma/prisma.service';
import { IPaginatedData } from '../response/response.interface';
import { TenantContext } from '../tenant/tenant.context';
import { PrismaDelegate, FindOptions as CommonFindOptions } from 'src/common/types';

/**
 * 分页查询选项
 */
export interface PaginationOptions {
  pageNum?: number;
  pageSize?: number;
}

/**
 * 排序选项
 */
export interface SortOptions {
  orderBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * 查询选项
 */
export interface QueryOptions extends PaginationOptions, SortOptions {
  /** 查询条件 */
  where?: Record<string, unknown>;
  /** 关联查询 */
  include?: Record<string, boolean | object>;
  /** 字段选择 */
  select?: Record<string, boolean>;
}

/**
 * 基础仓储抽象类
 *
 * @description 提供通用的 CRUD 操作封装，减少 Service 层的样板代码
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserRepository extends BaseRepository<SysUser, Prisma.SysUserDelegate> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'sysUser');
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<
  T,
  CreateInput = Partial<T>,
  UpdateInput = Partial<T>,
  D extends PrismaDelegate = PrismaDelegate,
> {
  protected readonly delegate: D;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly cls: ClsService,
    protected readonly modelName: keyof PrismaClient,
    protected readonly primaryKeyName: string = 'id',
    protected readonly tenantFieldName: string = 'tenantId',
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.delegate = (this.client as any)[modelName] as D;
  }

  /**
   * 根据主键查询单条记录
   */
  async findById(
    id: number | string | bigint,
    options?: { include?: Record<string, boolean | object>; select?: Record<string, boolean> },
  ): Promise<T | null> {
    return this.delegate.findUnique({
      where: { [this.getPrimaryKeyName()]: id },
      ...options,
    });
  }

  /**
   * 根据条件查询单条记录
   */
  async findOne(
    where: Partial<T>,
    options?: { include?: Record<string, boolean | object>; select?: Record<string, boolean> },
  ): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.delegate as any).findFirst({
      where: this.applyTenantFilter(where),
      ...options,
    });
  }

  /**
   * 查询所有记录
   */
  async findAll(options?: Omit<QueryOptions, 'pageNum' | 'pageSize'>): Promise<T[]> {
    const { where, include, select, orderBy, order } = options || {};

    return this.delegate.findMany({
      where: this.applyTenantFilter(where),
      include,
      select,
      orderBy: orderBy ? { [orderBy]: order || 'asc' } : undefined,
    });
  }

  /**
   * 原始 findMany 查询
   */
  async findMany(args?: Record<string, unknown>): Promise<T[]> {
    return this.delegate.findMany(args);
  }

  /**
   * 分页查询
   */
  async findPage(options: QueryOptions): Promise<IPaginatedData<T>> {
    const { pageNum = 1, pageSize = 10, where, include, select, orderBy, order } = options;
    const skip = (pageNum - 1) * pageSize;
    const tenantRefinedWhere = this.applyTenantFilter(where);

    const [rows, total] = await Promise.all([
      this.delegate.findMany({
        where: tenantRefinedWhere,
        include,
        select,
        orderBy: orderBy ? { [orderBy]: order || 'asc' } : undefined,
        skip,
        take: pageSize,
      }),
      this.delegate.count({ where: tenantRefinedWhere }),
    ]);

    return {
      rows,
      total,
      pageNum,
      pageSize,
      pages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 创建记录
   */
  async create(data: CreateInput, options?: { include?: any; select?: any }): Promise<T> {
    return this.delegate.create({
      data,
      ...options,
    });
  }

  /**
   * 批量创建
   */
  async createMany(data: CreateInput[]): Promise<{ count: number }> {
    if (!this.delegate.createMany) {
      throw new Error('createMany not supported for this model');
    }
    return this.delegate.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * 更新记录
   */
  async update(
    id: number | string | bigint,
    data: UpdateInput,
    options?: { include?: Record<string, boolean | object>; select?: Record<string, boolean> },
  ): Promise<T> {
    return this.delegate.update({
      where: { [this.getPrimaryKeyName()]: id },
      data,
      ...options,
    });
  }

  /**
   * 根据条件更新
   */
  async updateMany(where: Partial<T>, data: Partial<T>): Promise<{ count: number }> {
    if (!this.delegate.updateMany) {
      throw new Error('updateMany not supported for this model');
    }
    return this.delegate.updateMany({
      where,
      data,
    });
  }

  /**
   * 删除记录
   */
  async delete(id: number | string | bigint): Promise<T> {
    return this.delegate.delete({
      where: { [this.getPrimaryKeyName()]: id },
    });
  }

  /**
   * 批量删除
   */
  async deleteMany(where: Partial<T>): Promise<{ count: number }> {
    if (!this.delegate.deleteMany) {
      throw new Error('deleteMany not supported for this model');
    }
    return this.delegate.deleteMany({ where });
  }

  /**
   * 根据主键批量删除
   */
  async deleteByIds(ids: (number | string | bigint)[]): Promise<{ count: number }> {
    return this.deleteMany({
      [this.getPrimaryKeyName()]: { in: ids },
    } as Partial<T>);
  }

  /**
   * 统计记录数
   */
  async count(where?: Partial<T>): Promise<number> {
    return this.delegate.count({ where });
  }

  /**
   * 检查是否存在
   */
  async exists(where: Partial<T>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * 根据主键检查是否存在
   */
  async existsById(id: number | string | bigint): Promise<boolean> {
    return this.exists({ [this.getPrimaryKeyName()]: id } as Partial<T>);
  }

  /**
   * 软删除（设置 delFlag）
   */
  async softDelete(id: number | string | bigint): Promise<T> {
    return this.update(id, { delFlag: DelFlagEnum.DELETE } as unknown as UpdateInput);
  }

  /**
   * 批量软删除
   */
  async softDeleteBatch(ids: (number | string | bigint)[]): Promise<number> {
    const result = await this.updateMany(
      { [this.getPrimaryKeyName()]: { in: ids } } as Partial<T>,
      { delFlag: DelFlagEnum.DELETE } as unknown as Partial<T>,
    );
    return result.count;
  }

  /**
   * 获取主键字段名（子类可覆盖）
   */
  protected getPrimaryKeyName(): string {
    return this.primaryKeyName;
  }

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
   * 获取自动租户过滤条件
   */
  protected getTenantWhere(): Record<string, unknown> {
    if (!this.tenantFieldName) {
      return {};
    }

    const tenantId = TenantContext.getTenantId() || this.cls.get('tenantId');
    const isSuper = TenantContext.isSuperTenant() || false;
    const isIgnore = TenantContext.isIgnoreTenant() || false;

    if (isSuper || isIgnore || !tenantId) {
      return {};
    }

    return { [this.tenantFieldName]: tenantId };
  }

  /**
   * 合并查询条件，增加租户隔离
   */
  protected applyTenantFilter(where?: Partial<T> | Record<string, unknown>): Record<string, unknown> {
    const tenantWhere = this.getTenantWhere();
    
    // 记录审计日志
    this.recordAuditLog(where, tenantWhere);
    
    if (Object.keys(tenantWhere).length === 0) {
      return where || {};
    }
    return { ...where, ...tenantWhere };
  }

  /**
   * 记录审计日志
   */
  private recordAuditLog(where: Partial<T> | Record<string, unknown> | undefined, tenantWhere: Record<string, unknown>): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const auditData = this.cls.get('AUDIT_DATA') as any;
      if (!auditData) {
        return; // 无审计上下文,跳过
      }

      const tenantId = TenantContext.getTenantId();
      const isSuperTenant = TenantContext.isSuperTenant();
      const isIgnoreTenant = TenantContext.isIgnoreTenant();

      // 检测跨租户访问
      const whereObj = where as Record<string, unknown> | undefined;
      const accessTenantId = whereObj?.[this.tenantFieldName] || tenantWhere[this.tenantFieldName];
      const isCrossTenant = !!(
        tenantId &&
        accessTenantId &&
        tenantId !== accessTenantId &&
        !isSuperTenant
      );

      // 构建审计日志数据
      const auditLog = {
        ...auditData,
        accessTenantId: accessTenantId || tenantId,
        action: 'data_access',
        modelName: String(this.modelName),
        operation: 'query',
        isCrossTenant,
        duration: this.cls.get('AUDIT_DURATION'),
        status: this.cls.get('AUDIT_STATUS') || 'pending',
        errorMessage: this.cls.get('AUDIT_ERROR'),
      };

      // 异步推送到审计队列 (避免阻塞主流程)
      setImmediate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.cls.get('AUDIT_SERVICE') as any)?.recordAccess(auditLog);
      });
    } catch (error) {
      // 审计日志记录失败不应影响业务
      // 仅在开发环境打印错误
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to record audit log:', error);
      }
    }
  }
}

/**
 * 带软删除的仓储基类
 *
 * @description 自动在查询条件中添加 delFlag = '0' 过滤
 */
export abstract class SoftDeleteRepository<
  T,
  CreateInput = Partial<T>,
  UpdateInput = Partial<T>,
  D extends PrismaDelegate = PrismaDelegate,
> extends BaseRepository<T, CreateInput, UpdateInput, D> {
  /**
   * 获取默认的查询条件（排除已删除）
   */
  protected getDefaultWhere(): Record<string, unknown> {
    return { delFlag: DelFlagEnum.NORMAL };
  }

  /**
   * 合并默认查询条件
   */
  protected mergeWhere(where?: Record<string, unknown>): Record<string, unknown> {
    return { ...this.getDefaultWhere(), ...where };
  }

  async findOne(
    where: Partial<T>,
    options?: { include?: Record<string, boolean | object>; select?: Record<string, boolean> },
  ): Promise<T | null> {
    return super.findOne(this.mergeWhere(where) as Partial<T>, options);
  }

  async findAll(options?: Omit<QueryOptions, 'pageNum' | 'pageSize'>): Promise<T[]> {
    return super.findAll({
      ...options,
      where: this.mergeWhere(options?.where),
    });
  }

  async findPage(options: QueryOptions): Promise<IPaginatedData<T>> {
    return super.findPage({
      ...options,
      where: this.mergeWhere(options.where),
    });
  }

  async findMany(args?: Record<string, unknown>): Promise<T[]> {
    return super.findMany({
      ...args,
      where: this.mergeWhere((args as { where?: Record<string, unknown> })?.where),
    });
  }

  async count(where?: Partial<T>): Promise<number> {
    return super.count(this.mergeWhere(where) as Partial<T>);
  }

  async exists(where: Partial<T>): Promise<boolean> {
    return super.exists(this.mergeWhere(where) as Partial<T>);
  }
}
