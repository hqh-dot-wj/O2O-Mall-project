import {
    IsString,
    IsArray,
    IsInt,
    IsOptional,
    ValidateNested,
    Min,
    IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 订单商品项 DTO
 */
export class OrderItemDto {
    @ApiProperty({ description: 'SKU ID' })
    @IsString()
    skuId: string;

    @ApiProperty({ description: '数量' })
    @IsInt()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional({ description: '分享人ID (归因)' })
    @IsOptional()
    @IsString()
    shareUserId?: string;
}

/**
 * 创建订单 DTO
 */
export class CreateOrderDto {
    @ApiProperty({ description: '租户ID' })
    @IsString()
    tenantId: string;

    @ApiProperty({ description: '订单商品列表', type: [OrderItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiPropertyOptional({ description: '收货人姓名' })
    @IsOptional()
    @IsString()
    receiverName?: string;

    @ApiPropertyOptional({ description: '收货人电话' })
    @IsOptional()
    @IsString()
    receiverPhone?: string;

    @ApiPropertyOptional({ description: '收货地址' })
    @IsOptional()
    @IsString()
    receiverAddress?: string;

    @ApiPropertyOptional({ description: '收货纬度' })
    @IsOptional()
    @Type(() => Number)
    receiverLat?: number;

    @ApiPropertyOptional({ description: '收货经度' })
    @IsOptional()
    @Type(() => Number)
    receiverLng?: number;

    @ApiPropertyOptional({ description: '分享人ID (全局归因)' })
    @IsOptional()
    @IsString()
    shareUserId?: string;

    @ApiPropertyOptional({ description: '预约时间 (服务类)' })
    @IsOptional()
    @Type(() => Date)
    bookingTime?: Date;

    @ApiPropertyOptional({ description: '服务备注' })
    @IsOptional()
    @IsString()
    serviceRemark?: string;

    @ApiPropertyOptional({ description: '订单备注' })
    @IsOptional()
    @IsString()
    remark?: string;
}

/**
 * 查询订单列表 DTO
 */
export class ListOrderDto {
    @ApiPropertyOptional({ description: '订单状态', enum: ['PENDING_PAY', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED'] })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({ description: '页码', default: 1 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    pageNum: number = 1;

    @ApiProperty({ description: '每页数量', default: 10 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    pageSize: number = 10;
}

/**
 * 取消订单 DTO
 */
export class CancelOrderDto {
    @ApiProperty({ description: '订单ID' })
    @IsString()
    orderId: string;

    @ApiPropertyOptional({ description: '取消原因' })
    @IsOptional()
    @IsString()
    reason?: string;
}
