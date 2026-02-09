import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { CouponType, CouponValidityType } from '@prisma/client';

/**
 * 创建优惠券模板 DTO
 */
export class CreateCouponTemplateDto {
  @ApiProperty({ description: '租户ID', example: '000000' })
  @IsString()
  @IsNotEmpty({ message: '租户ID不能为空' })
  tenantId: string;

  @ApiProperty({ description: '创建人', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: '创建人不能为空' })
  createBy: string;

  @ApiProperty({ description: '优惠券名称', example: '满100减20优惠券' })
  @IsString()
  @IsNotEmpty({ message: '优惠券名称不能为空' })
  name: string;

  @ApiPropertyOptional({ description: '优惠券描述', example: '全场通用，满100减20' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '优惠券类型', enum: CouponType, example: CouponType.DISCOUNT })
  @IsEnum(CouponType, { message: '优惠券类型无效' })
  @IsNotEmpty({ message: '优惠券类型不能为空' })
  type: CouponType;

  // ==================== 优惠金额配置 ====================

  @ApiPropertyOptional({ description: '满减金额（满减券必填）', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '满减金额必须是数字' })
  @Min(0.01, { message: '满减金额必须大于0' })
  @ValidateIf((o) => o.type === CouponType.DISCOUNT)
  discountAmount?: number;

  @ApiPropertyOptional({ description: '折扣百分比（折扣券必填，1-99）', example: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '折扣百分比必须是整数' })
  @Min(1, { message: '折扣百分比必须在1-99之间' })
  @Max(99, { message: '折扣百分比必须在1-99之间' })
  @ValidateIf((o) => o.type === CouponType.PERCENTAGE)
  discountPercent?: number;

  @ApiPropertyOptional({ description: '最高优惠金额（折扣券可选）', example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '最高优惠金额必须是数字' })
  @Min(0.01, { message: '最高优惠金额必须大于0' })
  maxDiscountAmount?: number;

  // ==================== 使用条件 ====================

  @ApiPropertyOptional({ description: '最低消费金额', example: 100, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '最低消费金额必须是数字' })
  @Min(0, { message: '最低消费金额不能为负数' })
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: '适用商品ID列表', type: [String], example: [] })
  @IsOptional()
  @IsArray({ message: '适用商品ID列表必须是数组' })
  @IsString({ each: true, message: '商品ID必须是字符串' })
  applicableProducts?: string[];

  @ApiPropertyOptional({ description: '适用分类ID列表', type: [Number], example: [] })
  @IsOptional()
  @IsArray({ message: '适用分类ID列表必须是数组' })
  @IsInt({ each: true, message: '分类ID必须是整数' })
  applicableCategories?: number[];

  @ApiPropertyOptional({ description: '适用会员等级列表', type: [Number], example: [] })
  @IsOptional()
  @IsArray({ message: '适用会员等级列表必须是数组' })
  @IsInt({ each: true, message: '会员等级必须是整数' })
  memberLevels?: number[];

  // ==================== 兑换券专属 ====================

  @ApiPropertyOptional({ description: '可兑换的商品ID（兑换券必填）', example: 'prod_123' })
  @IsOptional()
  @IsString({ message: '商品ID必须是字符串' })
  @ValidateIf((o) => o.type === CouponType.EXCHANGE)
  exchangeProductId?: string;

  @ApiPropertyOptional({ description: '可兑换的SKU ID（兑换券可选）', example: 'sku_456' })
  @IsOptional()
  @IsString({ message: 'SKU ID必须是字符串' })
  exchangeSkuId?: string;

  // ==================== 有效期配置 ====================

  @ApiProperty({
    description: '有效期类型',
    enum: CouponValidityType,
    example: CouponValidityType.FIXED,
  })
  @IsEnum(CouponValidityType, { message: '有效期类型无效' })
  @IsNotEmpty({ message: '有效期类型不能为空' })
  validityType: CouponValidityType;

  @ApiPropertyOptional({
    description: '开始时间（固定时间段必填）',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '开始时间格式无效' })
  @ValidateIf((o) => o.validityType === CouponValidityType.FIXED)
  startTime?: string;

  @ApiPropertyOptional({
    description: '结束时间（固定时间段必填）',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束时间格式无效' })
  @ValidateIf((o) => o.validityType === CouponValidityType.FIXED)
  endTime?: string;

  @ApiPropertyOptional({ description: '有效天数（相对时间必填）', example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '有效天数必须是整数' })
  @Min(1, { message: '有效天数必须大于0' })
  @ValidateIf((o) => o.validityType === CouponValidityType.RELATIVE)
  validDays?: number;

  // ==================== 发放配置 ====================

  @ApiProperty({ description: '发放总量', example: 1000 })
  @Type(() => Number)
  @IsInt({ message: '发放总量必须是整数' })
  @Min(1, { message: '发放总量必须大于0' })
  @IsNotEmpty({ message: '发放总量不能为空' })
  totalStock: number;

  @ApiPropertyOptional({ description: '每人限领数量', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每人限领数量必须是整数' })
  @Min(1, { message: '每人限领数量必须大于0' })
  limitPerUser?: number;
}
