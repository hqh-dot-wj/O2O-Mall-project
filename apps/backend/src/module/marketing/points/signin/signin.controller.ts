import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { PointsSigninService } from './signin.service';

/**
 * 积分签到控制器
 * 
 * @description 提供用户签到接口
 */
@ApiTags('积分签到')
@Controller('client/marketing/points/signin')
export class PointsSigninController {
  constructor(private readonly signinService: PointsSigninService) {}

  @Post()
  @ApiOperation({ summary: '用户签到' })
  async signin(@User('id') memberId: string) {
    return this.signinService.signin(memberId);
  }

  @Get('status')
  @ApiOperation({ summary: '查询签到状态' })
  async checkSigninStatus(@User('id') memberId: string) {
    return this.signinService.checkSigninStatus(memberId);
  }
}
