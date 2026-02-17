import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Member } from 'src/module/client/common/decorators/member.decorator';
import { MemberAuthGuard } from 'src/module/client/common/guards/member-auth.guard';
import { Result } from 'src/common/response/result';
import { PointsAccountService } from 'src/module/marketing/points/account/account.service';
import { TransactionQueryDto } from 'src/module/marketing/points/account/dto/transaction-query.dto';
import { PointsBalanceVo } from 'src/module/marketing/points/account/vo/points-account.vo';

/**
 * C端积分账户控制器
 */
@ApiTags('C端-积分账户')
@Controller('client/marketing/points')
@UseGuards(MemberAuthGuard)
export class ClientPointsAccountController {
  constructor(private readonly accountService: PointsAccountService) {}

  @Get('balance')
  @ApiOperation({ summary: '查询积分余额' })
  async getBalance(
    @Member('memberId') memberId: string,
  ): Promise<Result<PointsBalanceVo>> {
    return this.accountService.getBalance(memberId);
  }

  @Get('transactions')
  @ApiOperation({ summary: '查询积分明细' })
  async getTransactions(
    @Member('memberId') memberId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.accountService.getTransactions(memberId, query);
  }

  @Get('expiring')
  @ApiOperation({ summary: '查询即将过期的积分' })
  async getExpiringPoints(
    @Member('memberId') memberId: string,
    @Query('days') days?: number,
  ) {
    return this.accountService.getExpiringPoints(memberId, days);
  }
}
