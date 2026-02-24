/**
 * Marketing 模块类型定义
 * 
 * 用于消除 Marketing 模块中的 any 类型使用
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * 营销玩法规则 Schema
 */
export interface RuleSchema {
  type: 'object';
  properties: Record<string, RuleSchemaProperty>;
  required?: string[];
}

/**
 * 规则 Schema 属性
 */
export interface RuleSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  items?: RuleSchemaProperty;
  properties?: Record<string, RuleSchemaProperty>;
}

/**
 * 营销策略参数
 */
export interface StrategyParams {
  memberId?: string;
  orderId?: string;
  productId?: string;
  skuId?: string;
  quantity?: number;
  price?: Decimal | number;
  [key: string]: unknown;
}

/**
 * 营销玩法配置
 */
export interface PlayConfig {
  id: string;
  code: string;
  name: string;
  rules: PlayRules;
  status: string;
  startTime?: Date;
  endTime?: Date;
  createTime: Date;
  updateTime: Date;
}

/**
 * 玩法规则
 */
export interface PlayRules {
  price?: number;
  discount?: number;
  minPurchase?: number;
  maxPurchase?: number;
  groupSize?: number;
  timeLimit?: number;
  [key: string]: unknown;
}

/**
 * 营销活动
 */
export interface MarketingActivity {
  id: string;
  type: string;
  name: string;
  description?: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  rules: PlayRules;
}

/**
 * 玩法元数据
 */
export interface PlayMetadata {
  code: string;
  name: string;
  description: string;
  ruleSchema: RuleSchema;
  hasInstance: boolean;
}

/**
 * 策略类构造函数
 */
export interface StrategyConstructor {
  new (...args: unknown[]): StrategyInstance;
}

/**
 * 策略实例
 */
export interface StrategyInstance {
  code?: string;
  validateJoin?(config: PlayConfig, memberId: string, params?: StrategyParams): Promise<void>;
  validateConfig?(dto: ConfigDto): Promise<void>;
  calculatePrice?(config: PlayConfig, params?: StrategyParams): Promise<Decimal>;
}

/**
 * 配置 DTO
 */
export interface ConfigDto {
  code: string;
  name: string;
  rules: PlayRules;
  status?: string;
  startTime?: Date;
  endTime?: Date;
  [key: string]: unknown;
}

/**
 * 优惠券模板
 */
export interface CouponTemplate {
  id: string;
  name: string;
  type: string;
  amount: Decimal;
  minPurchase?: Decimal;
  maxDiscount?: Decimal;
  validDays: number;
  totalCount: number;
  usedCount: number;
  status: string;
  createTime: Date;
  updateTime: Date;
}

/**
 * 优惠券
 */
export interface Coupon {
  id: string;
  templateId: string;
  memberId: string;
  code: string;
  status: string;
  receiveTime: Date;
  useTime?: Date;
  expireTime: Date;
}

/**
 * 积分记录
 */
export interface PointsRecord {
  id: string;
  memberId: string;
  type: string;
  amount: number;
  balance: number;
  orderId?: string;
  remark?: string;
  createTime: Date;
}

/**
 * 积分规则
 */
export interface PointsRule {
  id: string;
  name: string;
  type: string;
  ratio: Decimal;
  minAmount?: Decimal;
  maxPoints?: number;
  status: string;
  createTime: Date;
  updateTime: Date;
}
