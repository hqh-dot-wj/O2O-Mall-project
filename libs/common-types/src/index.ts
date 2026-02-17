import type { components, paths } from './api';

export * from './enum';
export * from './api';

/**
 * 🛰️ 请求响应通用映射
 */
export type ApiResult<T> = components["schemas"]["Result"] & { data: T };

/**
 * 📄 分页响应通用映射
 * 假设后端分页结构为 { list: T[], total: number }
 */
export type ApiPageResult<T> = ApiResult<{
  list: T[];
  total: number;
}>;

/**
 * 🔍 获取路径参数的工具类型
 * Usage: type Params = RequestParams<"/system/user/list", "get">
 */
export type RequestParams<
  P extends keyof paths,
  M extends keyof paths[P] & string
> = paths[P][M] extends { parameters: { query?: infer Q } } ? Q : never;

/**
 * 📦 业务实体别名 (推荐在这里统一维护常用实体名)
 * 这样业务代码就不需要关心后端原始的 DTO/VO 命名习惯 (比如 Vo/Dto 后缀)
 */

// 系统管理
export type User = components["schemas"]["UserVo"];
export type Role = components["schemas"]["RoleVo"];
export type Dept = components["schemas"]["DeptVo"];
export type Menu = components["schemas"]["MenuVo"];
export type Config = components["schemas"]["ConfigVo"];

// 常用查询参数
export type ConfigQueryParams = RequestParams<"/api/system/config/list", "get"> & components["schemas"]["ListConfigDto"];
export type UserQueryParams = RequestParams<"/api/system/user/list", "get"> & components["schemas"]["ListUserDto"];
