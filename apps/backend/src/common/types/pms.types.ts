/**
 * PMS (Product Management System) 模块类型定义
 * 
 * 用于消除 PMS 模块中的 any 类型使用
 */

import { Decimal } from '@prisma/client/runtime/library';
import type { SpecValues } from './product.types';

export type { SpecValues };

/**
 * SKU 创建输入
 */
export interface SkuCreateInput {
  skuId?: string;
  productId: string;
  specValues: SpecValues;
  price: Decimal | number;
  stock: number;
  skuCode?: string;
  barcode?: string;
  weight?: number;
  volume?: number;
}

/**
 * SKU 更新输入
 */
export interface SkuUpdateInput {
  skuId: string;
  specValues?: SpecValues;
  price?: Decimal | number;
  stock?: number;
  skuCode?: string;
  barcode?: string;
  weight?: number;
  volume?: number;
}

/**
 * 规格定义
 */
export interface SpecDefinition {
  name: string;
  values: string[];
}

/**
 * 树形节点
 */
export interface TreeNode<T = Record<string, unknown>> {
  id: number | string;
  parentId: number | string | null;
  children?: TreeNode<T>[];
  [key: string]: unknown;
}

/**
 * 分类树节点
 */
export interface CategoryTreeNode extends TreeNode {
  name: string;
  level: number;
  sort: number;
  icon?: string;
  status: string;
}

/**
 * 属性值定义
 */
export interface AttrValueDefinition {
  attrId: string;
  attrName: string;
  inputType: string;
  inputList?: string;
  sort: number;
}

/**
 * 商品查询条件
 */
export interface ProductQueryWhere {
  tenantId?: string;
  name?: { contains: string };
  categoryId?: number;
  brandId?: string;
  status?: string;
  publishStatus?: string;
  deleteTime?: null;
  [key: string]: unknown;
}

/**
 * 商品列表项
 */
export interface ProductListItem {
  id: string;
  name: string;
  subTitle?: string;
  brandName?: string;
  productCategoryName?: string;
  price: Decimal;
  originalPrice?: Decimal;
  stock: number;
  lowStock?: number;
  sale: number;
  publishStatus: string;
  newStatus: string;
  recommandStatus: string;
  albumPics: string;
  detailTitle?: string;
  detailDesc?: string;
  keywords?: string;
  note?: string;
  productSn?: string;
  deleteStatus: string;
  promotionType?: string;
  giftGrowth: number;
  giftPoint: number;
  usePointLimit?: number;
  previewStatus: string;
  serviceIds?: string;
  sort: number;
  feightTemplateId?: string;
  promotionStartTime?: Date;
  promotionEndTime?: Date;
  promotionPerLimit?: number;
  promotionPrice?: Decimal;
  brandId?: string;
  productCategoryId?: number;
  createTime: Date;
  updateTime: Date;
}

/**
 * 商品详情
 */
export interface ProductDetail extends ProductListItem {
  attrs: AttrValueItem[];
  skus: SkuItem[];
}

/**
 * 属性值项
 */
export interface AttrValueItem {
  attrId: string;
  attrName: string;
  value: string;
}

/**
 * SKU 项
 */
export interface SkuItem {
  skuId: string;
  specValues: SpecValues;
  price: Decimal;
  stock: number;
  skuCode?: string;
  barcode?: string;
}
