import { Injectable } from '@nestjs/common';
import { WithdrawalService } from 'src/module/finance/withdrawal/withdrawal.service';
import { ListCommissionDto, ListWithdrawalDto, AuditWithdrawalDto, ListLedgerDto } from './dto/store-finance.dto';
import { ListWithdrawalDto as FinListWithdrawalDto } from 'src/module/finance/withdrawal/dto/list-withdrawal.dto';
import { TenantContext } from 'src/common/tenant/tenant.context';
import { StoreDashboardService } from './dashboard.service';
import { StoreCommissionQueryService } from './commission-query.service';
import { StoreLedgerService } from './ledger.service';

/**
 * Store端财务服务 (Facade)
 *
 * @description
 * 作为 Facade 模式的入口,协调各个子服务:
 * - StoreDashboardService: 看板统计
 * - StoreCommissionQueryService: 佣金查询
 * - StoreLedgerService: 财务流水
 * - WithdrawalService: 提现管理
 */
@Injectable()
export class StoreFinanceService {
  constructor(
    private readonly dashboardService: StoreDashboardService,
    private readonly commissionQueryService: StoreCommissionQueryService,
    private readonly ledgerService: StoreLedgerService,
    private readonly withdrawalService: WithdrawalService,
  ) {}

  /**
   * 获取资金看板数据
   */
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }

  /**
   * 查询佣金明细列表
   */
  async getCommissionList(query: ListCommissionDto) {
    return this.commissionQueryService.getCommissionList(query);
  }

  /**
   * 获取佣金统计数据
   */
  async getCommissionStats() {
    return this.dashboardService.getCommissionStats();
  }

  /**
   * 查询提现列表
   * @param query 查询参数
   */
  async getWithdrawalList(query: ListWithdrawalDto) {
    const tenantId = TenantContext.getTenantId();
    const searchParams = new FinListWithdrawalDto();
    searchParams.pageNum = query.pageNum;
    searchParams.pageSize = query.pageSize;
    searchParams.status = query.status;
    searchParams.memberId = query.memberId;

    return await this.withdrawalService.getList(searchParams);
  }

  /**
   * 审核提现
   */
  async auditWithdrawal(dto: AuditWithdrawalDto, auditBy: string) {
    const tenantId = TenantContext.getTenantId();
    return await this.withdrawalService.audit(dto.withdrawalId, dto.action, auditBy, dto.remark);
  }

  /**
   * 查询门店流水
   * @param query 查询参数
   */
  /**
   * 查询财务流水
   */
  async getLedger(query: ListLedgerDto) {
    return this.ledgerService.getLedger(query);
  }

  /**
   * 获取流水统计数据
   */
  async getLedgerStats(query: ListLedgerDto) {
    return this.ledgerService.getLedgerStats(query);
  }

  /**
   * 导出流水数据
   */
  async exportLedger(res: any, query: ListLedgerDto) {
    return this.ledgerService.exportLedger(res, query);
  }
}
