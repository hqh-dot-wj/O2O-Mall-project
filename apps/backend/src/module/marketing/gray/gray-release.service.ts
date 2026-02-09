import { Injectable, Logger } from '@nestjs/common';
import { StorePlayConfig } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * 灰度发布配置接口
 * 
 * @description
 * 用于控制营销活动的灰度发布策略，支持三种灰度方式：
 * 1. 白名单用户：指定用户ID列表
 * 2. 白名单门店：指定门店ID列表
 * 3. 按比例灰度：基于用户ID哈希的百分比控制
 */
export interface GrayReleaseConfig {
  /** 是否启用灰度发布 */
  enabled: boolean;
  
  /** 白名单用户ID列表（这些用户始终可以参与活动） */
  whitelistUserIds: string[];
  
  /** 白名单门店ID列表（这些门店的所有用户都可以参与活动） */
  whitelistStoreIds: string[];
  
  /** 灰度比例 0-100，表示允许参与活动的用户百分比 */
  percentage: number;
}

/**
 * 灰度发布服务
 * 
 * @description
 * 提供营销活动的灰度发布功能，支持：
 * - 白名单用户控制
 * - 白名单门店控制
 * - 基于用户ID哈希的百分比灰度
 * 
 * @example
 * ```typescript
 * // 检查用户是否在灰度范围内
 * const canJoin = await grayReleaseService.isInGrayRelease(
 *   config,
 *   'user-123',
 *   'store-456'
 * );
 * 
 * if (!canJoin) {
 *   throw new BusinessException('活动暂未对您开放');
 * }
 * ```
 * 
 * @验证需求 FR-7.2, US-6
 */
@Injectable()
export class GrayReleaseService {
  private readonly logger = new Logger(GrayReleaseService.name);

  /**
   * 检查用户是否在灰度发布范围内
   * 
   * @description
   * 按照以下优先级判断：
   * 1. 如果未启用灰度，返回 true（全量放开）
   * 2. 如果用户在白名单中，返回 true
   * 3. 如果门店在白名单中，返回 true
   * 4. 按照灰度比例，基于用户ID哈希判断
   * 
   * @param config - 活动配置对象（包含 grayRelease 字段）
   * @param memberId - 用户ID
   * @param storeId - 门店ID
   * @returns 是否在灰度范围内
   * 
   * @example
   * ```typescript
   * // 场景1: 未启用灰度
   * const config = { grayRelease: { enabled: false } };
   * await isInGrayRelease(config, 'user-1', 'store-1'); // true
   * 
   * // 场景2: 白名单用户
   * const config = {
   *   grayRelease: {
   *     enabled: true,
   *     whitelistUserIds: ['user-1'],
   *     whitelistStoreIds: [],
   *     percentage: 0
   *   }
   * };
   * await isInGrayRelease(config, 'user-1', 'store-1'); // true
   * 
   * // 场景3: 按比例灰度（50%）
   * const config = {
   *   grayRelease: {
   *     enabled: true,
   *     whitelistUserIds: [],
   *     whitelistStoreIds: [],
   *     percentage: 50
   *   }
   * };
   * await isInGrayRelease(config, 'user-1', 'store-1'); // 基于哈希判断
   * ```
   * 
   * @验证需求 FR-7.2, US-6
   */
  async isInGrayRelease(
    config: StorePlayConfig | any,
    memberId: string,
    storeId: string,
  ): Promise<boolean> {
    // 解析灰度配置（从 JSON 字段中提取）
    // 注意：grayRelease 字段需要在 Prisma schema 中添加
    const grayConfig = config.grayRelease as GrayReleaseConfig | null;

    // 1. 如果未启用灰度，全量放开
    if (!grayConfig || !grayConfig.enabled) {
      this.logger.debug(
        `[灰度检查] 活动 ${config.id} 未启用灰度，全量放开`,
      );
      return true;
    }

    // 2. 检查白名单用户
    if (
      grayConfig.whitelistUserIds &&
      grayConfig.whitelistUserIds.includes(memberId)
    ) {
      this.logger.debug(
        `[灰度检查] 用户 ${memberId} 在白名单中，允许参与活动 ${config.id}`,
      );
      return true;
    }

    // 3. 检查白名单门店
    if (
      grayConfig.whitelistStoreIds &&
      grayConfig.whitelistStoreIds.includes(storeId)
    ) {
      this.logger.debug(
        `[灰度检查] 门店 ${storeId} 在白名单中，允许用户 ${memberId} 参与活动 ${config.id}`,
      );
      return true;
    }

    // 4. 按比例灰度（基于用户ID哈希）
    const percentage = grayConfig.percentage || 0;
    const userHash = this.hashUserId(memberId);
    const inGrayRange = userHash < percentage;

    this.logger.debug(
      `[灰度检查] 用户 ${memberId} 哈希值 ${userHash}，灰度比例 ${percentage}%，` +
        `${inGrayRange ? '在' : '不在'}灰度范围内`,
    );

    return inGrayRange;
  }

  /**
   * 计算用户ID的哈希值（0-99）
   * 
   * @description
   * 使用 MD5 哈希算法将用户ID映射到 0-99 的范围内。
   * 相同的用户ID始终返回相同的哈希值，确保灰度策略的稳定性。
   * 
   * 算法说明：
   * 1. 对用户ID进行 MD5 哈希
   * 2. 取哈希值的前8个字符
   * 3. 转换为16进制数字
   * 4. 对100取模，得到 0-99 的值
   * 
   * @param memberId - 用户ID
   * @returns 0-99 之间的整数
   * 
   * @example
   * ```typescript
   * hashUserId('user-123'); // 例如返回 42
   * hashUserId('user-123'); // 始终返回 42（稳定性）
   * hashUserId('user-456'); // 例如返回 78（不同用户不同值）
   * ```
   * 
   * @private
   */
  private hashUserId(memberId: string): number {
    // 使用 MD5 哈希算法
    const hash = crypto.createHash('md5').update(memberId).digest('hex');
    
    // 取前8个字符，转换为16进制数字
    const hashValue = parseInt(hash.substring(0, 8), 16);
    
    // 对100取模，得到 0-99 的值
    return hashValue % 100;
  }

  /**
   * 获取活动的灰度配置
   * 
   * @description
   * 从活动配置中提取灰度发布配置，如果不存在则返回默认配置（未启用灰度）
   * 
   * @param config - 活动配置对象
   * @returns 灰度配置对象
   * 
   * @example
   * ```typescript
   * const grayConfig = getGrayConfig(config);
   * console.log(grayConfig.enabled); // true/false
   * console.log(grayConfig.percentage); // 0-100
   * ```
   */
  getGrayConfig(config: StorePlayConfig | any): GrayReleaseConfig {
    const grayConfig = config.grayRelease as GrayReleaseConfig | null;

    // 返回默认配置（未启用灰度）
    if (!grayConfig) {
      return {
        enabled: false,
        whitelistUserIds: [],
        whitelistStoreIds: [],
        percentage: 0,
      };
    }

    return grayConfig;
  }

  /**
   * 验证灰度配置的合法性
   * 
   * @description
   * 检查灰度配置是否符合业务规则：
   * - percentage 必须在 0-100 之间
   * - whitelistUserIds 和 whitelistStoreIds 必须是数组
   * 
   * @param grayConfig - 灰度配置对象
   * @throws {Error} 如果配置不合法
   * 
   * @example
   * ```typescript
   * validateGrayConfig({
   *   enabled: true,
   *   whitelistUserIds: ['user-1'],
   *   whitelistStoreIds: [],
   *   percentage: 50
   * }); // 通过
   * 
   * validateGrayConfig({
   *   enabled: true,
   *   whitelistUserIds: [],
   *   whitelistStoreIds: [],
   *   percentage: 150
   * }); // 抛出异常：灰度比例必须在 0-100 之间
   * ```
   */
  validateGrayConfig(grayConfig: GrayReleaseConfig): void {
    // 检查 percentage 范围
    if (grayConfig.percentage < 0 || grayConfig.percentage > 100) {
      throw new Error('灰度比例必须在 0-100 之间');
    }

    // 检查白名单是否为数组
    if (!Array.isArray(grayConfig.whitelistUserIds)) {
      throw new Error('whitelistUserIds 必须是数组');
    }

    if (!Array.isArray(grayConfig.whitelistStoreIds)) {
      throw new Error('whitelistStoreIds 必须是数组');
    }
  }
}
