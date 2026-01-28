/**
 * 业务核心枚举
 * 对应 Prisma 中带有 @map("x") 的业务具体状态
 */

/** 会员状态 (1: 正常, 2: 禁用) */
export enum MemberStatusEnum {
  NORMAL = '1',
  DISABLED = '2',
}

/** 劳动者/技师状态 (1: 接单中, 2: 休息中, 3: 冻结中, 4: 离职中) */
export enum WorkerStatusEnum {
  WORKING = '1',
  RESTING = '2',
  FROZEN = '3',
  RESIGNED = '4',
}

/** 劳动者等级 (1: 初级, 2: 中级, 3: 高级, 4: 金牌) */
export enum WorkerLevelEnum {
  PRIMARY = '1',
  MIDDLE = '2',
  SENIOR = '3',
  GOLD = '4',
}

/** 技能熟练度 (1: 一般, 2: 精通) */
export enum SkillLevelEnum {
  GENERAL = '1',
  MASTER = '2',
}

/** 薪资类型 (1: 时薪制, 2: 分成制, 3: 一口价) */
export enum WageTypeEnum {
  HOURLY = '1',
  PERCENTAGE = '2',
  FIXED = '3',
}
