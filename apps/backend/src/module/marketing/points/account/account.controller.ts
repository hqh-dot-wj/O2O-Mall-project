import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PointsTransactionType } from '@prisma/client';
import { PointsAccountService } from './account.service';
import { AddPointsDto } from './dto/add-points.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 积分账户控制器（管理端）
 * 
 * @description 提供管理员积分管理接口
 */
@ApiTags('积分账户管理')
@Controller('admin/marketing/points')
@ApiBearerAuth('Authorization')
export class PointsAccountAdminController {
  constructor(private readonly accountService: PointsAccountService) {}

  @Post('adjust')
  @Api({ summary: '调整用户积分' })
  @RequirePermission('marketing:points:adjust')
  @Operlog({ businessType: BusinessType.UPDATE })
  async adjustPoints(@Body() dto: AddPointsDto) {
    return this.accountService.addPoints(dto);
  }

  @Get('accounts')
  @Api({ summary: '查询积分账户列表' })
  @RequirePermission('marketing:points:account:list')
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
  @Api({ summary: '查询积分交易记录' })
  @RequirePermission('marketing:points:transaction:list')
  async getTransactions(@Query() query: TransactionQueryDto) {
    return this.accountService.getTransactionsForAdmin({
      memberId: query.memberId,
      type: query.type as PointsTransactionType,
      startTime: query.startTime,
      endTime: query.endTime,
      pageNum: query.pageNum || 1,
      pageSize: query.pageSize || 10,
    });
  }
}
