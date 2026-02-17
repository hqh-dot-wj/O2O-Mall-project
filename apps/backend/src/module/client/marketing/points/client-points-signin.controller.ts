import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Member } from 'src/module/client/common/decorators/member.decorator';
import { MemberAuthGuard } from 'src/module/client/common/guards/member-auth.guard';
import { PointsSigninService } from 'src/module/marketing/points/signin/signin.service';

/**
 * C端积分签到控制器
 */
@ApiTags('C端-积分签到')
@Controller('client/marketing/points/signin')
@UseGuards(MemberAuthGuard)
export class ClientPointsSigninController {
  constructor(private readonly signinService: PointsSigninService) {}

  @Post()
  @ApiOperation({ summary: '用户签到' })
  async signin(@Member('memberId') memberId: string) {
    return this.signinService.signin(memberId);
  }

  @Get('status')
  @ApiOperation({ summary: '查询签到状态' })
  async checkSigninStatus(@Member('memberId') memberId: string) {
    return this.signinService.checkSigninStatus(memberId);
  }
}
