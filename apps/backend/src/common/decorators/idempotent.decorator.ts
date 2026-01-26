import { SetMetadata } from '@nestjs/common';

/**
 * 幂等性校验元数据 Key
 */
export const IDEMPOTENT_KEY = 'idempotent_key';

/**
 * 拦截重复请求配置
 */
export interface IdempotentOptions {
  /** 有效期 (毫秒)，在这段时间内重复的 ID 会被拦截，默认 60s */
  ttl?: number;
}

/**
 * 幂等性校验装饰器
 *
 * @description
 * 在 Controller 方法上标注此装饰器，会自动启用 IdempotentGuard。
 * 配合前端在 Header 中传入 X-Idempotent-ID 使用。
 */
export const Idempotent = (options: IdempotentOptions = {}) => SetMetadata(IDEMPOTENT_KEY, options);
