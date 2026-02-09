import { Injectable, Logger } from '@nestjs/common';
import { CouponTemplateRepository } from './template.repository';
import {
  CreateCouponTemplateDto,
  UpdateCouponTemplateDto,
  ListCouponTemplateDto,
} from './dto';
import { Result } from 'src/common/response/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { FormatDateFields } from 'src/common/utils';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 优惠券模板服务
 * 
 * @description 提供优惠券模板的创建、修改、停用、查询和统计功能
 */
@Injectable()
export class CouponTemplateService {
  private readonly logger = new Logger(CouponTemplateService.name);

  constructor(
    private readonly repo: CouponTemplateRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 查询优惠券模板列表
   * 
   * @param query 查询参数
   * @returns 分页列表（包含统计信息）
   */
  async findAll(query: ListCouponTemplateDto) {
    const { rows, total } = await this.repo.search(query);

    // 批量查询统计信息
    const templateIds = rows.map((row) => row.id);
    const statsMap = await this.repo.getStatsForTemplates(templateIds);

    // 合并统计信息到结果中
    const rowsWithStats = rows.map((row) => {
      const stats = statsMap.get(row.id) || {
        distributedCount: 0,
        usedCount: 0,
        usageRate: 0,
      };
      return {
        ...row,
        ...stats,
      };
    });

    return Result.page(FormatDateFields(rowsWithStats), total);
  }

  /**
   * 查询优惠券模板详情（包含统计信息）
   * 
   * @param id 模板ID
   * @returns 模板详情
   */
  async findOne(id: string) {
    const template = await this.repo.findById(id);
    BusinessException.throwIfNull(template, '未找到指定的优惠券模板');

    // 查询统计信息
    const stats = await this.getTemplateStats(id);

    return Result.ok(FormatDateFields({ ...template, ...stats }));
  }

  /**
   * 创建优惠券模板
   * 
   * @param dto 创建数据
   * @returns 创建结果
   */
  @Transactional()
  async create(dto: CreateCouponTemplateDto) {
    // 1. 验证模板配置
    this.validateTemplateConfig(dto);

    // 2. 执行持久化
    const template = await this.repo.create({
      ...dto,
      tenantId: dto.tenantId,
      createBy: dto.createBy,
      remainingStock: dto.totalStock, // 初始剩余库存等于总库存
      status: 'ACTIVE', // 默认状态为启用
      // 处理日期字段
      startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      // 处理数组字段，确保不为 undefined
      applicableProducts: dto.applicableProducts || [],
      applicableCategories: dto.applicableCategories || [],
      memberLevels: dto.memberLevels || [],
    });

    this.logger.log({
      message: 'Coupon template created',
      templateId: template.id,
      name: template.name,
      type: template.type,
    });

    return Result.ok(FormatDateFields(template), '创建成功');
  }

  /**
   * 更新优惠券模板
   * 
   * @param id 模板ID
   * @param dto 更新数据
   * @returns 更新结果
   */
  @Transactional()
  async update(id: string, dto: UpdateCouponTemplateDto) {
    // 1. 存在性检查
    const template = await this.repo.findById(id);
    BusinessException.throwIfNull(template, '待更新的模板不存在');

    // 2. 检查是否已开始发放
    const hasDistributed = await this.repo.hasDistributed(id);
    BusinessException.throwIf(hasDistributed, '已开始发放的模板不能修改');

    // 3. 如果更新了配置，需要验证
    if (dto.type || dto.discountAmount || dto.discountPercent || dto.validityType) {
      const mergedDto = { ...template, ...dto };
      this.validateTemplateConfig(mergedDto as any);
    }

    // 4. 执行更新
    const updated = await this.repo.update(id, {
      ...dto,
      // 处理日期字段
      startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
    });

    this.logger.log({
      message: 'Coupon template updated',
      templateId: id,
      name: updated.name,
    });

    return Result.ok(FormatDateFields(updated), '更新成功');
  }

  /**
   * 停用优惠券模板
   * 
   * @param id 模板ID
   * @returns 停用结果
   */
  async deactivate(id: string) {
    const template = await this.repo.findById(id);
    BusinessException.throwIfNull(template, '待停用的模板不存在');

    await this.repo.update(id, { status: 'INACTIVE' });

    this.logger.log({
      message: 'Coupon template deactivated',
      templateId: id,
      name: template.name,
    });

    return Result.ok(null, '停用成功');
  }

  /**
   * 验证模板配置
   * 
   * @description 根据优惠券类型验证必填字段和业务规则
   * @param dto 模板数据
   * @throws BusinessException 验证失败时抛出异常
   */
  private validateTemplateConfig(dto: CreateCouponTemplateDto | any): void {
    // 满减券验证
    if (dto.type === 'DISCOUNT') {
      BusinessException.throwIf(
        !dto.discountAmount || dto.discountAmount <= 0,
        '满减券必须设置减免金额',
      );
    }

    // 折扣券验证
    if (dto.type === 'PERCENTAGE') {
      BusinessException.throwIf(
        !dto.discountPercent || dto.discountPercent < 1 || dto.discountPercent > 99,
        '折扣券的折扣百分比必须在1-99之间',
      );
    }

    // 兑换券验证
    if (dto.type === 'EXCHANGE') {
      BusinessException.throwIf(!dto.exchangeProductId, '兑换券必须关联可兑换的商品');
    }

    // 有效期验证
    if (dto.validityType === 'FIXED') {
      BusinessException.throwIf(!dto.startTime || !dto.endTime, '固定时间段类型必须设置起止时间');

      const startTime = new Date(dto.startTime);
      const endTime = new Date(dto.endTime);
      BusinessException.throwIf(startTime >= endTime, '开始时间必须早于结束时间');
    } else if (dto.validityType === 'RELATIVE') {
      BusinessException.throwIf(
        !dto.validDays || dto.validDays <= 0,
        '相对时间类型必须设置有效天数',
      );
    }
  }

  /**
   * 获取模板统计信息
   * 
   * @description 查询模板的发放数量、使用数量和使用率
   * @param templateId 模板ID
   * @returns 统计信息
   */
  private async getTemplateStats(templateId: string) {
    const [distributedCount, usedCount] = await Promise.all([
      this.repo.countDistributed(templateId),
      this.repo.countUsed(templateId),
    ]);

    return {
      distributedCount,
      usedCount,
      usageRate: distributedCount > 0 ? (usedCount / distributedCount) * 100 : 0,
    };
  }
}
