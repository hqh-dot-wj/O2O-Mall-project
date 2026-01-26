import { Controller, Post, Body, Get, Headers, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CheckLoginDto, RegisterDto, BindPhoneDto } from './dto/auth.dto';
import { Api } from 'src/common/decorators/api.decorator';
import { LoginResultVo } from './vo';

@ApiTags('C端-认证模块')
@Controller('client/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Api({ summary: '静默登录检查', type: LoginResultVo })
  @Post('check-login')
  checkLogin(@Body() dto: CheckLoginDto) {
    return this.authService.checkLogin(dto);
  }

  @Api({ summary: '注册/登录（无需手机号）', type: LoginResultVo })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Api({ summary: '绑定手机号', security: true })
  @ApiBearerAuth()
  @Post('bind-phone')
  bindPhone(@Req() req: any, @Body() dto: BindPhoneDto) {
    // 从 JWT 中获取 memberId
    const memberId = req.user?.memberId;
    return this.authService.bindPhone(memberId, dto);
  }

  @Api({ summary: '手机号一键登录/注册', type: LoginResultVo })
  @Post('register-mobile')
  registerMobile(@Body() dto: RegisterDto) {
    return this.authService.registerMobile(dto);
  }

  @ApiOperation({ summary: '退出登录' })
  @Get('logout')
  logout(@Headers('authorization') token: string) {
    return this.authService.logout(token);
  }
}
