/**
 * Repository 相关类型定义
 * 用于替代 BaseRepository 中的 any 类型
 */

import { Prisma } from '@prisma/client';

/**
 * Prisma 模型名称
 */
export type PrismaModelName = Prisma.ModelName;

/**
 * 通用查询选项
 * 
 * @example
 * ```typescript
 * const options: FindOptions<User> = {
 *   where: { status: 'active' },
 *   include: { profile: true },
 *   orderBy: { createTime: 'desc' },
 *   skip: 0,
 *   take: 10
 * };
 * ```
 */
export interface FindOptions<T> {
  /** 查询条件 */
  where?: Partial<T>;
  /** 关联查询 */
  include?: Record<string, boolean | object>;
  /** 字段选择 */
  select?: Record<string, boolean>;
  /** 排序条件 */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** 跳过记录数 */
  skip?: number;
  /** 获取记录数 */
  take?: number;
}

/**
 * 分页查询选项
 */
export interface PaginationOptions {
  /** 页码（从 1 开始） */
  pageNum?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 分页结果
 * 
 * @example
 * ```typescript
 * const result: PaginatedResult<User> = {
 *   rows: [user1, user2],
 *   total: 100,
 *   pageNum: 1,
 *   pageSize: 10
 * };
 * ```
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  rows: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  pageNum: number;
  /** 每页数量 */
  pageSize: number;
}

/**
 * 创建输入类型
 * 用于 create 操作
 */
export type CreateInput<T> = Omit<T, 'id' | 'createTime' | 'updateTime'>;

/**
 * 更新输入类型
 * 用于 update 操作
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createTime'>>;

/**
 * Prisma Delegate 类型约束
 * 用于 BaseRepository 的泛型约束
 * 
 * @description
 * 定义 Prisma 模型 Delegate 的基本方法签名
 * 使用 any 参数和返回类型以兼容实际的 Prisma delegate 签名
 */
export type PrismaDelegate = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findUnique: (args: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findFirst?: (args?: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany: (args?: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (args: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (args: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (args: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  count: (args?: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMany?: (args: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMany?: (args: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteMany?: (args: any) => any;
};
