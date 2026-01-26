import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 地址响应 VO
 */
export class AddressVo {
  @ApiProperty({ description: '地址ID' })
  id: string;

  @ApiProperty({ description: '收货人姓名' })
  name: string;

  @ApiProperty({ description: '联系电话' })
  phone: string;

  @ApiProperty({ description: '省' })
  province: string;

  @ApiProperty({ description: '市' })
  city: string;

  @ApiProperty({ description: '区/县' })
  district: string;

  @ApiProperty({ description: '详细地址' })
  detail: string;

  @ApiProperty({ description: '完整地址' })
  fullAddress: string;

  @ApiPropertyOptional({ description: '纬度' })
  latitude?: number;

  @ApiPropertyOptional({ description: '经度' })
  longitude?: number;

  @ApiProperty({ description: '是否默认地址' })
  isDefault: boolean;

  @ApiPropertyOptional({ description: '标签' })
  tag?: string;
}

/**
 * 地址列表响应 VO
 */
export class AddressListVo {
  @ApiProperty({ type: [AddressVo], description: '地址列表' })
  list: AddressVo[];
}
