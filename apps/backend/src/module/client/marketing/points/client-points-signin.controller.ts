import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { Member } from 'src/module/client/common/decorators/member.decorator';
import { MemberAuthGuard } from 'src/module/client/common/guards/member-auth.guard';
import { PointsSigninService } from 'src/module/marketing/points/signin/signin.service';

/**
 * C端积分签到控制器
 *
 * @tenantScope TenantBound（依赖会员登录态租户隔离）
 */
@ApiTags('C端-积分签到')
@ApiBearerAuth()
@Controller('client/marketing/points/signin')
@UseGuards(MemberAuthGuard)
export class ClientPointsSigninController {
  constructor(private readonly signinService: PointsSigninService) {}

  @Post()
  @Api({ summary: '用户签到' })
  async signin(@Member('memberId') memberId: string) {
    return this.signinService.signin(memberId);
  }

  @Get('status')
  @Api({ summary: '查询签到状态' })
  async checkSigninStatus(@Member('memberId') memberId: string) {
    return this.signinService.checkSigninStatus(memberId);
  }
}
