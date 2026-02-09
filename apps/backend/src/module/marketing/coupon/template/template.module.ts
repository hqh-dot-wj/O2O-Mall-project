import { Module } from '@nestjs/common';
import { CouponTemplateController } from './template.controller';
import { CouponTemplateService } from './template.service';
import { CouponTemplateRepository } from './template.repository';

/**
 * 优惠券模板模块
 * 提供优惠券模板的管理功能
 */
@Module({
  controllers: [CouponTemplateController],
  providers: [CouponTemplateService, CouponTemplateRepository],
  exports: [CouponTemplateService, CouponTemplateRepository],
})
export class CouponTemplateModule {}
