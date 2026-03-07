---
name: solution-exploration
description: Before implementation, list 2–3 alternatives with pros/cons. Use when data volume, cache (avalanche/penetration/breakdown), concurrency, consistency, or API design is involved.
---

# 方案探索

实现前先思考 2–3 种方案，再选型。输出：方案列表 → 优缺点 → 适用条件 → 选择依据。

## 典型场景参考

| 场景             | 典型方案                         | 简要说明                     |
| ---------------- | -------------------------------- | ---------------------------- |
| 数据量大、需搜索 | 直接 DB vs ES                    | DB 简单；ES 全文/聚合强      |
| Redis 雪崩       | 过期随机化、多级缓存、限流       | 随机化易实现；多级降 DB 压力 |
| Redis 穿透       | 空值缓存、布隆过滤器、接口校验   | 空值简单；布隆省内存         |
| Redis 击穿       | 互斥锁、逻辑过期                 | 互斥强一致；逻辑过期高并发   |
| 并发控制         | 乐观锁 vs 悲观锁 vs 分布式锁     | 选型看冲突频率、跨进程       |
| 数据一致性       | 同步 vs 异步、最终一致 vs 强一致 | 选型看业务容忍度             |

## 命令

使用 `/design-alternatives` 列出多方案及优劣。
