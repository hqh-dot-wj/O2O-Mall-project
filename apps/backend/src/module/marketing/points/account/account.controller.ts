import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { Result } from 'src/common/response/result';
import { PointsAccountService } from './account.service';
import { AddPointsDto } from './dto/add-points.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { PointsBalanceVo } from './vo/points-account.vo';

/**
 * 积分账户控制器（客户端）
 * 
 * @description 提供用户积分查询接口
 */
@ApiTags('积分账户')
@Controller('client/marketing/points')
export class PointsAccountClientController {
  constructor(private readonly accountService: PointsAccountService) {}

  @Get('balance')
  @ApiOperation({ summary: '查询积分余额' })
  async getBalance(@User('id') memberId: string): Promise<Result<PointsBalanceVo>> {
    return this.accountService.getBalance(memberId);
  }

  @Get('transactions')
  @ApiOperation({ summary: '查询积分明细' })
  async getTransactions(
    @User('id') memberId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.accountService.getTransactions(memberId, query);
  }

  @Get('expiring')
  @ApiOperation({ summary: '查询即将过期的积分' })
  async getExpiringPoints(
    @User('id') memberId: string,
    @Query('days') days?: number,
  ) {
    return this.accountService.getExpiringPoints(memberId, days);
  }
}

/**
 * 积分账户控制器（管理端）
 * 
 * @description 提供管理员积分管理接口
 */
@ApiTags('积分账户管理')
@Controller('admin/marketing/points')
export class PointsAccountAdminController {
  constructor(private readonly accountService: PointsAccountService) {}

  @Post('adjust')
  @ApiOperation({ summary: '调整用户积分' })
  async adjustPoints(@Body() dto: AddPointsDto) {
    return this.accountService.addPoints(dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: '查询积分账户列表' })
  async getAccounts(
    @Query('pageNum') pageNum?: number,
    @Query('pageSize') pageSize?: number,
    @Query('memberId') memberId?: string,
  ) {
    return this.accountService.getAccountsForAdmin({
      pageNum: pageNum ? Number(pageNum) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      memberId,
    });
  }

  @Get('transactions')
  @ApiOperation({ summary: '查询积分交易记录' })
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.accountService.getTransactionsForAdmin({
      memberId: query.memberId,
      type: query.type,
      startTime: query.startTime,
      endTime: query.endTime,
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
    });
  }
}
