---
name: backend-third-party
description: 第三方 API 对接（Adapter/Port 模式、韧性设计）。Use when integrating external APIs, payment gateways, or webhooks in backend.
---

# 第三方 API 对接规范

核心：**Adapter/Port 模式** + **韧性设计** + **HttpModule 统一**。

## Adapter/Port 模式

```
业务 Service → Port (abstract) ← Adapter (具体实现) ← HttpService
```

- Port：abstract class，定义我方契约
- Adapter：实现 Port，封装第三方调用
- 业务只注入 Port，不依赖具体 Adapter

## 韧性设计

| 机制 | 实现                                   |
| ---- | -------------------------------------- |
| 超时 | HttpModule.register({ timeout: 5000 }) |
| 重试 | 指数退避，仅幂等接口                   |
| 熔断 | 下游异常比例高时熔断                   |
| 降级 | 默认值、缓存、简化逻辑                 |

## 强制

- 禁止直接 axios/fetch；统一 HttpModule + HttpService
- 先查阅官方文档；优先评估官方 SDK
- Port 出入参严格类型；Adapter 内部可宽松，转换时显式映射
