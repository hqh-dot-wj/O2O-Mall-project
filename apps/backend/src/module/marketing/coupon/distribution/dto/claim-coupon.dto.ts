import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * 用户领取优惠券 DTO
 */
export class ClaimCouponDto {
  @ApiProperty({ description: '优惠券模板ID' })
  @IsNotEmpty({ message: '优惠券模板ID不能为空' })
  @IsUUID('4', { message: '优惠券模板ID格式不正确' })
  templateId: string;
}
