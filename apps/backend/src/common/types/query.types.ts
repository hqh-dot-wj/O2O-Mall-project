/**
 * 查询相关类型定义
 * 用于替代 Repository 和 Service 中的 any 类型
 */

import { Prisma } from '@prisma/client';

/**
 * 通用 Where 条件类型
 * 支持 AND、OR、NOT 逻辑组合
 * 
 * @example
 * ```typescript
 * const where: WhereInput<User> = {
 *   name: 'John',
 *   AND: [
 *     { age: { gte: 18 } },
 *     { status: 'active' }
 *   ]
 * };
 * ```
 */
export type WhereInput<T> = Partial<T> & {
  AND?: WhereInput<T>[];
  OR?: WhereInput<T>[];
  NOT?: WhereInput<T>[];
};

/**
 * 排序方向
 */
export type SortOrder = 'asc' | 'desc';

/**
 * 排序条件
 * 
 * @example
 * ```typescript
 * const orderBy: OrderByInput<User> = {
 *   createTime: 'desc',
 *   name: 'asc'
 * };
 * ```
 */
export type OrderByInput<T> = {
  [K in keyof T]?: SortOrder;
};

/**
 * 查询结果包装
 * 用于统一查询结果格式
 */
export interface QueryResult<T> {
  /** 查询数据 */
  data: T;
  /** 总数（可选，用于分页） */
  total?: number;
}

/**
 * 原始查询结果类型
 * 用于 $queryRaw 等原始查询
 */
export type RawQueryResult<T> = T[];

/**
 * 聚合查询结果
 * 用于统计查询
 */
export interface AggregateResult {
  /** 计数 */
  count?: number;
  /** 求和 */
  sum?: Prisma.Decimal | number;
  /** 平均值 */
  avg?: Prisma.Decimal | number;
  /** 最小值 */
  min?: Prisma.Decimal | number | Date;
  /** 最大值 */
  max?: Prisma.Decimal | number | Date;
}

/**
 * 分组查询结果
 * 用于 GROUP BY 查询
 */
export interface GroupByResult<T> {
  /** 分组字段 */
  groupBy: Partial<T>;
  /** 聚合结果 */
  aggregate: AggregateResult;
}
