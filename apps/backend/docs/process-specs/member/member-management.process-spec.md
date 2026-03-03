# 会员管理 Process Spec (Lite)

## 0. Meta

| 项目 | 值                                                                   |
| ---- | -------------------------------------------------------------------- |
| 模块 | admin/member                                                         |
| 级别 | Lite                                                                 |
| 服务 | MemberService, MemberReferralService, MemberStatsService             |
| 来源 | `apps/backend/docs/requirements/admin/member/member-requirements.md` |

## 2. Input

### MemberService.list

| Rule ID        | 字段     | 校验                   |
| -------------- | -------- | ---------------------- |
| R-IN-MEMBER-01 | nickname | 可选，string，模糊匹配 |
| R-IN-MEMBER-02 | mobile   | 可选，string，模糊匹配 |

### MemberService.updateLevel

| Rule ID        | 字段     | 校验                 |
| -------------- | -------- | -------------------- |
| R-IN-MEMBER-03 | memberId | 必填，string         |
| R-IN-MEMBER-04 | levelId  | 必填，number (0/1/2) |

### MemberService.updateParent

| Rule ID        | 字段       | 校验         |
| -------------- | ---------- | ------------ |
| R-IN-MEMBER-05 | memberId   | 必填，string |
| R-IN-MEMBER-06 | referrerId | 必填，string |

### MemberService.updateTenant

| Rule ID        | 字段     | 校验         |
| -------------- | -------- | ------------ |
| R-IN-MEMBER-07 | memberId | 必填，string |
| R-IN-MEMBER-08 | tenantId | 必填，string |

### MemberService.updateStatus

| Rule ID        | 字段     | 校验                   |
| -------------- | -------- | ---------------------- |
| R-IN-MEMBER-09 | memberId | 必填，string           |
| R-IN-MEMBER-10 | status   | 必填，string ('0'/'1') |

### MemberService.adjustMemberPoints

| Rule ID        | 字段     | 校验                |
| -------------- | -------- | ------------------- |
| R-IN-MEMBER-11 | memberId | 必填，string        |
| R-IN-MEMBER-12 | amount   | 必填，int，不能为 0 |
| R-IN-MEMBER-13 | remark   | 可选，string        |

## 3. PreConditions

| Rule ID         | 方法         | 条件             | 异常                 |
| --------------- | ------------ | ---------------- | -------------------- |
| R-PRE-MEMBER-01 | updateLevel  | 会员必须存在     | 会员不存在           |
| R-PRE-MEMBER-02 | updateParent | 推荐人必须存在   | 推荐人不存在         |
| R-PRE-MEMBER-03 | updateParent | 不能自引用       | 不可将自己设为推荐人 |
| R-PRE-MEMBER-04 | updateParent | 推荐人等级 >= C1 | 推荐人必须是 C1/C2   |
| R-PRE-MEMBER-05 | updateTenant | 目标租户必须存在 | 目标租户不存在       |
| R-PRE-MEMBER-06 | adjustPoints | amount !== 0     | 变动积分不能为 0     |

## 10. TestMapping

| Rule ID            | 测试用例                                                                            |
| ------------------ | ----------------------------------------------------------------------------------- |
| R-FLOW-LIST-01     | Given 有会员数据, When list, Then 返回分页结果含推荐人和统计数据                    |
| R-FLOW-LIST-02     | Given 空列表, When list, Then 返回空分页                                            |
| R-FLOW-LIST-03     | Given 非超管租户, When list, Then 仅返回本租户数据                                  |
| R-FLOW-LEVEL-01    | Given 会员存在, When updateLevel to C2, Then 重置推荐关系                           |
| R-FLOW-LEVEL-02    | Given 会员存在且有跨店推荐, When updateLevel to C1, Then 重置推荐关系               |
| R-FLOW-LEVEL-03    | Given 会员存在且同店推荐, When updateLevel to C1, Then 保持推荐关系                 |
| R-FLOW-LEVEL-04    | Given 会员存在, When updateLevel 降级, Then 不处理推荐关系                          |
| R-PRE-MEMBER-01    | Given 会员不存在, When updateLevel, Then 抛出会员不存在                             |
| R-FLOW-PARENT-01   | Given 合法推荐人(C1), When updateParent, Then 更新推荐关系含间接推荐人              |
| R-FLOW-PARENT-02   | Given 合法推荐人(C2), When updateParent, Then 更新推荐关系无间接推荐人              |
| R-PRE-MEMBER-03    | Given memberId=referrerId, When updateParent, Then 抛出不可自引用                   |
| R-PRE-MEMBER-02    | Given 推荐人不存在, When updateParent, Then 抛出推荐人不存在                        |
| R-PRE-MEMBER-04    | Given 推荐人为普通会员, When updateParent, Then 抛出推荐人等级不足                  |
| R-FLOW-TENANT-01   | Given 租户存在, When updateTenant, Then 更新成功                                    |
| R-PRE-MEMBER-05    | Given 租户不存在, When updateTenant, Then 抛出目标租户不存在                        |
| R-FLOW-STATUS-01   | Given status='0', When updateStatus, Then 设为 NORMAL                               |
| R-FLOW-STATUS-02   | Given status='1', When updateStatus, Then 设为 DISABLED                             |
| R-FLOW-POINTS-01   | Given amount>0, When adjustMemberPoints, Then 调用 addPoints                        |
| R-FLOW-POINTS-02   | Given amount<0, When adjustMemberPoints, Then 调用 deductPoints                     |
| R-PRE-MEMBER-06    | Given amount=0, When adjustMemberPoints, Then 抛出变动积分不能为 0                  |
| R-FLOW-HISTORY-01  | Given memberId, When getPointHistory, Then 返回分页积分记录                         |
| R-FLOW-REFERRAL-01 | Given 会员列表, When getBatchReferralInfo, Then 返回 parentMap 和 indirectParentMap |
| R-FLOW-REFERRAL-02 | Given 空列表, When getBatchReferralInfo, Then 返回空 Map                            |
| R-FLOW-STATS-01    | Given memberIds, When getBatchStats, Then 返回消费和佣金 Map                        |
| R-FLOW-STATS-02    | Given 空 memberIds, When getBatchStats, Then 返回空 Map                             |
| R-FLOW-EXPORT-01   | Given 有会员数据, When export, Then 调用 exportService 导出                         |
| R-FLOW-EXPORT-02   | Given 空数据, When export, Then 传入空数组                                          |
