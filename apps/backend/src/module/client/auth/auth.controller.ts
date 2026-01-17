import { Controller, Post, Body, Get, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CheckLoginDto, RegisterMobileDto } from './dto/auth.dto';
import { Api } from 'src/common/decorators/api.decorator';
import { LoginResultVo } from './vo';

@ApiTags('C端-认证模块')
@Controller('client/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Api({ summary: '静默登录检查', type: LoginResultVo })
  @Post('check-login')
  checkLogin(@Body() dto: CheckLoginDto) {
    return this.authService.checkLogin(dto);
  }

  @Api({ summary: '手机号一键注册/登录', type: LoginResultVo })
  @Post('register-mobile')
  registerMobile(@Body() dto: RegisterMobileDto) {
    return this.authService.registerMobile(dto);
  }

  @ApiOperation({ summary: '退出登录' })
  @Get('logout')
  logout(@Headers('authorization') token: string) {
    return this.authService.logout(token);
  }
}
