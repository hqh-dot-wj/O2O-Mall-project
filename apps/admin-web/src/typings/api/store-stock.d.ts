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
    }
  }
}
