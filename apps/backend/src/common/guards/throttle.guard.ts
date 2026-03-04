import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/** 限流器可识别的请求结构 */
interface ThrottleRequestLike {
  user?: { userId?: string };
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: ThrottleRequestLike): Promise<string> {
    const user = req.user;
    if (user?.userId) return `user-${user.userId}`;

    const headers = req.headers;
    const forwarded = Array.isArray(headers?.['x-forwarded-for'])
      ? headers['x-forwarded-for'][0]
      : headers?.['x-forwarded-for'];
    const ip =
      req.ip ?? (typeof forwarded === 'string' ? forwarded : undefined) ?? req.socket?.remoteAddress ?? 'unknown';
    return `ip-${ip}`;
  }

  // ThrottlerGuard in newer versions expects an async method with this signature
  protected async throwThrottlingException(context: ExecutionContext, _throttlerLimitDetail?: unknown): Promise<void> {
    throw new ThrottlerException('请求过于频繁，请稍后再试');
  }
}
