import { Controller, Post, Body, Get, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { CheckLoginDto, RegisterDto } from './dto/auth.dto';
import { Api } from 'src/common/decorators/api.decorator';
import { LoginResultVo } from './vo';
import { SocialPlatform } from '@prisma/client';

/**
 * Worker 端（师傅小程序）认证 Controller
 *
 * @description
 * 薄 Controller，复用 AuthService 的业务逻辑，
 * 仅将 platform 固定为 MP_WORK。
 * 后续 Worker 有独立用户表时，可切换到 WorkerAuthService。
 *
 * @tenantScope TenantAgnostic（登录/注册阶段租户由参数决定）
 */
@ApiTags('Worker端-认证模块')
@Controller('client/worker-auth')
export class WorkerAuthController {
  constructor(private readonly authService: AuthService) {}

  @Api({ summary: '师傅端-静默登录检查', type: LoginResultVo })
  @Post('check-login')
  checkLogin(@Body() dto: CheckLoginDto) {
    return this.authService.checkLogin(dto, SocialPlatform.MP_WORK);
  }

  @Api({ summary: '师傅端-注册/登录', type: LoginResultVo })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto, SocialPlatform.MP_WORK);
  }

  @Api({ summary: '师傅端-手机号一键登录/注册', type: LoginResultVo })
  @Post('register-mobile')
  registerMobile(@Body() dto: RegisterDto) {
    return this.authService.registerMobile(dto, SocialPlatform.MP_WORK);
  }

  @Api({ summary: '师傅端-退出登录' })
  @Get('logout')
  logout(@Headers('authorization') token: string) {
    return this.authService.logout(token);
  }
}
