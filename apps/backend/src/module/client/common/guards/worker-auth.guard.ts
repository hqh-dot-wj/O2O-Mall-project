import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface MemberUser {
  memberId: string;
  platform: string;
}

/**
 * Worker 端认证守卫
 *
 * @description
 * 基于 member-jwt 策略验证 token，额外校验 JWT payload 中的 platform 是否为 MP_WORK。
 * 用于 `/client/worker-auth/` 等 Worker 专属接口。
 *
 * 复用 member-jwt 策略是因为 Worker 和 Member 共享同一套 JWT 签发机制，
 * 区别仅在于 platform 字段。后续如果 Worker 有独立的用户表和 token 体系，
 * 可以替换为独立的 passport strategy。
 */
@Injectable()
export class WorkerAuthGuard extends AuthGuard('member-jwt') {
  handleRequest<TUser = MemberUser>(err: Error | null, user: TUser | false, _info: unknown, _context: ExecutionContext): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('登录已过期，请重新登录');
    }

    // 校验 platform 必须为 MP_WORK
    if ((user as MemberUser).platform !== 'MP_WORK') {
      throw new UnauthorizedException('该接口仅限师傅端访问');
    }

    return user;
  }
}
