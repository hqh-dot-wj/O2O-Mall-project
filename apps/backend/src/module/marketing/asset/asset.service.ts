import { Injectable } from '@nestjs/common';
import { UserAssetRepository } from './asset.repository';
import { ListUserAssetDto } from './dto/asset.dto';
import { Result } from 'src/common/response/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { AssetStatus } from '@prisma/client';
import { ResponseCode } from 'src/common/response/response.interface';
import { FormatDateFields } from 'src/common/utils';
import { Transactional } from 'src/common/decorators/transactional.decorator'; // 使用声明式事务

/**
 * 用户资产服务 (履约中心 / Fulfillment Center)
 *
 * @description
 * 处理营销活动产生的所有权益资产（如优惠券、次卡、核销券等）。
 * 负责资产的查询展现、生命周期维护及高一致性的核销逻辑。
 */
@Injectable()
export class UserAssetService {
  constructor(private readonly repo: UserAssetRepository) {}

  /**
   * 分页查询用户拥有的资产列表
   * @param query 过滤条件 (会员ID、状态等)
   */
  async findAll(query: ListUserAssetDto) {
    const { rows, total } = await this.repo.search(query);
    // ✅ 中文注释：统一日期字段序列化格式，确保前端展示的一致性
    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 查询资产记录详情
   * @param id 资产唯一标识
   */
  async findOne(id: string) {
    const asset = await this.repo.findById(id);
    // ✅ 中文注释：使用语义化异常断言，替代手动 null 检查
    BusinessException.throwIfNull(asset, '未找到该项资产记录');
    return Result.ok(FormatDateFields(asset));
  }

  /**
   * 核销资产 (最核心的履约操作)
   *
   * @description 执行权益的扣减逻辑，包含状态预检、有效期校验及余额扣减。
   * @param id 资产记录ID
   * @param useAmount 拟扣减的额度/次数
   */
  @Transactional() // ✅ 中文注释：开启事务，确保扣减额度与状态变更的原子性
  async consumeAsset(id: string, useAmount: number) {
    const asset = await this.repo.findById(id);
    BusinessException.throwIfNull(asset, '待核销的资产不存在');

    // 1. 资产可用性预检 (卫语句)
    BusinessException.throwIf(
      asset.status !== AssetStatus.UNUSED && asset.status !== AssetStatus.FROZEN,
      '当前资产状态已锁定或已失效，无法进行核销',
    );

    // 2. 有效期风控校验
    if (asset.expireTime && new Date() > asset.expireTime) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '该权益资产已过有效期');
    }

    // 3. 余额/次数充裕性校验
    if (Number(asset.balance) < useAmount) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '资产余额不足，核销失败');
    }

    // 4. 执行核心扣减逻辑
    const updated = await this.repo.consume(id, useAmount);

    // 5. 后置状态流转：如果余额已耗尽，则自动标记为“已使用”终态
    if (Number(updated.balance) <= 0) {
      await this.repo.update(id, { status: AssetStatus.USED });
    }

    return Result.ok(FormatDateFields(updated), '权益核销成功');
  }

  /**
   * 系统发放资产 (由支付完成回调触发)
   */
  async grantAsset(data: any) {
    // 由 MarketingInstanceService 调用
    return this.repo.create(data);
  }
}
