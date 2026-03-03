// @ts-nocheck
import { SocialAuthService } from './social-auth.service';
import { BusinessException } from 'src/common/exceptions';
import { CacheEnum } from 'src/common/enum';

const createPrismaMock = () => ({
  sysUserSocial: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
});

const createRedisServiceMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
});

const createConfigMock = () => ({
  social: {
    github: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
  },
});

describe('SocialAuthService', () => {
  let service: SocialAuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let redisService: ReturnType<typeof createRedisServiceMock>;
  let config: ReturnType<typeof createConfigMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    redisService = createRedisServiceMock();
    config = createConfigMock();
    service = new SocialAuthService(prisma, redisService, config);
  });

  describe('generateState', () => {
    // R-FLOW-SOCIAL-01: 生成 state 并存入 Redis
    it('Given source, When generateState, Then return UUID and store in Redis', async () => {
      const state = await service.generateState('github');

      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('social_state:'),
        'github',
        5 * 60 * 1000,
      );
    });
  });

  describe('handleCallback', () => {
    // R-PRE-SOCIAL-01: 缺少 state 参数
    it('Given no state, When handleCallback, Then throw BAD_REQUEST', async () => {
      await expect(
        service.handleCallback({
          source: 'github',
          code: 'test-code',
          state: undefined,
          tenantId: '000000',
        }),
      ).rejects.toThrow(BusinessException);

      try {
        await service.handleCallback({
          source: 'github',
          code: 'test-code',
          state: undefined,
          tenantId: '000000',
        });
      } catch (e) {
        expect(e.getResponse().msg).toContain('state');
      }
    });

    // R-PRE-SOCIAL-02: state 不匹配
    it('Given mismatched state, When handleCallback, Then throw BAD_REQUEST', async () => {
      redisService.get.mockResolvedValue('wechat'); // stored source doesn't match

      await expect(
        service.handleCallback({
          source: 'github',
          code: 'test-code',
          state: 'some-state',
          tenantId: '000000',
        }),
      ).rejects.toThrow(BusinessException);

      redisService.get.mockResolvedValue('wechat');
      try {
        await service.handleCallback({
          source: 'github',
          code: 'test-code',
          state: 'some-state',
          tenantId: '000000',
        });
      } catch (e) {
        expect(e.getResponse().msg).toContain('state 验证失败');
      }
    });

    it('Given state not in Redis, When handleCallback, Then throw BAD_REQUEST', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(
        service.handleCallback({
          source: 'github',
          code: 'test-code',
          state: 'expired-state',
          tenantId: '000000',
        }),
      ).rejects.toThrow(BusinessException);
    });

    // R-PRE-SOCIAL-03: 不支持的社交平台
    it('Given unsupported source, When handleCallback, Then throw BAD_REQUEST', async () => {
      // Valid state first
      redisService.get.mockResolvedValue('unknown_platform');

      // Create service without github config to test unsupported platform
      const noGithubConfig = { social: {} };
      const svc = new SocialAuthService(prisma, redisService, noGithubConfig);

      redisService.get.mockResolvedValue('unknown_platform');
      await expect(
        svc.handleCallback({
          source: 'unknown_platform',
          code: 'test-code',
          state: 'valid-state',
          tenantId: '000000',
        }),
      ).rejects.toThrow(BusinessException);
    });

    // R-FLOW-SOCIAL-02: 已绑定用户返回 userId
    it('Given valid callback with bound user, When handleCallback, Then return userId', async () => {
      // Mock state validation
      redisService.get.mockResolvedValueOnce('github'); // state matches

      // Mock GitHub API via strategy — we need to mock fetch
      const mockFetchResponses = [
        // Token exchange
        { json: () => Promise.resolve({ access_token: 'gh-token' }) },
        // User info
        { json: () => Promise.resolve({ id: 12345, login: 'testuser', avatar_url: 'https://avatar.url', name: 'Test User' }) },
      ];
      let fetchCallCount = 0;
      global.fetch = jest.fn(() => Promise.resolve(mockFetchResponses[fetchCallCount++]));

      // Mock DB lookup — user is bound
      prisma.sysUserSocial.findUnique.mockResolvedValue({ userId: 42 });

      const result = await service.handleCallback({
        source: 'github',
        code: 'valid-code',
        state: 'valid-state',
        tenantId: '000000',
      });

      expect(result.userId).toBe(42);
      expect(result.socialUser.openid).toBe('12345');
      expect(result.socialUser.nickname).toBe('Test User');

      // state should be consumed (deleted)
      expect(redisService.del).toHaveBeenCalled();
    });

    // R-FLOW-SOCIAL-03: 未绑定用户返回 null userId
    it('Given valid callback with unbound user, When handleCallback, Then return null userId', async () => {
      redisService.get.mockResolvedValueOnce('github');

      const mockFetchResponses = [
        { json: () => Promise.resolve({ access_token: 'gh-token' }) },
        { json: () => Promise.resolve({ id: 99999, login: 'newuser', avatar_url: '', name: 'New User' }) },
      ];
      let fetchCallCount = 0;
      global.fetch = jest.fn(() => Promise.resolve(mockFetchResponses[fetchCallCount++]));

      prisma.sysUserSocial.findUnique.mockResolvedValue(null);

      const result = await service.handleCallback({
        source: 'github',
        code: 'valid-code',
        state: 'valid-state',
        tenantId: '000000',
      });

      expect(result.userId).toBeNull();
      expect(result.socialUser.openid).toBe('99999');
    });

    // R-FLOW-SOCIAL-05: 第三方 API 失败
    it('Given third-party API failure, When handleCallback, Then throw EXTERNAL_SERVICE_ERROR', async () => {
      redisService.get.mockResolvedValueOnce('github');

      global.fetch = jest.fn(() => Promise.resolve({
        json: () => Promise.resolve({ error: 'bad_verification_code' }),
      }));

      await expect(
        service.handleCallback({
          source: 'github',
          code: 'invalid-code',
          state: 'valid-state',
          tenantId: '000000',
        }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('bindSocialUser', () => {
    // R-FLOW-SOCIAL-04: 绑定社交账号
    it('Given userId+socialUser, When bindSocialUser, Then upsert record in DB', async () => {
      prisma.sysUserSocial.upsert.mockResolvedValue({});

      await service.bindSocialUser(
        42,
        'github',
        { openid: '12345', nickname: 'testuser', avatar: 'https://avatar.url' },
        '000000',
      );

      expect(prisma.sysUserSocial.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            source_openid_tenantId: { source: 'github', openid: '12345', tenantId: '000000' },
          },
          create: expect.objectContaining({
            userId: 42,
            source: 'github',
            openid: '12345',
          }),
          update: expect.objectContaining({
            userId: 42,
            nickname: 'testuser',
          }),
        }),
      );
    });
  });

  afterEach(() => {
    // Clean up global fetch mock
    if (global.fetch) {
      delete global.fetch;
    }
  });
});
