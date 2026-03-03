// @ts-nocheck
import { RedisService } from './redis.service';

const createRedisClientMock = () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(JSON.stringify({ foo: 'bar' })),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue(['k1', 'k2']),
  info: jest.fn().mockResolvedValue('cmdstat_get:calls=4,usec=10\r\n'),
  dbsize: jest.fn().mockResolvedValue(2),
  mget: jest.fn().mockResolvedValue(['"a"', '"b"']),
  hmset: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  scan: jest.fn(),
  eval: jest.fn(),
});

describe('RedisService', () => {
  let service: RedisService;
  let client: ReturnType<typeof createRedisClientMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createRedisClientMock();
    service = new RedisService(client as any);
  });

  describe('基础操作', () => {
    // R-FLOW-REDIS-01: set 方法序列化对象
    it('Given object value, When set without ttl, Then stringify payload', async () => {
      await service.set('token', { value: 1 });
      expect(client.set).toHaveBeenCalledWith('token', JSON.stringify({ value: 1 }));
    });

    // R-FLOW-REDIS-02: set 方法支持 TTL
    it('Given object value with ttl, When set, Then use PX option', async () => {
      await service.set('token', { value: 1 }, 1000);
      expect(client.set).toHaveBeenCalledWith('token', JSON.stringify({ value: 1 }), 'PX', 1000);
    });

    // R-FLOW-REDIS-03: get 方法解析 JSON
    it('Given JSON string in redis, When get, Then parse and return object', async () => {
      client.get.mockResolvedValue(JSON.stringify({ bar: 2 }));
      const value = await service.get('token');
      expect(value).toEqual({ bar: 2 });
    });

    // R-FLOW-REDIS-04: commandStats 解析
    it('Given redis info, When commandStats, Then parse correctly', async () => {
      client.info.mockResolvedValue('cmdstat_get:calls=4,usec=10\r\n');
      const stats = await service.commandStats();
      expect(stats).toEqual([{ name: 'get', value: 4 }]);
    });
  });

  describe('分布式锁', () => {
    // R-CONCUR-LOCK-01: tryLock 成功返回 Token
    it('Given lock available, When tryLock, Then return UUID token', async () => {
      client.set.mockResolvedValue('OK');
      const token = await service.tryLock('lock:order:123', 10000);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      // UUID 格式验证
      expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(client.set).toHaveBeenCalledWith('lock:order:123', token, 'PX', 10000, 'NX');
    });

    // R-CONCUR-LOCK-02: tryLock 失败返回 null
    it('Given lock already held, When tryLock, Then return null', async () => {
      client.set.mockResolvedValue(null);
      const token = await service.tryLock('lock:order:123');

      expect(token).toBeNull();
    });

    // R-CONCUR-LOCK-03: unlock 使用 Lua 脚本比对 Token
    it('Given valid token, When unlock, Then use Lua script to compare and delete', async () => {
      client.eval.mockResolvedValue(1);
      const token = 'test-token-uuid';
      const result = await service.unlock('lock:order:123', token);

      expect(result).toBe(1);
      expect(client.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1]) == ARGV[1]'),
        1,
        'lock:order:123',
        token,
      );
    });

    // R-CONCUR-LOCK-04: unlock Token 不匹配返回 0
    it('Given invalid token, When unlock, Then return 0 without deleting', async () => {
      client.eval.mockResolvedValue(0);
      const result = await service.unlock('lock:order:123', 'wrong-token');

      expect(result).toBe(0);
    });

    // R-CONCUR-LOCK-05: 完整锁流程
    it('Given lock workflow, When tryLock then unlock with same token, Then succeed', async () => {
      client.set.mockResolvedValue('OK');
      client.eval.mockResolvedValue(1);

      const token = await service.tryLock('lock:test');
      expect(token).toBeTruthy();

      const unlockResult = await service.unlock('lock:test', token!);
      expect(unlockResult).toBe(1);
    });
  });

  describe('reset 方法', () => {
    // R-FLOW-RESET-01: 使用 SCAN 迭代删除
    it('Given keys in redis, When reset, Then use SCAN instead of keys *', async () => {
      // 模拟 SCAN 返回两批数据
      client.scan
        .mockResolvedValueOnce(['100', ['key1', 'key2', 'key3']])
        .mockResolvedValueOnce(['0', ['key4', 'key5']]);
      client.del.mockResolvedValue(3).mockResolvedValueOnce(3).mockResolvedValueOnce(2);

      const deletedCount = await service.reset();

      expect(client.scan).toHaveBeenCalledTimes(2);
      expect(client.scan).toHaveBeenCalledWith('0', 'COUNT', 100);
      expect(client.scan).toHaveBeenCalledWith('100', 'COUNT', 100);
      expect(client.del).toHaveBeenCalledTimes(2);
      expect(deletedCount).toBe(5);
    });

    // R-FLOW-RESET-02: 空数据库
    it('Given empty redis, When reset, Then return 0', async () => {
      client.scan.mockResolvedValue(['0', []]);

      const deletedCount = await service.reset();

      expect(deletedCount).toBe(0);
      expect(client.del).not.toHaveBeenCalled();
    });
  });
});
