---
name: solution-exploration
description: >
  List 2–3 technical alternatives with pros/cons before implementation.
  Trigger: user asks for technical options, design alternatives; decisions
  involving data volume, cache (avalanche/penetration/breakdown),
  concurrency, consistency, or API design.
---

# 方案探索

实现前先思考 2–3 种方案，再选型。输出：方案列表 → 优缺点 → 适用条件 → 选择依据。使用 `/design-alternatives` 可列出多方案。

## Instructions

1. **识别决策点**：数据量、缓存策略、并发、一致性、接口设计等。
2. **列出 2–3 方案**：每方案用 1–2 句概括；避免只列一种。
3. **优缺点**：每方案列出 2–3 条 pros、2–3 条 cons。
4. **适用条件**：什么场景适合 A，什么适合 B。
5. **选择依据**：结合当前约束（相态、团队能力、时间）给出建议。

## 典型场景参考

| 场景           | 典型方案                         | 选型要点            |
| -------------- | -------------------------------- | ------------------- |
| 数据量大、搜索 | DB vs ES                         | 简单 vs 全文/聚合   |
| Redis 雪崩     | 过期随机化 vs 多级缓存 vs 限流   | 实现成本 vs DB 压力 |
| Redis 穿透     | 空值缓存 vs 布隆 vs 接口校验     | 内存 vs 准确度      |
| Redis 击穿     | 互斥锁 vs 逻辑过期               | 强一致 vs 高并发    |
| 并发控制       | 乐观锁 vs 悲观锁 vs 分布式锁     | 冲突频率、跨进程    |
| 数据一致性     | 同步 vs 异步、强一致 vs 最终一致 | 业务容忍度          |

## Example

**场景**：订单列表分页，单表 500 万行，QPS 100。

| 方案     | 优点           | 缺点           | 适用条件     |
| -------- | -------------- | -------------- | ------------ |
| offset   | 实现简单       | offset>5000 慢 | 数据 <10 万  |
| 游标分页 | 稳定性能       | 无法跳页       | 列表无限滚动 |
| ES       | 全文检索、聚合 | 运维成本       | 需搜索/统计  |

**选择依据**：当前 QPS 100、列表为主，选游标分页；若后续需关键词搜索，再引入 ES。

## Validation

- [ ] 至少列出 2 种方案
- [ ] 每方案有优缺点
- [ ] 选择依据与约束（相态、时间、能力）对齐
