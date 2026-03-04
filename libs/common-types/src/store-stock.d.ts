/**
 * Store 库存 API 类型
 * 库存列表项与后端 TenantSkuRepository.findStockList 返回结构对齐（含 tenantProd、globalSku）
 */
import type { components } from './api';

/** 库存列表项 - 与后端实际返回结构对齐 */
export interface StockSkuVo {
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
    specValues: Record<string, string>;
  };
}

/** 库存列表搜索参数 */
export type StockSearchParams = components['schemas']['ListStockDto'];

/** 单次库存调整参数 */
export type StockUpdateParams = components['schemas']['UpdateStockDto'];

/** 批量库存调整参数 */
export type BatchUpdateStockParams = components['schemas']['BatchUpdateStockDto'];

/** 批量调整结果 */
export interface BatchUpdateStockResult {
  successCount: number;
  failCount: number;
  details: Array<{ skuId: string; success: boolean; error?: string }>;
}
