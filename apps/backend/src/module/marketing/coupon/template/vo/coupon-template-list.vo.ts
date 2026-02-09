import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, CouponStatus, CouponValidityType } from '@prisma/client';

/**
 * 优惠券模板列表 VO
 * 
 * @description 用于列表展示的简化版本，包含关键信息和统计数据
 */
export class CouponTemplateListVo {
  @ApiProperty({ description: '模板ID' })
  id: string;

  @ApiProperty({ description: '优惠券名称' })
  name: string;

  @ApiPropertyOptional({ description: '优惠券描述' })
  description?: string;

  @ApiProperty({ description: '优惠券类型', enum: CouponType })
  type: CouponType;

  // ==================== 优惠信息（简化） ====================

  @ApiPropertyOptional({ description: '满减金额' })
  discountAmount?: number;

  @ApiPropertyOptional({ description: '折扣百分比' })
  discountPercent?: number;

  @ApiProperty({ description: '最低消费金额' })
  minOrderAmount: number;

  // ==================== 有效期信息 ====================

  @ApiProperty({ description: '有效期类型', enum: CouponValidityType })
  validityType: CouponValidityType;

  @ApiPropertyOptional({ description: '开始时间' })
  startTime?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  endTime?: Date;

  @ApiPropertyOptional({ description: '有效天数' })
  validDays?: number;

  // ==================== 库存信息 ====================

  @ApiProperty({ description: '发放总量' })
  totalStock: number;

  @ApiProperty({ description: '剩余库存' })
  remainingStock: number;

  @ApiProperty({ description: '已发放数量' })
  distributedCount: number;

  @ApiProperty({ description: '每人限领数量' })
  limitPerUser: number;

  // ==================== 使用统计 ====================

  @ApiProperty({ description: '已使用数量' })
  usedCount: number;

  @ApiProperty({ description: '使用率（百分比）' })
  usageRate: number;

  // ==================== 状态 ====================

  @ApiProperty({ description: '优惠券状态', enum: CouponStatus })
  status: CouponStatus;

  // ==================== 审计字段 ====================

  @ApiProperty({ description: '创建时间' })
  createTime: Date;

  @ApiProperty({ description: '更新时间' })
  updateTime: Date;
}
