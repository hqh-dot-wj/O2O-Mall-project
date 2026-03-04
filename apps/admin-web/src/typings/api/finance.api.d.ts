/**
 * Api.Finance - 来自 @libs/common-types
 */
import type {
  CommissionRecordVo,
  CommissionSearchParams as CommissionSearchParamsT,
  CommissionStatus as CommissionStatusT,
  FinanceDashboardVo,
  LedgerRecordVo,
  LedgerSearchParams as LedgerSearchParamsT,
  LedgerStatsVo,
  StoreCommissionStatsVo,
  TransType as TransTypeT,
  WithdrawalRecordVo,
  WithdrawalSearchParams as WithdrawalSearchParamsT,
  WithdrawalStatus as WithdrawalStatusT
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
