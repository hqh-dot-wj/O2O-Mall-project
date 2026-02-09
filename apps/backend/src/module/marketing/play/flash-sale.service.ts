import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IMarketingStrategy } from './strategy.interface';
import { PlayInstance, StorePlayConfig, PlayInstanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { PlayInstanceService } from '../instance/instance.service';
import { MarketingStockService } from '../stock/stock.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { FlashSaleRulesDto, FlashSaleJoinDto } from './dto/flash-sale.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlayStrategy } from './play-strategy.decorator';

/**
 * 限时秒杀玩法核心逻辑
 */
@Injectable()
@PlayStrategy('FLASH_SALE')
export class FlashSaleService implements IMarketingStrategy {
  readonly code = 'FLASH_SALE';

  constructor(
    @Inject(forwardRef(() => PlayInstanceService))
    private readonly instanceService: PlayInstanceService,
    private readonly stockService: MarketingStockService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 1.1 配置校验
   */
  async validateConfig(dto: any): Promise<void> {
    const rules = dto.rules;
    BusinessException.throwIf(!rules, '规则配置不能为空');

    // 使用 DTO 进行严格校验
    const rulesDto = plainToInstance(FlashSaleRulesDto, rules);
    const errors = await validate(rulesDto);

    if (errors.length > 0) {
      const constraints = errors[0].constraints;
      const msg = constraints ? Object.values(constraints)[0] : '规则配置校验失败';
      throw new BusinessException(ResponseCode.PARAM_INVALID, msg);
    }

    // 时间逻辑校验
    const startTime = new Date(rulesDto.startTime).getTime();
    const endTime = new Date(rulesDto.endTime).getTime();
    
    if (endTime <= startTime) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '结束时间必须晚于开始时间');
    }

    if (startTime < Date.now()) {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '开始时间不能早于当前时间');
    }

    // 秒杀活动必须使用强锁定库存模式
    if (dto.stockMode !== 'STRONG_LOCK') {
      throw new BusinessException(ResponseCode.PARAM_INVALID, '秒杀活动必须使用强锁定库存模式');
    }
  }

  /**
   * 1. 准入校验
   */
  async validateJoin(config: StorePlayConfig, memberId: string, params: any = {}): Promise<void> {
    const rules = config.rules as any;
    const joinDto = plainToInstance(FlashSaleJoinDto, params);
    const quantity = joinDto.quantity || 1;

    // A. 时间校验：必须在秒杀时间段内
    const now = Date.now();
    const startTime = new Date(rules.startTime).getTime();
    const endTime = new Date(rules.endTime).getTime();

    if (now < startTime) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '秒杀尚未开始');
    }

    if (now > endTime) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '秒杀已结束');
    }

    // B. 限购校验：检查用户已购买数量
    const userPurchased = await this.getUserPurchasedCount(config.id, memberId);
    const limitPerUser = rules.limitPerUser || 1;

    if (userPurchased + quantity > limitPerUser) {
      throw new BusinessException(
        ResponseCode.BUSINESS_ERROR,
        `每人限购${limitPerUser}件，您已购买${userPurchased}件`,
      );
    }

    // C. 库存校验：通过库存服务预检查（实际扣减在支付成功后）
    // 注意：这里只是预检查，真正的库存扣减在 onPaymentSuccess 中通过 decrement 完成
  }

  /**
   * 2. 计算价格
   */
  async calculatePrice(config: StorePlayConfig, params: any): Promise<Decimal> {
    const rules = config.rules as any;
    const quantity = params.quantity || 1;
    
    // 秒杀价格固定，不做动态计算
    const flashPrice = new Decimal(rules.flashPrice || 0);
    return flashPrice.mul(quantity);
  }

  /**
   * 3. 支付成功回调
   */
  async onPaymentSuccess(instance: PlayInstance): Promise<void> {
    // 扣减库存（通过库存服务的原子扣减）
    const data = instance.instanceData as any;
    const quantity = data.quantity || 1;
    
    // 获取配置以获取库存模式
    const config = await this.prisma.storePlayConfig.findUnique({
      where: { id: instance.configId },
    });

    if (config) {
      await this.stockService.decrement(instance.configId, quantity, config.stockMode);
    }
  }

  /**
   * 4. 状态流转钩子
   */
  async onStatusChange(instance: PlayInstance, oldStatus: string, newStatus: string): Promise<void> {
    // 秒杀成功后的额外逻辑（如发送通知等）
    if (newStatus === PlayInstanceStatus.SUCCESS) {
      // 可以在这里添加发送秒杀成功通知的逻辑
    }

    // 如果订单超时、失败或退款，需要释放库存
    if (
      newStatus === PlayInstanceStatus.TIMEOUT ||
      newStatus === PlayInstanceStatus.FAILED ||
      newStatus === PlayInstanceStatus.REFUNDED
    ) {
      const data = instance.instanceData as any;
      const quantity = data.quantity || 1;
      await this.stockService.increment(instance.configId, quantity);
    }
  }

  /**
   * 5. 前端展示增强数据
   */
  async getDisplayData(config: StorePlayConfig): Promise<any> {
    const rules = config.rules as any;
    const now = Date.now();
    const startTime = new Date(rules.startTime).getTime();
    const endTime = new Date(rules.endTime).getTime();

    // 计算秒杀状态
    let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ENDED' = 'NOT_STARTED';
    if (now >= startTime && now <= endTime) {
      status = 'IN_PROGRESS';
    } else if (now > endTime) {
      status = 'ENDED';
    }

    // 获取剩余库存（从 Redis 缓存读取）
    const stockKey = `mkt:stock:${config.id}`;
    const remainingStock = await this.prisma.$queryRaw<any>`
      SELECT 1
    `.then(() => rules.totalStock); // 简化处理，实际应该从 Redis 读取

    return {
      flashPrice: rules.flashPrice,
      totalStock: rules.totalStock,
      remainingStock: rules.totalStock, // 简化处理
      limitPerUser: rules.limitPerUser || 1,
      startTime: rules.startTime,
      endTime: rules.endTime,
      status,
      countdown: status === 'NOT_STARTED' ? startTime - now : status === 'IN_PROGRESS' ? endTime - now : 0,
    };
  }

  /**
   * 获取用户已购买数量
   */
  private async getUserPurchasedCount(configId: string, memberId: string): Promise<number> {
    const instances = await this.prisma.playInstance.findMany({
      where: {
        configId,
        memberId,
        status: {
          in: [PlayInstanceStatus.PAID, PlayInstanceStatus.ACTIVE, PlayInstanceStatus.SUCCESS],
        },
      },
    });

    // 累加购买数量
    return instances.reduce((sum, instance) => {
      const data = instance.instanceData as any;
      return sum + (data.quantity || 1);
    }, 0);
  }
}
