// @ts-nocheck
import { TokenService } from './token.service';
import { BusinessException } from 'src/common/exceptions';
import { CacheEnum } from 'src/common/enum';

const createJwtServiceMock = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
});

const createRedisServiceMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
});

const createConfigMock = () => ({
  jwt: {
    secretkey: 'test-secret',
    expiresin: '1h',
    refreshExpiresIn: '2h',
  },
});

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: ReturnType<typeof createJwtServiceMock>;
  let redisService: ReturnType<typeof createRedisServiceMock>;
  let config: ReturnType<typeof createConfigMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService = createJwtServiceMock();
    redisService = createRedisServiceMock();
    config = createConfigMock();
    service = new TokenService(jwtService, redisService, config);
  });

  describe('generateTokenPair', () => {
    beforeEach(() => {
      jwtService.sign.mockImplementation((payload, opts) => {
        return `jwt-${payload.type}-${payload.userId}`;
      });
    });

    // R-FLOW-TOKEN-01: access_token 包含 type=access
    it('Given userId+uuid, When generateTokenPair, Then access_token payload has type=access', () => {
      const result = service.generateTokenPair(1, 'test-uuid');

      const firstCall = jwtService.sign.mock.calls[0];
      expect(firstCall[0].type).toBe('access');
      expect(firstCall[0].userId).toBe(1);
      expect(firstCall[0].uuid).toBe('test-uuid');
      expect(result.accessToken).toBe('jwt-access-1');
    });

    // R-FLOW-TOKEN-02: refresh_token 包含 type=refresh
    it('Given userId+uuid, When generateTokenPair, Then refresh_token payload has type=refresh', () => {
      const result = service.generateTokenPair(1, 'test-uuid');

      const secondCall = jwtService.sign.mock.calls[1];
      expect(secondCall[0].type).toBe('refresh');
      expect(secondCall[0].userId).toBe(1);
      expect(result.refreshToken).toBe('jwt-refresh-1');
    });

    // R-FLOW-TOKEN-03: jti 不同
    it('Given userId+uuid, When generateTokenPair, Then access and refresh jti are different', () => {
      service.generateTokenPair(1, 'test-uuid');

      const accessJti = jwtService.sign.mock.calls[0][0].jti;
      const refreshJti = jwtService.sign.mock.calls[1][0].jti;
      expect(accessJti).not.toBe(refreshJti);
      expect(accessJti).toBeTruthy();
      expect(refreshJti).toBeTruthy();
    });

    it('Given config expiresin=1h, When generateTokenPair, Then accessExpireIn=3600', () => {
      const result = service.generateTokenPair(1, 'test-uuid');
      expect(result.accessExpireIn).toBe(3600);
      expect(result.refreshExpireIn).toBe(7200);
    });
  });

  describe('verifyAccessToken', () => {
    // R-PRE-TOKEN-02: access_token type 必须为 access
    it('Given token with type=access, When verifyAccessToken, Then return payload', () => {
      jwtService.verify.mockReturnValue({ uuid: 'u', userId: 1, type: 'access', jti: 'j' });
      const result = service.verifyAccessToken('some-token');
      expect(result).toEqual({ uuid: 'u', userId: 1, type: 'access', jti: 'j' });
    });

    it('Given token with type=refresh, When verifyAccessToken, Then return null', () => {
      jwtService.verify.mockReturnValue({ uuid: 'u', userId: 1, type: 'refresh', jti: 'j' });
      const result = service.verifyAccessToken('some-token');
      expect(result).toBeNull();
    });

    it('Given invalid token, When verifyAccessToken, Then return null', () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      const result = service.verifyAccessToken('bad-token');
      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('Given token with type=refresh, When verifyRefreshToken, Then return payload', () => {
      jwtService.verify.mockReturnValue({ uuid: 'u', userId: 1, type: 'refresh', jti: 'j' });
      const result = service.verifyRefreshToken('some-token');
      expect(result).toEqual({ uuid: 'u', userId: 1, type: 'refresh', jti: 'j' });
    });

    it('Given token with type=access, When verifyRefreshToken, Then return null', () => {
      jwtService.verify.mockReturnValue({ uuid: 'u', userId: 1, type: 'access', jti: 'j' });
      const result = service.verifyRefreshToken('some-token');
      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    const validPayload = { uuid: 'session-uuid', userId: 1, type: 'refresh', jti: 'old-jti' };

    beforeEach(() => {
      jwtService.sign.mockImplementation((payload) => `new-jwt-${payload.type}`);
    });

    // R-FLOW-TOKEN-04: 刷新成功返回新 Token 对
    it('Given valid refresh_token, When refreshToken, Then return new TokenPair', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      redisService.get.mockResolvedValueOnce(null); // blacklist check → not found
      redisService.get.mockResolvedValueOnce({ userId: 1 }); // session exists

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-jwt-access');
      expect(result.refreshToken).toBe('new-jwt-refresh');
      expect(result.accessExpireIn).toBe(3600);
      expect(result.refreshExpireIn).toBe(7200);
    });

    // R-FLOW-TOKEN-05: 旧 jti 加入黑名单
    it('Given valid refresh_token, When refreshToken, Then old jti is blacklisted', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      redisService.get.mockResolvedValueOnce(null); // not blacklisted
      redisService.get.mockResolvedValueOnce({ userId: 1 }); // session

      await service.refreshToken('valid-refresh-token');

      // 检查黑名单写入
      const blacklistCall = redisService.set.mock.calls.find(
        (call) => call[0].includes(CacheEnum.REFRESH_TOKEN_BLACKLIST_KEY),
      );
      expect(blacklistCall).toBeTruthy();
      expect(blacklistCall[0]).toContain('old-jti');
      expect(blacklistCall[1]).toBe('revoked');
    });

    // R-FLOW-TOKEN-06: 更新会话 TTL
    it('Given valid refresh_token, When refreshToken, Then session TTL updated', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      redisService.get.mockResolvedValueOnce(null);
      redisService.get.mockResolvedValueOnce({ userId: 1 });

      await service.refreshToken('valid-refresh-token');

      const sessionCall = redisService.set.mock.calls.find(
        (call) => call[0].includes(CacheEnum.LOGIN_TOKEN_KEY),
      );
      expect(sessionCall).toBeTruthy();
      expect(sessionCall[0]).toContain('session-uuid');
    });

    // R-PRE-TOKEN-01: JWT 无效
    it('Given expired JWT, When refreshToken, Then throw UNAUTHORIZED', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('expired'); });

      await expect(service.refreshToken('expired-token')).rejects.toThrow(BusinessException);

      try {
        await service.refreshToken('expired-token');
      } catch (e) {
        expect(e.getResponse().msg).toBe('刷新令牌无效');
      }
    });

    // R-PRE-TOKEN-03: jti 在黑名单中
    it('Given blacklisted jti, When refreshToken, Then throw UNAUTHORIZED', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      redisService.get.mockResolvedValueOnce('revoked'); // blacklisted

      await expect(service.refreshToken('blacklisted-token')).rejects.toThrow(BusinessException);

      jwtService.verify.mockReturnValue(validPayload);
      redisService.get.mockResolvedValueOnce('revoked');
      try {
        await service.refreshToken('blacklisted-token');
      } catch (e) {
        expect(e.getResponse().msg).toBe('刷新令牌已失效');
      }
    });

    // R-PRE-TOKEN-04: 会话不存在
    it('Given no session in Redis, When refreshToken, Then throw UNAUTHORIZED', async () => {
      jwtService.verify.mockReturnValue(validPayload);
      redisService.get.mockResolvedValueOnce(null); // not blacklisted
      redisService.get.mockResolvedValueOnce(null); // no session

      await expect(service.refreshToken('orphan-token')).rejects.toThrow(BusinessException);

      jwtService.verify.mockReturnValue(validPayload);
      redisService.get.mockResolvedValueOnce(null);
      redisService.get.mockResolvedValueOnce(null);
      try {
        await service.refreshToken('orphan-token');
      } catch (e) {
        expect(e.getResponse().msg).toBe('会话已失效，请重新登录');
      }
    });
  });

  describe('decodePayload', () => {
    it('Given valid token, When decodePayload, Then return uuid and userId', () => {
      jwtService.verify.mockReturnValue({ uuid: 'u1', userId: 42, iat: 123 });
      const result = service.decodePayload('valid-token');
      expect(result).toEqual({ uuid: 'u1', userId: 42 });
    });

    // R-BRANCH-TOKEN-04: 无效 token 返回 null
    it('Given invalid token, When decodePayload, Then return null', () => {
      jwtService.verify.mockImplementation(() => { throw new Error('bad'); });
      const result = service.decodePayload('bad-token');
      expect(result).toBeNull();
    });

    it('Given empty string, When decodePayload, Then return null', () => {
      const result = service.decodePayload('');
      expect(result).toBeNull();
    });

    it('Given Bearer prefix, When decodePayload, Then strip prefix', () => {
      jwtService.verify.mockReturnValue({ uuid: 'u1', userId: 1 });
      service.decodePayload('Bearer some-token');
      expect(jwtService.verify).toHaveBeenCalledWith('some-token');
    });
  });

  describe('parseExpiresIn', () => {
    // R-FLOW-TOKEN-07: 时间字符串解析
    it.each([
      ['1h', 3600],
      ['2h', 7200],
      ['30m', 1800],
      ['7d', 604800],
      ['3600s', 3600],
      ['3600', 3600],
      ['invalid', 3600],
    ])('Given "%s", When parseExpiresIn, Then %d', (input, expected) => {
      expect(service.parseExpiresIn(input)).toBe(expected);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('Given revoked jti, When isTokenBlacklisted, Then true', async () => {
      redisService.get.mockResolvedValue('revoked');
      expect(await service.isTokenBlacklisted('some-jti')).toBe(true);
    });

    it('Given non-existent jti, When isTokenBlacklisted, Then false', async () => {
      redisService.get.mockResolvedValue(null);
      expect(await service.isTokenBlacklisted('some-jti')).toBe(false);
    });
  });
});
