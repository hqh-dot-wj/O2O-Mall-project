import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CouponTemplateService } from './template.service';
import { CreateCouponTemplateDto } from './dto/create-coupon-template.dto';
import { UpdateCouponTemplateDto } from './dto/update-coupon-template.dto';
import { ListCouponTemplateDto } from './dto/list-coupon-template.dto';
import { CouponTemplateVo } from './vo/coupon-template.vo';
import { CouponTemplateListVo } from './vo/coupon-template-list.vo';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 优惠券模板控制器
 * 提供优惠券模板的增删改查接口
 */
@ApiTags('营销-优惠券模板')
@Controller('admin/marketing/coupon/templates')
@ApiBearerAuth('Authorization')
export class CouponTemplateController {
  constructor(private readonly service: CouponTemplateService) {}

  /**
   * 查询优惠券模板列表
   * 支持分页、筛选和排序
   */
  @Get()
  @Api({ summary: '查询优惠券模板列表', type: CouponTemplateListVo, isPager: true })
  @RequirePermission('marketing:coupon:template:list')
  async findAll(@Query() query: ListCouponTemplateDto) {
    return await this.service.findAll(query);
  }

  /**
   * 查询优惠券模板详情
   * 包含统计信息（已发放数量、已使用数量、核销率）
   */
  @Get(':id')
  @Api({ summary: '查询优惠券模板详情', type: CouponTemplateVo })
  @RequirePermission('marketing:coupon:template:query')
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  /**
   * 创建优惠券模板
   * 验证模板配置的合法性
   */
  @Post()
  @Api({ summary: '创建优惠券模板', type: CouponTemplateVo })
  @RequirePermission('marketing:coupon:template:add')
  @Operlog({ businessType: BusinessType.INSERT })
  async create(@Body() dto: CreateCouponTemplateDto) {
    return await this.service.create(dto);
  }

  /**
   * 更新优惠券模板
   * 如果模板已发放，则不允许修改关键配置
   */
  @Put(':id')
  @Api({ summary: '更新优惠券模板', type: CouponTemplateVo })
  @RequirePermission('marketing:coupon:template:edit')
  @Operlog({ businessType: BusinessType.UPDATE })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponTemplateDto) {
    return await this.service.update(id, dto);
  }

  /**
   * 更新优惠券模板状态（启用/停用）
   */
  @Patch(':id/status')
  @Api({ summary: '更新优惠券模板状态' })
  @RequirePermission('marketing:coupon:template:status')
  @Operlog({ businessType: BusinessType.UPDATE })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'INACTIVE' },
  ) {
    return await this.service.setStatus(id, body.status);
  }

  /**
   * 停用优惠券模板
   * 将模板状态设置为 INACTIVE
   */
  @Delete(':id')
  @Api({ summary: '停用优惠券模板' })
  @RequirePermission('marketing:coupon:template:delete')
  @Operlog({ businessType: BusinessType.DELETE })
  async deactivate(@Param('id') id: string) {
    return await this.service.deactivate(id);
  }
}
