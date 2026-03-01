declare namespace Api {
  namespace Store {
    interface StockSku {
      id: string;
      stock: number;
      price: number;
      isActive: boolean;
      tenantProd: {
        id: string;
        product: {
          name: string;
          mainImages: string[];
        };
      };
      globalSku: {
        specValues: any;
      };
    }

    type StockList = Common.PaginatingQueryRecord<StockSku>;

    interface StockSearchParams extends Common.PaginatingCommonParams {
      productName?: string | null;
    }

    interface StockUpdateParams {
      skuId: string;
      stockChange: number; // positive for add, negative for reduce
      reason?: string;
    }

    /** 批量调整单项 */
    interface BatchUpdateStockItem {
      skuId: string;
      stockChange: number;
      reason?: string;
    }

    interface BatchUpdateStockParams {
      items: BatchUpdateStockItem[];
    }

    type BatchUpdateStockResult = {
      successCount: number;
      failCount: number;
      details: Array<{ skuId: string; success: boolean; error?: string }>;
    };
  }
}
