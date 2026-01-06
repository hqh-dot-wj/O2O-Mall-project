import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CheckLoginDto, RegisterMobileDto } from './dto/auth.dto';

@ApiTags('C端-认证模块')
@Controller('client/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiOperation({ summary: '静默登录检查' })
  @Post('check-login')
  checkLogin(@Body() dto: CheckLoginDto) {
    return this.authService.checkLogin(dto);
  }

  @ApiOperation({ summary: '手机号一键注册/登录' })
  @Post('register-mobile')
  registerMobile(@Body() dto: RegisterMobileDto) {
    return this.authService.registerMobile(dto);
  }
}
