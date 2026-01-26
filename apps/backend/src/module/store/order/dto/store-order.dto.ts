import { PageQueryDto } from 'src/common/dto';
import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';
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
  status?: OrderStatus;

  @ApiProperty({ description: '会员ID', required: false })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ description: '订单类型', enum: OrderType, required: false })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;
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
