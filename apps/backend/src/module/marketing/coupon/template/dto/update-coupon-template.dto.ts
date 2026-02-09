import { PartialType } from '@nestjs/swagger';
import { CreateCouponTemplateDto } from './create-coupon-template.dto';

/**
 * 更新优惠券模板 DTO
 * 
 * @description 继承创建 DTO，所有字段变为可选
 */
export class UpdateCouponTemplateDto extends PartialType(CreateCouponTemplateDto) {}
