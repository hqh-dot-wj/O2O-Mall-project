import { MarketingStockMode } from '@prisma/client';
import { GroupBuyRulesDto } from './dto/group-buy.dto';
import { CourseGroupBuyRulesDto } from './dto/course-group-buy.dto';
import { FlashSaleRulesDto } from './dto/flash-sale.dto';
import { FullReductionRulesDto } from './dto/full-reduction.dto';
import { MemberUpgradeRulesDto } from './dto/member-upgrade.dto';

/**
 * 玩法元数据接口
 *
 * @description
 * 定义每个营销玩法的核心属性和特征，用于：
 * 1. 标准化玩法开发流程
 * 2. 自动化玩法注册和管理
 * 3. 提供玩法查询和展示
 * 4. 指导前端动态表单生成
 */
export interface PlayMetadata {
  /**
   * 玩法代码
   * - 唯一标识符
   * - 与数据库 templateCode 字段对应
   */
  code: string;

  /**
   * 玩法名称
   * - 用于前端展示
   * - 中文名称
   */
  name: string;

  /**
   * 是否有实例
   * - true: 需要创建 PlayInstance 记录（如拼团、秒杀）
   * - false: 不需要实例，直接应用规则（如满减、会员折扣）
   */
  hasInstance: boolean;

  /**
   * 是否有状态流转
   * - true: 实例有生命周期状态（PENDING_PAY -> PAID -> SUCCESS）
   * - false: 无状态流转
   */
  hasState: boolean;

  /**
   * 是否可失败
   * - true: 活动可能失败（如拼团人数不足）
   * - false: 活动不会失败（如秒杀、满减）
   */
  canFail: boolean;

  /**
   * 是否可并行
   * - true: 用户可以同时参与多个该类型活动（如满减）
   * - false: 用户同时只能参与一个该类型活动（如秒杀）
   */
  canParallel: boolean;

  /**
   * 规则 Schema
   * - 对应的规则 DTO 类
   * - 用于规则校验和表单生成
   */
  ruleSchema: any;

  /**
   * 默认库存模式
   * - STRONG_LOCK: 强锁定，扣减库存时加锁（实物商品）
   * - LAZY_CHECK: 懒检查，不加锁，依靠后续流程保障（虚拟商品）
   */
  defaultStockMode: MarketingStockMode;

  /**
   * 玩法描述
   * - 简要说明玩法的业务逻辑
   * - 用于文档和前端提示
   */
  description?: string;
}

/**
 * 玩法注册表
 *
 * @description
 * 集中管理所有营销玩法的元数据。
 * 这是营销引擎的"玩法身份证"，记录了每个玩法的核心特征。
 *
 * 新增玩法时的步骤：
 * 1. 在此注册表中添加玩法元数据
 * 2. 创建对应的 Service 类并添加 @PlayStrategy 装饰器
 * 3. 创建对应的 RulesDto 类
 * 4. 无需修改工厂类，系统自动识别
 *
 * @example
 * // 查询玩法元数据
 * const metadata = PLAY_REGISTRY['GROUP_BUY'];
 * console.log(metadata.name); // "普通拼团"
 * console.log(metadata.hasInstance); // true
 */
export const PLAY_REGISTRY: Record<string, PlayMetadata> = {
  /**
   * 普通拼团
   * - 用户发起或参与拼团
   * - 人数达到要求后成功
   * - 超时未满员则失败退款
   */
  GROUP_BUY: {
    code: 'GROUP_BUY',
    name: '普通拼团',
    hasInstance: true,
    hasState: true,
    canFail: true,
    canParallel: true,
    ruleSchema: GroupBuyRulesDto,
    defaultStockMode: MarketingStockMode.STRONG_LOCK,
    description: '用户发起或参与拼团，人数达到要求后成功，超时未满员则失败退款',
  },

  /**
   * 拼班课程
   * - 类似拼团，但针对课程场景
   * - 需要设置上课时间、地址、报名截止时间
   * - 人数达到要求后开班
   */
  COURSE_GROUP_BUY: {
    code: 'COURSE_GROUP_BUY',
    name: '拼班课程',
    hasInstance: true,
    hasState: true,
    canFail: true,
    canParallel: true,
    ruleSchema: CourseGroupBuyRulesDto,
    defaultStockMode: MarketingStockMode.LAZY_CHECK,
    description: '课程拼团，人数达到要求后开班，需设置上课时间和地址',
  },

  /**
   * 限时秒杀
   * - 限量商品，先到先得
   * - 必须使用强锁定库存模式
   * - 不可失败（抢到即成功）
   * - 不可并行（同时只能参与一个秒杀）
   */
  FLASH_SALE: {
    code: 'FLASH_SALE',
    name: '限时秒杀',
    hasInstance: true,
    hasState: true,
    canFail: false,
    canParallel: false,
    ruleSchema: FlashSaleRulesDto,
    defaultStockMode: MarketingStockMode.STRONG_LOCK,
    description: '限量商品先到先得，必须使用强锁定库存模式',
  },

  /**
   * 满减活动
   * - 订单满足金额条件后自动减免
   * - 无需创建实例，直接应用规则
   * - 可设置多档位（满100减10，满200减30）
   */
  FULL_REDUCTION: {
    code: 'FULL_REDUCTION',
    name: '满减活动',
    hasInstance: false,
    hasState: false,
    canFail: false,
    canParallel: true,
    ruleSchema: FullReductionRulesDto,
    defaultStockMode: MarketingStockMode.LAZY_CHECK,
    description: '订单满足金额条件后自动减免，可设置多档位',
  },

  /**
   * 会员升级
   * - 用户支付升级费用后提升会员等级
   * - 直接成功，无失败场景
   */
  MEMBER_UPGRADE: {
    code: 'MEMBER_UPGRADE',
    name: '会员升级',
    hasInstance: true,
    hasState: true,
    canFail: false,
    canParallel: false,
    ruleSchema: MemberUpgradeRulesDto,
    defaultStockMode: MarketingStockMode.LAZY_CHECK,
    description: '用户支付升级费用后提升会员等级',
  },
};

/**
 * 获取所有玩法代码列表
 *
 * @returns 玩法代码数组
 *
 * @example
 * const codes = getAllPlayCodes();
 * // ['GROUP_BUY', 'COURSE_GROUP_BUY', 'FLASH_SALE', 'FULL_REDUCTION', 'MEMBER_UPGRADE']
 */
export function getAllPlayCodes(): string[] {
  return Object.keys(PLAY_REGISTRY);
}

/**
 * 获取所有玩法元数据列表
 *
 * @returns 玩法元数据数组
 *
 * @example
 * const allPlays = getAllPlayMetadata();
 * allPlays.forEach(play => {
 *   console.log(`${play.name}: ${play.description}`);
 * });
 */
export function getAllPlayMetadata(): PlayMetadata[] {
  return Object.values(PLAY_REGISTRY);
}

/**
 * 根据代码获取玩法元数据
 *
 * @param code 玩法代码
 * @returns 玩法元数据，如果不存在返回 undefined
 *
 * @example
 * const metadata = getPlayMetadata('GROUP_BUY');
 * if (metadata) {
 *   console.log(metadata.name); // "普通拼团"
 * }
 */
export function getPlayMetadata(code: string): PlayMetadata | undefined {
  return PLAY_REGISTRY[code];
}

/**
 * 检查玩法代码是否存在
 *
 * @param code 玩法代码
 * @returns 是否存在
 *
 * @example
 * if (isValidPlayCode('GROUP_BUY')) {
 *   // 玩法存在
 * }
 */
export function isValidPlayCode(code: string): boolean {
  return code in PLAY_REGISTRY;
}

/**
 * 根据特征筛选玩法
 *
 * @param filter 筛选条件
 * @returns 符合条件的玩法元数据数组
 *
 * @example
 * // 查询所有有实例的玩法
 * const withInstance = filterPlays({ hasInstance: true });
 *
 * // 查询所有可失败的玩法
 * const canFail = filterPlays({ canFail: true });
 *
 * // 查询所有使用强锁定库存的玩法
 * const strongLock = filterPlays({ defaultStockMode: MarketingStockMode.STRONG_LOCK });
 */
export function filterPlays(filter: Partial<PlayMetadata>): PlayMetadata[] {
  return getAllPlayMetadata().filter((play) => {
    return Object.entries(filter).every(([key, value]) => {
      return play[key as keyof PlayMetadata] === value;
    });
  });
}

