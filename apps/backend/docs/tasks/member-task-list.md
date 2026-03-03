# 会员管理模块任务清单

> 来源：`apps/backend/docs/requirements/admin/member/member-requirements.md`
> 架构审查：⚠️ 补充（功能代码已实现，缺少单元测试和 Process Spec）
> 模块相态：成长态

## 架构审查补充点

1. **缺少单元测试**：MemberService、MemberReferralService、MemberStatsService 均无 spec 文件
2. **MemberReferralService 循环推荐检测不完整**：当前仅检查自引用，未检测 A→B→A 循环链
3. **推荐人等级校验**：validateAndGetIndirectParent 要求推荐人 levelId >= 1，需求文档未明确此规则，需确认

---

## 短期任务（P0，1-2 周）

- [x] T-1: 编写 MemberService Process Spec (Lite) 并创建单元测试 — 覆盖 list、updateLevel、updateParent、updateTenant、updateStatus、getPointHistory、adjustMemberPoints (2d) ✅ 2026-03-03
- [x] T-2: 编写 MemberReferralService 单元测试 — 覆盖 getBatchReferralInfo、validateAndGetIndirectParent (1d) ✅ 2026-03-03
- [x] T-3: 编写 MemberStatsService 单元测试 — 覆盖 getBatchStats (0.5d) ✅ 2026-03-03

## 中期任务（P1，1-2 月）

- [x] T-4: 增强循环推荐检测 — 检测 A→B→A 等多级循环链 (1d) ✅ 2026-03-03
- [x] T-5: 添加会员详情查询接口 GET /admin/member/detail (1d) ✅ 2026-03-03
- [x] T-6: 添加会员导出功能 (2d) ✅ 2026-03-03
