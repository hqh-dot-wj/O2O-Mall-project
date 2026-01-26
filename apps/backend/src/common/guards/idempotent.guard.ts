import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from 'src/module/common/redis/redis.service';
import { BusinessException } from '../exceptions/business.exception';
import { ResponseCode } from '../response/response.interface';
import { IDEMPOTENT_KEY } from 'src/common/decorators/idempotent.decorator';

/**
 * 幂等校验守卫
 *
 * @description
 * 通过请求头中的 X-Idempotent-ID 校验请求的幂等性。
 * 防止用户重复提交或者是网络重试导致的重复逻辑执行。
 */
@Injectable()
export class IdempotentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 检查方法是否标注了 @Idempotent 装饰器
    const options = this.reflector.get(IDEMPOTENT_KEY, context.getHandler());
    if (!options) {
      return true;
    }

    // 获取幂等 ID (优先从 Header 获取)
    const idempotentId = request.headers['x-idempotent-id'];

    if (!idempotentId) {
      // 如果标注了必须幂等但没传 ID，抛出异常
      throw new BusinessException(ResponseCode.PARAM_INVALID, '缺少幂等请求标识 (X-Idempotent-ID)');
    }

    // 构建过滤键 (用户ID + 请求路径 + 幂等ID)
    const userId = request.user?.userId || 'anonymous';
    const path = request.path;
    const redisKey = `idempotent:${userId}:${path}:${idempotentId}`;

    // 尝试在 Redis 中设置 (NX = Not Exist)
    const isSuccess = await this.redisService.tryLock(redisKey, options.ttl || 60000);

    if (!isSuccess) {
      throw new BusinessException(ResponseCode.OPERATION_FAILED, '请求正在处理中，请勿重复点击');
    }

    return true;
  }
}
