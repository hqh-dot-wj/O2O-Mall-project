import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';
import { User } from 'src/common/decorators/user.decorator';
import { StoreFinanceService } from './store-finance.service';
import { ListCommissionDto, ListWithdrawalDto, AuditWithdrawalDto, ListLedgerDto } from './dto/store-finance.dto';

/**
 * Store端财务管理控制器
 */
@ApiTags('Store-财务管理')
@Controller('finance')
export class StoreFinanceController {
  constructor(private readonly storeFinanceService: StoreFinanceService) {}

  /**
   * 获取资金看板
   */
  @Get('dashboard')
  @Api({ summary: '获取资金看板' })
  @RequirePermission('store:finance:dashboard')
  async getDashboard() {
    return await this.storeFinanceService.getDashboard();
  }

  /**
   * 查询佣金明细列表
   */
  @Get('commission/list')
  @Api({ summary: '查询佣金明细列表' })
  @RequirePermission('store:finance:commission')
  async getCommissionList(@Query() query: ListCommissionDto) {
    return await this.storeFinanceService.getCommissionList(query);
  }

  /**
   * 获取佣金统计
   */
  @Get('commission/stats')
  @Api({ summary: '获取佣金统计' })
  @RequirePermission('store:finance:commission')
  async getCommissionStats() {
    return await this.storeFinanceService.getCommissionStats();
  }

  /**
   * 查询提现列表
   */
  @Get('withdrawal/list')
  @Api({ summary: '查询提现列表' })
  @RequirePermission('store:finance:withdrawal')
  async getWithdrawalList(@Query() query: ListWithdrawalDto) {
    return await this.storeFinanceService.getWithdrawalList(query);
  }

  /**
   * 审核提现
   */
  @Post('withdrawal/audit')
  @Api({ summary: '审核提现' })
  @RequirePermission('store:finance:withdrawal:audit')
  async auditWithdrawal(@Body() dto: AuditWithdrawalDto, @User('userId') userId: string) {
    return await this.storeFinanceService.auditWithdrawal(dto, userId);
  }

  /**
   * 查询门店流水
   */
  @Get('ledger')
  @Api({ summary: '查询门店流水' })
  @RequirePermission('store:finance:ledger')
  async getLedger(@Query() query: ListLedgerDto) {
    return await this.storeFinanceService.getLedger(query);
  }

  /**
   * 获取流水统计
   */
  @Get('ledger/stats')
  @Api({ summary: '获取流水统计' })
  @RequirePermission('store:finance:ledger')
  async getLedgerStats(@Query() query: ListLedgerDto) {
    return await this.storeFinanceService.getLedgerStats(query);
  }

  /**
   * 导出流水数据
   */
  @Post('ledger/export')
  @Api({
    summary: '导出流水数据',
    description: '导出门店流水数据为Excel文件',
    produces: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  })
  @RequirePermission('store:finance:ledger')
  @Operlog({ businessType: BusinessType.EXPORT })
  async exportLedger(@Res() res: Response, @Body() query: ListLedgerDto): Promise<void> {
    return await this.storeFinanceService.exportLedger(res, query);
  }
}
