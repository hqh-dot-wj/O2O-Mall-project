import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MarketingStockMode } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';

/**
 * 营销库存/名额原子扣减 Lua 脚本
 * @description
 * 在 Redis 服务端执行原子操作，合并“读取库存、判断剩余、执行减法”三个动作。
 * 有效防止在秒杀、团购等高并发场景下出现的“超卖”现象。
 * 返回值说明：
 *   1  - 扣减成功：剩余库存足够并已执行减法
 *  -1  - 库存不足：当前剩余名额少于申请扣减的数量
 *  -2  - 缓存丢失：Redis 中不存在该 Key，需要触发懒加载同步
 */
const DECR_STOCK_LUA = `
    local key = KEYS[1]
    local amount = tonumber(ARGV[1])
    local current = redis.call('get', key)
    
    if not current then
        return -2
    end
    
    if tonumber(current) >= amount then
        redis.call('decrby', key, amount)
        return 1
    else
        return -1
    end
`;

/**
 * 营销库存引擎 (Marketing Stock Engine)
 *
 * @description
 * 统一管理所有营销活动的剩余名额。支持多种互斥策略以平衡性能与一致性：
 * 1. 强互斥 (STRONG_LOCK): 适用于限量实物，下单立即预扣，锁定名额，保障用户支付体验。
 * 2. 弱互斥 (LAZY_CHECK): 适用于服务资源，仅做参考校验，核心逻辑在支付回调流转中完成。
 */
@Injectable()
export class MarketingStockService implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // ✅ 中文注释：在模块初始化时注册自定义 Lua 指令到 Redis 实例
    this.redisService.getClient().defineCommand('mktDecrStock', {
      numberOfKeys: 1,
      lua: DECR_STOCK_LUA,
    });
  }

  /**
   * 获取库存缓存 Key
   */
  private getStockKey(configId: string): string {
    return `mkt:stock:${configId}`;
  }

  /**
   * 初始化库存到缓存 (通常在活动上线或管理端修改配置后调用)
   * @param configId 配置ID
   * @param stock 指定库存量
   */
  async initStock(configId: string, stock: number) {
    const key = this.getStockKey(configId);
    await this.redisService.set(key, stock);
  }

  /**
   * 原子扣减库存
   *
   * @param configId 营销配置ID (对应 StorePlayConfig)
   * @param amount 扣减数量
   * @param mode 库存模式 (STRONG_LOCK/LAZY_CHECK)
   */
  async decrement(configId: string, amount: number, mode: MarketingStockMode): Promise<boolean> {
    // 弱校验模式，直接放行，依靠后续流程保障
    if (mode === MarketingStockMode.LAZY_CHECK) {
      return true;
    }

    const key = this.getStockKey(configId);

    // ✅ 中文注释：调用预注册的 Lua 脚本执行原子扣减
    const result = await (this.redisService.getClient() as any).mktDecrStock(key, amount);

    if (result === 1) {
      return true;
    }

    if (result === -2) {
      // ✅ 中文注释：缓存失效补偿机制 - 懒加载从数据库同步数据到 Redis 并重试一次请求
      await this.syncFromDb(configId);
      const retryResult = await (this.redisService.getClient() as any).mktDecrStock(key, amount);
      return retryResult === 1;
    }

    if (result === -1) {
      // ✅ 中文注释：使用标准业务异常抛出库存不足提示，会被异常过滤器拦截返回给前端
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '当前活动参与人数过多，名额已抢光！');
    }

    return false;
  }

  /**
   * 归还库存/名额 (适用于订单取消、超时、退款等场景)
   */
  async increment(configId: string, amount: number) {
    const key = this.getStockKey(configId);
    const exists = await this.redisService.get(key);
    // 仅当缓存存在时才归还，防止冷数据归还导致库存虚增
    if (exists !== null) {
      await this.redisService.getClient().incrby(key, amount);
    }
  }

  /**
   * 从数据库同步库存状态 (灾备方案)
   * @description 用于在缓存丢失时恢复最新的库存数据
   */
  private async syncFromDb(configId: string) {
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new BusinessException(ResponseCode.DATA_NOT_FOUND, '未找到关联的营销配置信息');
    }

    // 解析配置中的规则 JSON，提取库存字段
    const stock = (config.rules as any)?.stock ?? 0;
    await this.initStock(configId, stock);
  }
}
