/**
 * Api.Store 库存 - 来自 @libs/common-types
 */
import type {
  StockSkuVo,
  StockSearchParams as StockSearchParamsT,
  StockUpdateParams as StockUpdateParamsT,
  BatchUpdateStockParams as BatchUpdateStockParamsT,
  BatchUpdateStockResult as BatchUpdateStockResultT,
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
