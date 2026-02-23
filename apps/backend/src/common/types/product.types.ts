/**
 * 产品规格相关类型定义
 * 用于替代 VO 中的 any 类型
 */

/**
 * 产品规格值类型
 * 用于存储 SKU 的规格信息，如颜色、尺寸等
 * 
 * @example
 * ```typescript
 * const specValues: SpecValues = {
 *   '颜色': '红色',
 *   '尺寸': 'XL',
 *   '材质': '纯棉'
 * };
 * ```
 */
export type SpecValues = Record<string, string>;

/**
 * 产品规格项
 * 包含规格名称和值
 */
export interface SpecValue {
  /** 规格名称，如 "颜色"、"尺寸" */
  name: string;
  /** 规格值，如 "红色"、"XL" */
  value: string;
}

/**
 * 产品规格信息
 * 包含多个规格项的数组
 */
export interface ProductSpecs {
  /** 规格列表 */
  specs: SpecValue[];
}

/**
 * JSON 字段通用类型
 * 用于 Prisma JsonValue 字段
 */
export type JsonObject = Record<string, unknown>;

/**
 * 类型守卫：检查是否为有效的 SpecValues
 */
export function isSpecValues(value: unknown): value is SpecValues {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).every((v) => typeof v === 'string');
}

/**
 * 类型守卫：检查是否为有效的 JsonObject
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
