import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * 手动发放优惠券 DTO
 */
export class ManualDistributionDto {
  @ApiProperty({ description: '优惠券模板ID' })
  @IsNotEmpty({ message: '优惠券模板ID不能为空' })
  @IsUUID('4', { message: '优惠券模板ID格式不正确' })
  templateId: string;

  @ApiProperty({ description: '用户ID列表', type: [String] })
  @IsNotEmpty({ message: '用户ID列表不能为空' })
  @IsArray({ message: '用户ID列表必须是数组' })
  @IsString({ each: true, message: '用户ID必须是字符串' })
  memberIds: string[];
}
