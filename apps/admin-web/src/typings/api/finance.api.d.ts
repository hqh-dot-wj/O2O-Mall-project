/**
 * Api.Finance - 来自 @libs/common-types
 */
import type {
  CommissionSearchParams as CommissionSearchParamsT,
  WithdrawalSearchParams as WithdrawalSearchParamsT,
  LedgerSearchParams as LedgerSearchParamsT,
  CommissionStatus as CommissionStatusT,
  WithdrawalStatus as WithdrawalStatusT,
  TransType as TransTypeT,
  FinanceDashboardVo,
  CommissionRecordVo,
  WithdrawalRecordVo,
  StoreCommissionStatsVo,
  LedgerRecordVo,
  LedgerStatsVo,
} from '@libs/common-types';

declare namespace Api {
  namespace Finance {
    type Dashboard = FinanceDashboardVo;

    type CommissionSearchParams = CommissionSearchParamsT;
    type CommissionStatus = CommissionStatusT;
    type CommissionRecord = CommissionRecordVo;
    type CommissionListResult = Api.Common.PaginatingQueryRecord<CommissionRecord>;
    type CommissionStats = StoreCommissionStatsVo;

    type WithdrawalSearchParams = WithdrawalSearchParamsT;
    type WithdrawalStatus = WithdrawalStatusT;
    type WithdrawalRecord = WithdrawalRecordVo;
    type WithdrawalListResult = Api.Common.PaginatingQueryRecord<WithdrawalRecord>;

    type LedgerSearchParams = LedgerSearchParamsT;
    type TransType = TransTypeT;
    type LedgerRecord = LedgerRecordVo;
    type LedgerListResult = Api.Common.PaginatingQueryRecord<LedgerRecord>;
    type LedgerStats = LedgerStatsVo;
  }
}
