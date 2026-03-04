import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserType } from 'src/module/admin/system/user/dto/user';

export const User = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  // 如果指定了属性名，返回该属性（支持嵌套属性如 'user.userName'）
  if (data) {
    const keys = data.split('.');
    return keys.reduce((obj, key) => obj?.[key], user);
  }

  return user;
});

export type UserDto = UserType;

export const NotRequireAuth = () => SetMetadata('notRequireAuth', true);

/** 支持 createBy/updateBy 注入的 DTO 接口 */
interface WithCreateUpdateBy {
  createBy?: string;
  updateBy?: string;
  [key: string]: unknown;
}

export const UserTool = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  const userName = request.user?.user?.userName;

  const injectCreate = <T extends WithCreateUpdateBy>(data: T): T => {
    const obj = data as WithCreateUpdateBy;
    if (!obj.createBy) {
      obj.createBy = userName;
    }
    if (!obj.updateBy) {
      obj.updateBy = userName;
    }
    return data;
  };

  const injectUpdate = <T extends WithCreateUpdateBy>(data: T): T => {
    const obj = data as WithCreateUpdateBy;
    if (!obj.updateBy) {
      obj.updateBy = userName;
    }
    return data;
  };

  return { injectCreate, injectUpdate };
});

export type UserToolType = {
  injectCreate: <T>(data: T) => T;
  injectUpdate: <T>(data: T) => T;
};
