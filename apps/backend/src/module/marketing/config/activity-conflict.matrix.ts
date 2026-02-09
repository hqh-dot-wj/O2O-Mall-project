/**
 * 营销活动互斥规则矩阵
 * 
 * 定义哪些营销玩法可以同时应用于同一商品
 * 
 * 规则说明:
 * - EXCLUSIVE: 完全互斥，不能同时存在
 * - STACKABLE: 可叠加，可以同时存在
 * - PRIORITY: 有优先级，低优先级会被高优先级覆盖
 */

export enum ConflictType {
  EXCLUSIVE = 'EXCLUSIVE',   // 互斥
  STACKABLE = 'STACKABLE',   // 可叠加
  PRIORITY = 'PRIORITY',     // 优先级覆盖
}

export interface ConflictRule {
  type: ConflictType
  reason?: string
  priority?: number  // 数字越小优先级越高
}

/**
 * 活动互斥矩阵
 * 
 * 使用方式: CONFLICT_MATRIX[templateCode1][templateCode2]
 */
export const CONFLICT_MATRIX: Record<string, Record<string, ConflictRule>> = {
  // 拼团 (GROUP_BUY)
  GROUP_BUY: {
    GROUP_BUY: {
      type: ConflictType.EXCLUSIVE,
      reason: '同一商品不能创建多个拼团活动',
    },
    COURSE_GROUP_BUY: {
      type: ConflictType.EXCLUSIVE,
      reason: '拼团和拼课是互斥的玩法，用户体验会混乱',
    },
    SECKILL: {
      type: ConflictType.EXCLUSIVE,
      reason: '秒杀和拼团的价格策略冲突',
    },
    MEMBER_UPGRADE: {
      type: ConflictType.STACKABLE,
      reason: '拼团可以叠加会员升级优惠',
    },
    FULL_REDUCTION: {
      type: ConflictType.STACKABLE,
      reason: '拼团可以叠加满减活动',
    },
  },

  // 拼课 (COURSE_GROUP_BUY)
  COURSE_GROUP_BUY: {
    GROUP_BUY: {
      type: ConflictType.EXCLUSIVE,
      reason: '拼课和拼团是互斥的玩法',
    },
    COURSE_GROUP_BUY: {
      type: ConflictType.EXCLUSIVE,
      reason: '同一商品不能创建多个拼课活动',
    },
    SECKILL: {
      type: ConflictType.EXCLUSIVE,
      reason: '秒杀和拼课的价格策略冲突',
    },
    MEMBER_UPGRADE: {
      type: ConflictType.STACKABLE,
      reason: '拼课可以叠加会员升级优惠',
    },
  },

  // 秒杀 (SECKILL)
  SECKILL: {
    GROUP_BUY: {
      type: ConflictType.EXCLUSIVE,
      reason: '秒杀和拼团是互斥的玩法',
    },
    COURSE_GROUP_BUY: {
      type: ConflictType.EXCLUSIVE,
      reason: '秒杀和拼课是互斥的玩法',
    },
    SECKILL: {
      type: ConflictType.EXCLUSIVE,
      reason: '同一商品不能创建多个秒杀活动',
    },
    MEMBER_UPGRADE: {
      type: ConflictType.PRIORITY,
      priority: 1,  // 秒杀优先级更高
      reason: '秒杀价格优先于会员升级',
    },
  },

  // 会员升级 (MEMBER_UPGRADE)
  MEMBER_UPGRADE: {
    GROUP_BUY: {
      type: ConflictType.STACKABLE,
      reason: '会员升级可以叠加拼团',
    },
    COURSE_GROUP_BUY: {
      type: ConflictType.STACKABLE,
      reason: '会员升级可以叠加拼课',
    },
    SECKILL: {
      type: ConflictType.PRIORITY,
      priority: 2,  // 会员升级优先级较低
      reason: '秒杀价格优先于会员升级',
    },
    MEMBER_UPGRADE: {
      type: ConflictType.EXCLUSIVE,
      reason: '同一商品不能创建多个会员升级活动',
    },
  },

  // 满减 (FULL_REDUCTION)
  FULL_REDUCTION: {
    GROUP_BUY: {
      type: ConflictType.STACKABLE,
      reason: '满减可以叠加拼团',
    },
    COURSE_GROUP_BUY: {
      type: ConflictType.STACKABLE,
      reason: '满减可以叠加拼课',
    },
    SECKILL: {
      type: ConflictType.STACKABLE,
      reason: '满减可以叠加秒杀（但秒杀价格优先）',
    },
    MEMBER_UPGRADE: {
      type: ConflictType.STACKABLE,
      reason: '满减可以叠加会员升级',
    },
    FULL_REDUCTION: {
      type: ConflictType.STACKABLE,
      reason: '可以创建多个满减活动（不同门槛）',
    },
  },
}

/**
 * 检查两个活动是否冲突
 */
export function checkConflict(
  templateCode1: string,
  templateCode2: string,
): { conflict: boolean; rule?: ConflictRule } {
  const rule = CONFLICT_MATRIX[templateCode1]?.[templateCode2]

  if (!rule) {
    // 如果矩阵中没有定义，默认允许（向后兼容）
    return { conflict: false }
  }

  return {
    conflict: rule.type === ConflictType.EXCLUSIVE,
    rule,
  }
}

/**
 * 获取活动的优先级
 */
export function getActivityPriority(templateCode: string): number {
  const priorities: Record<string, number> = {
    SECKILL: 1,           // 秒杀优先级最高
    GROUP_BUY: 2,         // 拼团次之
    COURSE_GROUP_BUY: 3,  // 拼课
    MEMBER_UPGRADE: 4,    // 会员升级
    FULL_REDUCTION: 5,    // 满减优先级最低
  }

  return priorities[templateCode] || 999
}
