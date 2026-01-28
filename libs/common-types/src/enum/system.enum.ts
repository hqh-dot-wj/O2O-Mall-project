/**
 * 系统级通用枚举
 * 对应 Prisma 中带有 @map("x") 的基础状态
 */

/** 启用状态 (0: 正常, 1: 停用) */
export enum StatusEnum {
  NORMAL = '0',
  STOP = '1',
}

/** 删除标记 (0: 正常, 1: 删除) */
export enum DelFlagEnum {
  NORMAL = '0',
  DELETE = '1',
}

/** 性别 (0: 未知, 1: 男, 2: 女) */
export enum GenderEnum {
  UNKNOWN = '0',
  MALE = '1',
  FEMALE = '2',
}

/** 审核状态 (0: 待审核, 1: 通过, 2: 驳回) */
export enum AuditStatusEnum {
  PENDING = '0',
  APPROVED = '1',
  REJECTED = '2',
}

/** 媒体类型 (1: 图片, 2: 视频) */
export enum MediaTypeEnum {
  IMAGE = '1',
  VIDEO = '2',
}
