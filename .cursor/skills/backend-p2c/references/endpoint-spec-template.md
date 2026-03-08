# EndpointSpec 字段说明

Backend P2C 生成时使用。核心指令见 `SKILL.md`。

## BackendStructuredPRD 结构

- `title`：功能标题
- `background`：背景（可选）
- `modules`：`EndpointSpec[]`

## EndpointSpec 字段

| 字段        | 类型           | 说明                                             |
| ----------- | -------------- | ------------------------------------------------ |
| method      | string         | GET / POST / PUT / DELETE / PATCH                |
| path        | string         | 接口路径，如 `/client/address/:id`               |
| summary     | string         | 接口摘要，用于 @ApiOperation                     |
| tenantType  | enum           | TenantScoped / PlatformOnly / TenantAgnostic     |
| caller      | enum           | admin / client / internal                        |
| sloCategory | enum           | payment / core-trade / list-query / admin-config |
| request     | object         | 请求体 / path / query 结构                       |
| response    | type           | 响应类型                                         |
| scenarios   | ScenarioSpec[] | 成功/分支场景                                    |
| errorCases  | string[]       | 显式穷举的错误场景                               |

## tenantType 约定

- **TenantScoped**：数据按租户隔离，Repository 自动过滤；租户来自 header 或登录态
- **PlatformOnly**：不按租户，仅平台/超管可调，须 `RequirePermission`
- **TenantAgnostic**：租户由参数决定，如位置解析租户

## caller 约定

- **admin**：后台管理端
- **client**：小程序 C 端
- **internal**：内部服务调用

## sloCategory 约定

| 类别         | P99 延迟 | 示例           |
| ------------ | -------- | -------------- |
| payment      | ≤ 200ms  | 支付回调、提现 |
| core-trade   | ≤ 500ms  | 下单、库存扣减 |
| list-query   | ≤ 1000ms | 商品/订单列表  |
| admin-config | ≤ 2000ms | 报表、配置     |

## ScenarioSpec 与 Rule ID

- `given`：前置条件
- `when`：触发动作
- `then`：预期结果
- `ruleId`：规则 ID，格式 `R-{CATEGORY}-{DOMAIN}-{SEQ}`

### Category 前缀

| 前缀     | 含义     |
| -------- | -------- |
| R-IN     | 输入校验 |
| R-PRE    | 前置条件 |
| R-FLOW   | 主干流程 |
| R-BRANCH | 分支规则 |
| R-STATE  | 状态机   |
| R-CONCUR | 并发/锁  |

## errorCases 要求

必须显式穷举：参数非法、权限不足、状态不允许、资源不存在等。每条对应 Controller/Service 中的异常处理。
