/**
 * Store 模块类型定义
 * 
 * 用于消除 Store 模块中的 any 类型使用
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * 订单查询参数
 */
export interface OrderQueryParams {
  pageNum: number;
  pageSize: number;
  status?: string;
  memberId?: string;
  tenantId?: string;
  startTime?: Date;
  endTime?: Date;
  getDateRange?: () => [Date, Date];
}

/**
 * 订单查询结果
 */
export interface OrderQueryResult {
  orderId: string;
  total: string | Decimal;
  [key: string]: unknown;
}

/**
 * 流水导出参数
 */
export interface LedgerExportParams {
  tenantId: string;
  startTime?: Date;
  endTime?: Date;
  type?: string;
  memberId?: string;
}

/**
 * 流水记录
 */
export interface LedgerRecord {
  id: string | bigint;
  type: string;
  amount: Decimal;
  balance: Decimal;
  createTime: Date;
  remark?: string;
  [key: string]: unknown;
}

/**
 * 分销日志项
 */
export interface DistributionLogItem {
  id: string | bigint;
  tenantId: string;
  level1Rate: Decimal;
  level2Rate: Decimal;
  enableLV0: boolean;
  enableCrossTenant?: boolean;
  crossTenantRate?: Decimal;
  crossMaxDaily?: Decimal;
  operator: string;
  createTime: Date;
}

/**
 * 订单列表项
 */
export interface OrderListItem {
  id: string;
  orderSn: string;
  status: string;
  totalAmount: Decimal;
  actualPaid: Decimal;
  createTime: Date;
  payTime?: Date;
  items: OrderItemSummary[];
}

/**
 * 订单商品摘要
 */
export interface OrderItemSummary {
  productId: string;
  productName: string;
  skuId: string;
  quantity: number;
  price: Decimal;
  totalAmount: Decimal;
}
