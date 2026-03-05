import { PageQueryDto } from 'src/common/dto';
import { IsOptional, IsString, IsInt, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, OrderType } from '@prisma/client';

/**
 * Store端订单列表查询DTO
 */
export class ListStoreOrderDto extends PageQueryDto {
  @ApiProperty({ description: '订单号', required: false })
  @IsOptional()
  @IsString()
  orderSn?: string;

  @ApiProperty({ description: '收货人手机号', required: false })
  @IsOptional()
  @IsString()
  receiverPhone?: string;

  @ApiProperty({ description: '订单状态', enum: OrderStatus, required: false })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: string;

  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '订单类型', enum: OrderType, required: false })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: string;
}

/**
 * 改派技师DTO
 */
export class ReassignWorkerDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '新技师ID' })
  @IsInt()
  @Type(() => Number)
  newWorkerId: number;
}

/**
 * 强制核销DTO
 */
export class VerifyServiceDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '核销备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 订单退款DTO
 */
export class RefundOrderDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '退款原因', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 部分退款订单项
 */
export class PartialRefundItemDto {
  @ApiProperty({ description: '订单项ID' })
  @IsInt()
  @Type(() => Number)
  itemId: number;

  @ApiProperty({ description: '退款数量' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

/**
 * 部分退款DTO
 */
export class PartialRefundOrderDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: '退款订单项列表', type: [PartialRefundItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartialRefundItemDto)
  items: PartialRefundItemDto[];

  @ApiProperty({ description: '退款原因', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 批量核销DTO
 */
export class BatchVerifyDto {
  @ApiProperty({ description: '订单ID列表' })
  @IsArray()
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty({ description: '核销备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 批量退款DTO
 */
export class BatchRefundDto {
  @ApiProperty({ description: '订单ID列表' })
  @IsArray()
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty({ description: '退款原因', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 批量操作结果项
 */
export class BatchOperationResultItem {
  @ApiProperty({ description: '订单ID' })
  orderId: string;

  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '错误信息', required: false })
  error?: string;
}

/**
 * 批量操作结果
 */
export class BatchOperationResult {
  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failCount: number;

  @ApiProperty({ description: '详细结果', type: [BatchOperationResultItem] })
  details: BatchOperationResultItem[];
}

