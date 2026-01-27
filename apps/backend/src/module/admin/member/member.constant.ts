/**
 * 会员管理相关常量定义
 */

/**
 * 会员状态枚举
 */
export enum MemberStatus {
    NORMAL = 'NORMAL',
    DISABLED = 'DISABLED',
}

/**
 * 会员状态映射 (用于 VO 展示)
 */
export const MemberStatusMap = {
    [MemberStatus.NORMAL]: '0', // 启用
    [MemberStatus.DISABLED]: '1', // 禁用
};

/**
 * 会员等级定义
 */
export enum MemberLevel {
    MEMBER = 0,      // 普通会员
    CAPTAIN = 1,     // C1 团长 (队长)
    SHAREHOLDER = 2, // C2 股东
}

/**
 * 会员等级名称映射
 */
export const MemberLevelNameMap = {
    [MemberLevel.MEMBER]: '普通会员',
    [MemberLevel.CAPTAIN]: 'C1团长',
    [MemberLevel.SHAREHOLDER]: 'C2股东',
};
