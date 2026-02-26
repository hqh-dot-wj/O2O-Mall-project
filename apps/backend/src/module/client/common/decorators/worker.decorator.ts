import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Worker 端用户参数装饰器
 *
 * @description
 * 从 request.user 中提取 Worker 用户信息。
 * 与 @Member() 装饰器功能相同，但语义上用于 Worker 端 Controller。
 *
 * @example
 * ```typescript
 * @UseGuards(WorkerAuthGuard)
 * @Get('profile')
 * getProfile(@Worker() worker: any) {
 *   return worker;
 * }
 *
 * @Get('id')
 * getId(@Worker('memberId') memberId: string) {
 *   return memberId;
 * }
 * ```
 */
export const Worker = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  if (data) {
    return user?.[data];
  }

  return user;
});
