import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UpgradeService } from './upgrade.service';
import { ApplyUpgradeDto } from './dto/upgrade.dto';
import { User } from 'src/common/decorators/user.decorator';
import { Result } from 'src/common/response';
import { MemberAuthGuard } from '../common/guards/member-auth.guard';

@ApiTags('Client-Upgrade')
@ApiBearerAuth()
@UseGuards(MemberAuthGuard)
@Controller('client/upgrade')
export class UpgradeController {
  constructor(private readonly upgradeService: UpgradeService) {}

  @ApiOperation({ summary: '申请升级 (扫码)' })
  @Post('apply')
  async applyUpgrade(@User() user: { memberId: string }, @Body() dto: ApplyUpgradeDto) {
    return this.upgradeService.applyUpgrade(user.memberId, dto);
  }

  @ApiOperation({ summary: '获取升级申请状态' })
  @Get('status')
  async getUpgradeStatus(@User() user: { memberId: string }) {
    const result = await this.upgradeService.getUpgradeStatus(user.memberId);
    return Result.ok(result);
  }

  @ApiOperation({ summary: '获取我的推荐码 (仅C2)' })
  @Get('referral-code')
  async getMyReferralCode(@User() user: { memberId: string }) {
    const result = await this.upgradeService.getMyReferralCode(user.memberId);
    return Result.ok(result);
  }

  @ApiOperation({ summary: '获取团队统计' })
  @Get('team/stats')
  async getTeamStats(@User() user: { memberId: string }) {
    const result = await this.upgradeService.getTeamStats(user.memberId);
    return Result.ok(result);
  }

  @ApiOperation({ summary: '获取团队列表' })
  @Get('team/list')
  async getTeamList(
    @User() user: { memberId: string },
    @Query('type') type: 'direct' | 'indirect' = 'direct',
    @Query('pageNum') pageNum: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.upgradeService.getTeamList(user.memberId, type, pageNum, pageSize);
  }
}
