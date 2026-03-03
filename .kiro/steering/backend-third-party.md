---
inclusion: fileMatch
fileMatchPattern: '{apps/backend/**/adapters/**/*.ts,apps/backend/**/ports/**/*.ts,apps/backend/**/*adapter*.ts,apps/backend/**/*port*.ts}'
---

# 第三方 API 对接规范

> 核心思想：**Adapter/Port 模式** + **韧性设计** + **务实类型安全** + **正确 DI Mock**。

## 1. 对接前置（强制）

- 先查阅官方文档，确认接口地址、签名方式、错误码、频率限制
- 优先评估官方 SDK；将文档链接记录在 Adapter 文件头部 `@see`

## 2. Adapter/Port 模式（强制）

```
业务 Service → Port (abstract) ← Adapter (具体实现) ← HttpService
```

业务 Service 只注入 Port，不依赖具体 Adapter。

## 3. 务实类型安全

| 层级                | 策略                                                |
| ------------------- | --------------------------------------------------- |
| Port 出入参         | 严格类型（我方契约）                                |
| Adapter 内部        | 宽松类型，只取用到的字段 + `[key: string]: unknown` |
| Adapter → Port 转换 | 显式映射，隔离第三方变化                            |

## 4. HTTP 客户端（强制 HttpModule）

禁止直接 `axios`/`fetch`/`got`。统一 `HttpModule.register({ timeout: 5000 })` + `HttpService`。

## 5. 韧性设计

| 机制 | 实现                                     |
| ---- | ---------------------------------------- |
| 超时 | `HttpModule.register({ timeout: 5000 })` |
| 重试 | RxJS `retry` + 指数退避（仅幂等读操作）  |
| 熔断 | 简易计数器 / `opossum`                   |
| 降级 | 返回缓存/默认值，不阻塞主流程            |

## 6. Webhook 回调

签名验证 → 幂等（Redis SetNX 去重）→ 异步（Controller 只验签+入队）→ 5 秒内返回。

## 7. 测试 Mock

mock 依赖（Port/HttpService），不是 mock Service 本身。

## 8. 配置

`ConfigService` + `.env` 管理；`onModuleInit` 校验必填项；`.env.example` 包含所有第三方配置项。
