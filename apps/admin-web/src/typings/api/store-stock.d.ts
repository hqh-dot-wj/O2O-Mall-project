/**
 * Api.Store 库存 - 来自 @libs/common-types
 */
import type {
  BatchUpdateStockParams as BatchUpdateStockParamsT,
  BatchUpdateStockResult as BatchUpdateStockResultT,
  StockSearchParams as StockSearchParamsT,
  StockSkuVo,
  StockUpdateParams as StockUpdateParamsT
} from '@libs/common-types';

declare namespace Api {
  namespace Store {
    type StockSku = StockSkuVo;
    type StockList = Api.Common.PaginatingQueryRecord<StockSkuVo>;
    type StockSearchParams = StockSearchParamsT;
    type StockUpdateParams = StockUpdateParamsT;
    type BatchUpdateStockParams = BatchUpdateStockParamsT;
    type BatchUpdateStockResult = BatchUpdateStockResultT;
  }
}
