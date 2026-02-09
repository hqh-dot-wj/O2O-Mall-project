import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import Redis from 'ioredis';

/**
 * 幂等性保障服务单元测试
 * 
 * @description
 * 测试幂等性服务的核心功能：
 * - 参与活动幂等性（缓存和读取）
 * - 支付回调幂等性（标记和检查）
 * - 状态变更分布式锁（获取和释放）
 * - 并发场景处理
 * 
 * @验证需求 FR-5.1, FR-5.2, FR-5.3, US-3
 */
describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(async () => {
    // 创建 Redis mock
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      eval: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkJoinIdempotency - 检查参与幂等性', () => {
    it('应该在缓存不存在时返回 null', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.checkJoinIdempotency(
        'config-123',
        'member-456',
      );

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(
        'idempotency:join:config-123:member-456',
      );
    });

    it('应该在缓存存在时返回缓存结果', async () => {
      const cachedResult = {
        instanceId: 'instance-789',
        status: 'PENDING_PAY',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.checkJoinIdempotency(
        'config-123',
        'member-456',
      );

      expect(result).toEqual(cachedResult);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'idempotency:join:config-123:member-456',
      );
    });

    it('应该支持带 groupId 的幂等键', async () => {
      mockRedis.get.mockResolvedValue(null);

      await service.checkJoinIdempotency('config-123', 'member-456', {
        groupId: 'group-999',
      });

      expect(mockRedis.get).toHaveBeenCalledWith(
        'idempotency:join:config-123:member-456:group-999',
      );
    });

    it('应该处理 JSON 解析错误', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await service.checkJoinIdempotency(
        'config-123',
        'member-456',
      );

      expect(result).toBeNull();
    });

    it('应该处理 Redis 错误', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        service.checkJoinIdempotency('config-123', 'member-456'),
      ).rejects.toThrow('Redis connection failed');
    });
  });

  describe('cacheJoinResult - 缓存参与结果', () => {
    it('应该成功缓存参与结果（5分钟）', async () => {
      const result = {
        instanceId: 'instance-789',
        status: 'PENDING_PAY',
      };

      mockRedis.setex.mockResolvedValue('OK');

      await service.cacheJoinResult('config-123', 'member-456', {}, result);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'idempotency:join:config-123:member-456',
        300, // 5分钟
        JSON.stringify(result),
      );
    });

    it('应该支持带 groupId 的缓存键', async () => {
      const result = { instanceId: 'instance-789' };
      mockRedis.setex.mockResolvedValue('OK');

      await service.cacheJoinResult(
        'config-123',
        'member-456',
        { groupId: 'group-999' },
        result,
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'idempotency:join:config-123:member-456:group-999',
        300,
        JSON.stringify(result),
      );
    });

    it('应该处理 Redis 错误', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      await expect(
        service.cacheJoinResult('config-123', 'member-456', {}, {}),
      ).rejects.toThrow('Redis write failed');
    });
  });

  describe('checkPaymentIdempotency - 检查支付幂等性', () => {
    it('应该在未处理时返回 false', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.checkPaymentIdempotency('order-123');

      expect(result).toBe(false);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'idempotency:payment:order-123',
      );
    });

    it('应该在已处理时返回 true', async () => {
      mockRedis.get.mockResolvedValue('1');

      const result = await service.checkPaymentIdempotency('order-123');

      expect(result).toBe(true);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'idempotency:payment:order-123',
      );
    });

    it('应该处理 Redis 错误', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        service.checkPaymentIdempotency('order-123'),
      ).rejects.toThrow('Redis connection failed');
    });
  });

  describe('markPaymentProcessed - 标记支付已处理', () => {
    it('应该成功标记支付已处理（10分钟）', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.markPaymentProcessed('order-123');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'idempotency:payment:order-123',
        600, // 10分钟
        '1',
      );
    });

    it('应该处理 Redis 错误', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      await expect(service.markPaymentProcessed('order-123')).rejects.toThrow(
        'Redis write failed',
      );
    });
  });

  describe('withStateLock - 状态变更分布式锁', () => {
    it('应该成功获取锁并执行回调', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const callback = jest.fn().mockResolvedValue('success');

      const result = await service.withStateLock('instance-123', callback);

      expect(result).toBe('success');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'idempotency:state:instance-123',
        expect.any(String),
        'PX',
        5000,
        'NX',
      );
      expect(callback).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('应该在获取锁失败时抛出异常', async () => {
      mockRedis.set.mockResolvedValue(null);

      const callback = jest.fn();

      await expect(
        service.withStateLock('instance-123', callback),
      ).rejects.toThrow('操作正在处理中，请稍后重试');

      expect(callback).not.toHaveBeenCalled();
    });

    it('应该支持自定义超时时间', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const callback = jest.fn().mockResolvedValue('success');

      await service.withStateLock('instance-123', callback, 10000);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'idempotency:state:instance-123',
        expect.any(String),
        'PX',
        10000, // 自定义超时
        'NX',
      );
    });

    it('应该在回调执行后释放锁', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const callback = jest.fn().mockResolvedValue('success');

      await service.withStateLock('instance-123', callback);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1])'),
        1,
        'idempotency:state:instance-123',
        expect.any(String),
      );
    });

    it('应该在回调抛出异常时仍然释放锁', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const callback = jest.fn().mockRejectedValue(new Error('Callback error'));

      await expect(
        service.withStateLock('instance-123', callback),
      ).rejects.toThrow('Callback error');

      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('应该处理 Redis 错误', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));

      const callback = jest.fn();

      await expect(
        service.withStateLock('instance-123', callback),
      ).rejects.toThrow('Redis connection failed');
    });
  });

  describe('并发场景测试', () => {
    it('应该防止并发参与同一活动', async () => {
      const result = { instanceId: 'instance-789' };

      // 第一次调用：缓存不存在
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValue('OK');

      // 第二次调用：缓存已存在
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(result));

      const result1 = await service.checkJoinIdempotency(
        'config-123',
        'member-456',
      );
      expect(result1).toBeNull();

      await service.cacheJoinResult('config-123', 'member-456', {}, result);

      const result2 = await service.checkJoinIdempotency(
        'config-123',
        'member-456',
      );
      expect(result2).toEqual(result);
    });

    it('应该防止并发支付回调', async () => {
      // 第一次调用：未处理
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.setex.mockResolvedValue('OK');

      // 第二次调用：已处理
      mockRedis.get.mockResolvedValueOnce('1');

      const processed1 = await service.checkPaymentIdempotency('order-123');
      expect(processed1).toBe(false);

      await service.markPaymentProcessed('order-123');

      const processed2 = await service.checkPaymentIdempotency('order-123');
      expect(processed2).toBe(true);
    });

    it('应该防止并发状态变更', async () => {
      // 第一个请求获取锁成功
      mockRedis.set.mockResolvedValueOnce('OK');
      mockRedis.eval.mockResolvedValue(1);

      // 第二个请求获取锁失败
      mockRedis.set.mockResolvedValueOnce(null);

      const callback1 = jest.fn().mockResolvedValue('success1');
      const callback2 = jest.fn().mockResolvedValue('success2');

      const promise1 = service.withStateLock('instance-123', callback1);
      const promise2 = service.withStateLock('instance-123', callback2);

      await expect(promise1).resolves.toBe('success1');
      await expect(promise2).rejects.toThrow('操作正在处理中');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空字符串参数', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.checkJoinIdempotency('', ''),
      ).resolves.toBeNull();
    });

    it('应该处理特殊字符参数', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.checkJoinIdempotency('config:123', 'member@456'),
      ).resolves.toBeNull();

      expect(mockRedis.get).toHaveBeenCalledWith(
        'idempotency:join:config:123:member@456',
      );
    });

    it('应该处理超长参数', async () => {
      const longId = 'a'.repeat(1000);
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.checkJoinIdempotency(longId, longId),
      ).resolves.toBeNull();
    });

    it('应该处理 null 回调', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      await expect(
        service.withStateLock('instance-123', null as any),
      ).rejects.toThrow();
    });

    it('应该处理 undefined 回调', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      await expect(
        service.withStateLock('instance-123', undefined as any),
      ).rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    it('幂等性检查应该在 50ms 内完成', async () => {
      mockRedis.get.mockResolvedValue(null);

      const startTime = Date.now();
      await service.checkJoinIdempotency('config-123', 'member-456');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    it('缓存结果应该在 50ms 内完成', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const startTime = Date.now();
      await service.cacheJoinResult('config-123', 'member-456', {}, {});
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });
});
