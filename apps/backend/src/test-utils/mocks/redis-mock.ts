/**
 * 共享 Redis Mock，用于单元测试。
 * 用法：const redis = createRedisMock(); 在 Nest 中 { provide: RedisService, useValue: redis }
 */
export const createRedisMock = () => ({
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  setex: jest.fn(),
  eval: jest.fn(),
});

export type RedisMock = ReturnType<typeof createRedisMock>;
