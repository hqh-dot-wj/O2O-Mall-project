import { Status, DelFlag } from '@prisma/client';

/**
 * 数据状态枚举
 * - NORMAL (0): 正常/启用
 * - STOP (1): 停用/禁用
 */
export const StatusEnum = Status;
export type StatusEnum = Status;

/** StatusEnum Swagger Schema */
export const StatusEnumSchema = {
  description: `数据状态枚举
- NORMAL (0): 正常/启用
- STOP (1): 停用/禁用`,
};

/**
 * 删除标志枚举
 * - NORMAL (0): 正常（未删除）
 * - DELETE (1): 已删除
 */
export const DelFlagEnum = DelFlag;
export type DelFlagEnum = DelFlag;

/** DelFlagEnum Swagger Schema */
export const DelFlagEnumSchema = {
  description: `删除标志枚举
- NORMAL (0): 正常（未删除）
- DELETE (1): 已删除`,
};
