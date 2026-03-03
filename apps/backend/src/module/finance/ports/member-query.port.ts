/**
 * 会员查询端口
 *
 * @description
 * Finance 模块通过此端口获取会员数据，解耦对 UMS 模块的直接依赖。
 * 遵循依赖倒置原则：Finance 定义接口，UMS/Client 模块提供实现。
 *
 * @architecture A-T2: Commission 消除对 umsMember 表的直接访问
 */

/**
 * 会员信息（佣金计算所需）
 */
export interface MemberForCommission {
  memberId: string;
  tenantId: string;
  parentId: string | null;
  indirectParentId: string | null;
  levelId: number;
}

/**
 * 会员简要信息（受益人校验所需）
 */
export interface MemberBrief {
  memberId: string;
  tenantId: string;
  levelId: number;
  parentId: string | null;
  nickname?: string;
}

/**
 * 会员查询端口接口
 */
export abstract class MemberQueryPort {
  /**
   * 根据会员ID获取会员信息（含推荐关系）
   *
   * @param memberId - 会员ID
   * @returns 会员信息，不存在返回 null
   */
  abstract findMemberForCommission(memberId: string): Promise<MemberForCommission | null>;

  /**
   * 获取会员简要信息（用于受益人校验）
   *
   * @param memberId - 会员ID
   * @returns 会员简要信息，不存在返回 null
   */
  abstract findMemberBrief(memberId: string): Promise<MemberBrief | null>;

  /**
   * 批量获取会员简要信息
   *
   * @param memberIds - 会员ID列表
   * @returns 会员信息Map
   */
  abstract findMembersBrief(memberIds: string[]): Promise<Map<string, MemberBrief>>;

  /**
   * 检查循环推荐关系
   *
   * @param memberId - 当前会员ID
   * @param parentId - 待绑定的上级ID
   * @param maxDepth - 最大检查深度，默认10
   * @returns 是否存在循环
   */
  abstract checkCircularReferral(
    memberId: string,
    parentId: string,
    maxDepth?: number,
  ): Promise<boolean>;
}
