// @ts-nocheck
import { AuthService } from './auth.service';
import { StatusEnum, CacheEnum } from 'src/common/enum';
import { ResponseCode } from 'src/common/response';

const createUserServiceMock = () => ({
  login: jest.fn(),
  register: jest.fn(),
});

const createLoginlogServiceMock = () => ({
  create: jest.fn(),
});

const createAxiosServiceMock = () => ({
  getIpAddress: jest.fn().mockResolvedValue('本地'),
});

const createRedisServiceMock = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
});

const createSysConfigServiceMock = () => ({
  getSystemConfigValue: jest.fn(),
});

const createConfigMock = () => ({
  tenant: { enabled: true },
});

const createPrismaMock = () => ({
  sysTenant: {
    findMany: jest.fn(),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let userService: ReturnType<typeof createUserServiceMock>;
  let loginlogService: ReturnType<typeof createLoginlogServiceMock>;
  let axiosService: ReturnType<typeof createAxiosServiceMock>;
  let redisService: ReturnType<typeof createRedisServiceMock>;
  let sysConfigService: ReturnType<typeof createSysConfigServiceMock>;
  let config: ReturnType<typeof createConfigMock>;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = createUserServiceMock();
    loginlogService = createLoginlogServiceMock();
    axiosService = createAxiosServiceMock();
    redisService = createRedisServiceMock();
    sysConfigService = createSysConfigServiceMock();
    config = createConfigMock();
    prisma = createPrismaMock();

    service = new AuthService(
      userService,
      loginlogService,
      axiosService,
      redisService,
      sysConfigService,
      config,
      prisma,
    );
  });

  describe('generateCaptcha', () => {
    // R-FLOW-CAPTCHA-01: 验证码开启时生成图片
    it('Given captchaEnabled=true, When generateCaptcha, Then return img+uuid', async () => {
      sysConfigService.getSystemConfigValue.mockResolvedValue('true');

      const result = await service.generateCaptcha();

      expect(result.code).toBe(200);
      expect(result.data.captchaEnabled).toBe(true);
      expect(result.data.img).toBeTruthy();
      expect(result.data.uuid).toBeTruthy();
      // 验证 Redis 存储
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining(CacheEnum.CAPTCHA_CODE_KEY),
        expect.any(String),
        expect.any(Number),
      );
    });

    // R-FLOW-CAPTCHA-02: 验证码关闭时返回空
    it('Given captchaEnabled=false, When generateCaptcha, Then return empty img', async () => {
      sysConfigService.getSystemConfigValue.mockResolvedValue('false');

      const result = await service.generateCaptcha();

      expect(result.code).toBe(200);
      expect(result.data.captchaEnabled).toBe(false);
      expect(result.data.img).toBe('');
      expect(result.data.uuid).toBe('');
      expect(redisService.set).not.toHaveBeenCalled();
    });

    // R-FLOW-CAPTCHA-03: 生成异常时返回错误
    it('Given captcha generation error, When generateCaptcha, Then return error result', async () => {
      sysConfigService.getSystemConfigValue.mockRejectedValue(new Error('config error'));

      // generateCaptcha catches errors internally
      // When getSystemConfigValue throws, captchaEnabled defaults to false
      // Let's test the case where createMath throws
      sysConfigService.getSystemConfigValue.mockResolvedValue('true');

      // Mock createMath to throw — we can't easily mock it since it's imported directly
      // Instead, test that the method handles Redis errors gracefully
      redisService.set.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.generateCaptcha();

      expect(result.code).toBe(ResponseCode.INTERNAL_SERVER_ERROR);
      expect(result.msg).toContain('验证码');
    });
  });

  describe('getTenantList', () => {
    // R-FLOW-TENANT-01: 多租户开启时返回租户列表
    it('Given tenantEnabled=true, When getTenantList, Then return tenant list from DB', async () => {
      prisma.sysTenant.findMany.mockResolvedValue([
        { tenantId: '000000', companyName: '默认租户', domain: '' },
        { tenantId: '000001', companyName: '测试租户', domain: 'test.com' },
      ]);

      const result = await service.getTenantList();

      expect(result.code).toBe(200);
      expect(result.data.tenantEnabled).toBe(true);
      expect(result.data.voList).toHaveLength(2);
      expect(result.data.voList[0].companyName).toBe('默认租户');
    });

    // R-FLOW-TENANT-02: 多租户关闭时返回空列表
    it('Given tenantEnabled=false, When getTenantList, Then return empty list', async () => {
      config.tenant.enabled = false;

      const result = await service.getTenantList();

      expect(result.code).toBe(200);
      expect(result.data.tenantEnabled).toBe(false);
      expect(result.data.voList).toEqual([]);
      expect(prisma.sysTenant.findMany).not.toHaveBeenCalled();
    });

    // R-FLOW-TENANT-03: 数据库异常时返回默认租户
    it('Given DB error, When getTenantList, Then return default tenant', async () => {
      prisma.sysTenant.findMany.mockRejectedValue(new Error('Table not found'));

      const result = await service.getTenantList();

      expect(result.code).toBe(200);
      expect(result.data.voList).toHaveLength(1);
      expect(result.data.voList[0].tenantId).toBe('000000');
      expect(result.data.voList[0].companyName).toBe('默认租户');
    });
  });
});
