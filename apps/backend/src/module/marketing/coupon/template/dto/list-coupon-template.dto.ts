import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';
import { CouponType, CouponStatus } from '@prisma/client';

/**
 * 查询优惠券模板列表 DTO
 */
export class ListCouponTemplateDto extends PageQueryDto {
  @ApiPropertyOptional({ description: '优惠券名称（模糊搜索）', example: '满减' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '优惠券类型', enum: CouponType })
  @IsOptional()
  @IsEnum(CouponType, { message: '优惠券类型无效' })
  type?: CouponType;

  @ApiPropertyOptional({ description: '优惠券状态', enum: CouponStatus })
  @IsOptional()
  @IsEnum(CouponStatus, { message: '优惠券状态无效' })
  status?: CouponStatus;
}
