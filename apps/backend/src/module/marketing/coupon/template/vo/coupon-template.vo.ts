import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, CouponStatus, CouponValidityType } from '@prisma/client';

/**
 * 优惠券模板详情 VO
 * 
 * @description 包含模板的所有字段和统计信息
 */
export class CouponTemplateVo {
  @ApiProperty({ description: '模板ID' })
  id: string;

  @ApiProperty({ description: '租户ID' })
  tenantId: string;

  // ==================== 基础信息 ====================

  @ApiProperty({ description: '优惠券名称' })
  name: string;

  @ApiPropertyOptional({ description: '优惠券描述' })
  description?: string;

  @ApiProperty({ description: '优惠券类型', enum: CouponType })
  type: CouponType;

  // ==================== 优惠金额配置 ====================

  @ApiPropertyOptional({ description: '满减金额' })
  discountAmount?: number;

  @ApiPropertyOptional({ description: '折扣百分比(1-99)' })
  discountPercent?: number;

  @ApiPropertyOptional({ description: '最高优惠金额' })
  maxDiscountAmount?: number;

  // ==================== 使用条件 ====================

  @ApiProperty({ description: '最低消费金额' })
  minOrderAmount: number;

  @ApiProperty({ description: '适用商品ID列表', type: [String] })
  applicableProducts: string[];

  @ApiProperty({ description: '适用分类ID列表', type: [Number] })
  applicableCategories: number[];

  @ApiProperty({ description: '适用会员等级列表', type: [Number] })
  memberLevels: number[];

  // ==================== 兑换券专属 ====================

  @ApiPropertyOptional({ description: '可兑换的商品ID' })
  exchangeProductId?: string;

  @ApiPropertyOptional({ description: '可兑换的SKU ID' })
  exchangeSkuId?: string;

  // ==================== 有效期配置 ====================

  @ApiProperty({ description: '有效期类型', enum: CouponValidityType })
  validityType: CouponValidityType;

  @ApiPropertyOptional({ description: '开始时间' })
  startTime?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  endTime?: Date;

  @ApiPropertyOptional({ description: '有效天数' })
  validDays?: number;

  // ==================== 发放配置 ====================

  @ApiProperty({ description: '发放总量' })
  totalStock: number;

  @ApiProperty({ description: '剩余库存' })
  remainingStock: number;

  @ApiProperty({ description: '每人限领数量' })
  limitPerUser: number;

  // ==================== 状态 ====================

  @ApiProperty({ description: '优惠券状态', enum: CouponStatus })
  status: CouponStatus;

  // ==================== 统计信息 ====================

  @ApiProperty({ description: '已发放数量' })
  distributedCount: number;

  @ApiProperty({ description: '已使用数量' })
  usedCount: number;

  @ApiProperty({ description: '使用率（百分比）' })
  usageRate: number;

  // ==================== 审计字段 ====================

  @ApiProperty({ description: '创建人' })
  createBy: string;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiPropertyOptional({ description: '更新人' })
  updateBy?: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}
