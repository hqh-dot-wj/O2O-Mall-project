// @ts-nocheck
import { SessionService } from './session.service';
import { CacheEnum } from 'src/common/enum';
import { LOGIN_TOKEN_EXPIRESIN } from 'src/common/constant';

const createRedisServiceMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  mget: jest.fn(),
});

describe('SessionService', () => {
  let service: SessionService;
  let redisService: ReturnType<typeof createRedisServiceMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    redisService = createRedisServiceMock();
    service = new SessionService(redisService);
  });

  describe('saveSession', () => {
    // R-FLOW-SESS-01: 保存会话到 Redis
    it('Given uuid+data, When saveSession, Then Redis set with correct key and TTL', async () => {
      const sessionData = { userId: 1, userName: 'admin' };
      await service.saveSession('test-uuid', sessionData);

      expect(redisService.set).toHaveBeenCalledWith(
        `${CacheEnum.LOGIN_TOKEN_KEY}test-uuid`,
        sessionData,
        LOGIN_TOKEN_EXPIRESIN,
      );
    });

    it('Given custom TTL, When saveSession, Then use custom TTL', async () => {
      const sessionData = { userId: 1 };
      await service.saveSession('test-uuid', sessionData, 60000);

      expect(redisService.set).toHaveBeenCalledWith(
        `${CacheEnum.LOGIN_TOKEN_KEY}test-uuid`,
        sessionData,
        60000,
      );
    });
  });

  describe('getSession', () => {
    // R-FLOW-SESS-02: 获取已存在的会话
    it('Given existing session, When getSession, Then return session data', async () => {
      const sessionData = { userId: 1, userName: 'admin' };
      redisService.get.mockResolvedValue(sessionData);

      const result = await service.getSession('test-uuid');

      expect(result).toEqual(sessionData);
      expect(redisService.get).toHaveBeenCalledWith(`${CacheEnum.LOGIN_TOKEN_KEY}test-uuid`);
    });

    // R-PRE-SESS-01: 会话不存在时返回 null
    it('Given non-existent uuid, When getSession, Then return null', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.getSession('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    // R-FLOW-SESS-03: 删除会话
    it('Given uuid, When deleteSession, Then Redis del called', async () => {
      await service.deleteSession('test-uuid');

      expect(redisService.del).toHaveBeenCalledWith(`${CacheEnum.LOGIN_TOKEN_KEY}test-uuid`);
    });
  });

  describe('refreshSessionTtl', () => {
    // R-FLOW-SESS-04: 延长会话有效期
    it('Given existing session, When refreshSessionTtl, Then Redis set with new TTL', async () => {
      const sessionData = { userId: 1 };
      redisService.get.mockResolvedValue(sessionData);

      await service.refreshSessionTtl('test-uuid', 120000);

      expect(redisService.set).toHaveBeenCalledWith(
        `${CacheEnum.LOGIN_TOKEN_KEY}test-uuid`,
        sessionData,
        120000,
      );
    });

    // R-PRE-SESS-02: 会话不存在时静默跳过
    it('Given non-existent session, When refreshSessionTtl, Then no-op', async () => {
      redisService.get.mockResolvedValue(null);

      await service.refreshSessionTtl('non-existent', 120000);

      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('getOnlineUsers', () => {
    const mockSessionData = [
      {
        token: 'uuid-1',
        userName: 'admin',
        user: { deptName: '技术部' },
        ipaddr: '192.168.1.1',
        loginLocation: '本地',
        browser: 'Chrome',
        os: 'Windows',
        loginTime: new Date('2026-03-03'),
        deviceType: 'PC',
      },
      {
        token: 'uuid-2',
        userName: 'user1',
        user: { deptName: '市场部' },
        ipaddr: '10.0.0.1',
        loginLocation: '北京',
        browser: 'Firefox',
        os: 'Mac',
        loginTime: new Date('2026-03-03'),
        deviceType: 'PC',
      },
    ];

    // R-FLOW-SESS-05: 返回在线用户列表
    it('Given Redis keys with sessions, When getOnlineUsers, Then return parsed list', async () => {
      redisService.keys.mockResolvedValue([
        `${CacheEnum.LOGIN_TOKEN_KEY}uuid-1`,
        `${CacheEnum.LOGIN_TOKEN_KEY}uuid-2`,
      ]);
      redisService.mget.mockResolvedValue(mockSessionData);

      const result = await service.getOnlineUsers({});

      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
      expect(result.list[0].tokenId).toBe('uuid-1');
      expect(result.list[0].userName).toBe('admin');
      expect(result.list[0].deptName).toBe('技术部');
    });

    // R-FLOW-SESS-06: 无在线用户时返回空列表
    it('Given no Redis keys, When getOnlineUsers, Then return empty list', async () => {
      redisService.keys.mockResolvedValue([]);

      const result = await service.getOnlineUsers({});

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('Given null keys, When getOnlineUsers, Then return empty list', async () => {
      redisService.keys.mockResolvedValue(null);

      const result = await service.getOnlineUsers({});

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    // R-FLOW-SESS-07: 按用户名过滤
    it('Given userName filter, When getOnlineUsers, Then filter by userName', async () => {
      redisService.keys.mockResolvedValue(['key1', 'key2']);
      redisService.mget.mockResolvedValue(mockSessionData);

      const result = await service.getOnlineUsers({ userName: 'admin' });

      expect(result.total).toBe(1);
      expect(result.list[0].userName).toBe('admin');
    });

    // R-FLOW-SESS-08: 分页
    it('Given pageNum+pageSize, When getOnlineUsers, Then return paginated results', async () => {
      redisService.keys.mockResolvedValue(['key1', 'key2']);
      redisService.mget.mockResolvedValue(mockSessionData);

      const result = await service.getOnlineUsers({ pageNum: 1, pageSize: 1 });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('Given ipaddr filter, When getOnlineUsers, Then filter by ipaddr', async () => {
      redisService.keys.mockResolvedValue(['key1', 'key2']);
      redisService.mget.mockResolvedValue(mockSessionData);

      const result = await service.getOnlineUsers({ ipaddr: '10.0.0' });

      expect(result.total).toBe(1);
      expect(result.list[0].userName).toBe('user1');
    });
  });

  describe('isSessionActive', () => {
    // R-FLOW-SESS-09: 会话存在返回 true
    it('Given existing session, When isSessionActive, Then return true', async () => {
      redisService.get.mockResolvedValue({ userId: 1 });

      const result = await service.isSessionActive('test-uuid');

      expect(result).toBe(true);
    });

    // R-FLOW-SESS-10: 会话不存在返回 false
    it('Given non-existent session, When isSessionActive, Then return false', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.isSessionActive('non-existent');

      expect(result).toBe(false);
    });
  });
});
