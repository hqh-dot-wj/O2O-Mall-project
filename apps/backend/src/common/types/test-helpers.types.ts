/**
 * 测试辅助类型定义
 * 用于提高测试文件的类型安全性
 */

/**
 * Mock Repository 类型
 * 用于 Jest mock 的 Repository
 */
export type MockRepository<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? jest.Mock<Return, Args>
    : T[K];
};

/**
 * Mock Service 类型
 * 用于 Jest mock 的 Service
 */
export type MockService<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? jest.Mock<Return, Args>
    : T[K];
};

/**
 * Partial Mock 类型
 * 允许只 mock 部分方法
 */
export type PartialMock<T> = {
  [K in keyof T]?: T[K] extends (...args: infer Args) => infer Return
    ? jest.Mock<Return, Args>
    : T[K];
};

/**
 * 测试查询 DTO 类型
 * 用于测试分页查询
 */
export interface TestQueryDto {
  pageNum: number;
  pageSize: number;
  getDateRange?: jest.Mock;
  [key: string]: unknown;
}

/**
 * 测试分页结果类型
 */
export interface TestPaginatedResult<T> {
  rows: T[];
  total: number;
}

/**
 * 测试 Prisma 客户端类型
 */
export interface TestPrismaClient {
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
  [key: string]: unknown;
}

/**
 * 测试 Redis 客户端类型
 */
export interface TestRedisClient {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  eval: jest.Mock;
  [key: string]: unknown;
}

/**
 * 测试 CLS 服务类型
 */
export interface TestClsService {
  get: jest.Mock;
  set: jest.Mock;
  run: jest.Mock;
  [key: string]: unknown;
}

/**
 * 创建 Mock Repository 辅助函数
 */
export function createMockRepository<T extends object>(
  methods: (keyof T)[],
): MockRepository<Pick<T, typeof methods[number]>> {
  const mock = {} as MockRepository<Pick<T, typeof methods[number]>>;
  methods.forEach((method) => {
    (mock as Record<string, jest.Mock>)[method as string] = jest.fn();
  });
  return mock;
}

/**
 * 创建 Mock Service 辅助函数
 */
export function createMockService<T extends object>(
  methods: (keyof T)[],
): MockService<Pick<T, typeof methods[number]>> {
  const mock = {} as MockService<Pick<T, typeof methods[number]>>;
  methods.forEach((method) => {
    (mock as Record<string, jest.Mock>)[method as string] = jest.fn();
  });
  return mock;
}

/**
 * 创建测试 Prisma 客户端
 */
export function createTestPrismaClient(): TestPrismaClient {
  return {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };
}

/**
 * 创建测试 Redis 客户端
 */
export function createTestRedisClient(): TestRedisClient {
  return {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
  };
}

/**
 * 创建测试 CLS 服务
 */
export function createTestClsService(): TestClsService {
  return {
    get: jest.fn(),
    set: jest.fn(),
    run: jest.fn(),
  };
}

/**
 * 类型安全的 expect.any 替代
 */
export const expectAny = {
  date: () => expect.any(Date),
  string: () => expect.any(String),
  number: () => expect.any(Number),
  boolean: () => expect.any(Boolean),
  object: () => expect.any(Object),
  array: () => expect.any(Array),
};
