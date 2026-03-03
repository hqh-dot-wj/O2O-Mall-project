import { Injectable, Logger } from '@nestjs/common';
import { Result, SUCCESS_CODE } from 'src/common/response';
import { UserService } from '../system/user/user.service';
import { LoginlogService } from '../monitor/loginlog/loginlog.service';
import { AxiosService } from 'src/module/common/axios/axios.service';
import { RegisterDto, LoginDto } from './dto';
import { ClientInfoDto } from 'src/common/decorators/common.decorator';
import { StatusEnum, CacheEnum } from 'src/common/enum/index';
import { RedisService } from 'src/module/common/redis/redis.service';
import { AppConfigService } from 'src/config/app-config.service';
import { ConfigService as SysConfigService } from 'src/module/admin/system/config/config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/common/tenant';
import { GenerateUUID } from 'src/common/utils/index';
import { createMath } from 'src/common/utils/captcha';
import { ResponseCode } from 'src/common/response';
import { CaptchaCodeVo, LoginTenantVo } from './vo/auth.vo';
import { getErrorMessage } from 'src/common/utils/error';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly loginlogService: LoginlogService,
    private readonly axiosService: AxiosService,
    private readonly redisService: RedisService,
    private readonly sysConfigService: SysConfigService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 生成验证码
   *
   * @description 从系统配置读取验证码开关，生成数学运算验证码并存入 Redis
   * @returns 验证码信息（含 Base64 图片）
   */
  async generateCaptcha(): Promise<Result<CaptchaCodeVo>> {
    const enable = await this.sysConfigService.getSystemConfigValue('sys.account.captchaEnabled');
    const captchaEnabled: boolean = enable === 'true';

    const result: CaptchaCodeVo = { captchaEnabled, uuid: '', img: '' };

    if (!captchaEnabled) {
      return Result.ok(result);
    }

    try {
      const captchaInfo = createMath();
      result.img = captchaInfo.data;
      result.uuid = GenerateUUID();
      await this.redisService.set(
        CacheEnum.CAPTCHA_CODE_KEY + result.uuid,
        captchaInfo.text.toLowerCase(),
        1000 * 60 * 5,
      );
    } catch (err) {
      this.logger.error('生成验证码错误:', getErrorMessage(err));
      return Result.fail(ResponseCode.INTERNAL_SERVER_ERROR, '生成验证码错误，请重试');
    }

    return Result.ok(result);
  }

  /**
   * 获取租户列表
   *
   * @description 查询所有正常状态的租户，多租户关闭时返回空列表
   * @returns 租户列表
   */
  async getTenantList(): Promise<Result<LoginTenantVo>> {
    const tenantEnabled = this.config.tenant.enabled;
    const result: LoginTenantVo = { tenantEnabled, voList: [] };

    if (!tenantEnabled) {
      return Result.ok(result);
    }

    try {
      const tenants = await this.prisma.sysTenant.findMany({
        where: { status: StatusEnum.NORMAL },
        select: { tenantId: true, companyName: true, domain: true },
        orderBy: { createTime: 'asc' },
      });

      result.voList = tenants.map((t) => ({
        tenantId: t.tenantId,
        companyName: t.companyName,
        domain: t.domain || '',
      }));
    } catch (error) {
      this.logger.warn('SysTenant table may not exist yet:', getErrorMessage(error));
      result.voList = [
        { tenantId: TenantContext.SUPER_TENANT_ID, companyName: '默认租户', domain: '' },
      ];
    }

    return Result.ok(result);
  }

  /**
   * 用户登录（含日志记录）
   *
   * @param user 登录信息
   * @param clientInfo 客户端信息
   * @returns 登录结果
   */
  async login(user: LoginDto, clientInfo: ClientInfoDto) {
    const loginLog = {
      ...clientInfo,
      status: StatusEnum.NORMAL as StatusEnum,
      msg: '',
    };

    // 异步获取登录位置，不阻塞登录流程
    this.axiosService
      .getIpAddress(clientInfo.ipaddr)
      .then((loginLocation) => { loginLog.loginLocation = loginLocation; })
      .catch(() => { loginLog.loginLocation = '未知'; });

    const loginRes = await this.userService.login(user, loginLog);
    loginLog.status = loginRes.code === SUCCESS_CODE ? StatusEnum.NORMAL : StatusEnum.STOP;
    loginLog.msg = loginRes.msg;
    this.loginlogService.create(loginLog);
    return loginRes;
  }

  /**
   * 退出登录
   *
   * @param clientInfo 客户端信息
   */
  async logout(clientInfo: ClientInfoDto) {
    const loginLog = {
      ...clientInfo,
      status: StatusEnum.NORMAL,
      msg: '退出成功',
    };

    this.axiosService
      .getIpAddress(clientInfo.ipaddr)
      .then((loginLocation) => { loginLog.loginLocation = loginLocation; })
      .catch(() => { loginLog.loginLocation = '未知'; });

    this.loginlogService.create(loginLog);
    return Result.ok();
  }

  /**
   * 用户注册
   *
   * @param user 注册信息
   */
  async register(user: RegisterDto) {
    return await this.userService.register(user);
  }
}
