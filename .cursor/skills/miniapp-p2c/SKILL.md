---
name: miniapp-p2c
description: >
  Generate miniapp logic from PRD; inject API/Store/interaction into existing UI.
  Trigger: user provides PRD or requirements for miniapp; implementing
  logic in existing pages under apps/miniapp-client.
---

# Miniapp P2C（需求到逻辑）

根据 PRD 生成逻辑代码时，先将 PRD 结构化，再分步注入到已有 UI 代码中。

## Instructions

1. **解析 PRD**：提取 `StructuredPRD`（title、objectives、detail、acceptanceCriteria）、`PRDModule`、`PRDScenario`（scene、apis、stores）。
2. **识别涉及**：API、Store、页面路径。
3. **注入顺序**：API → Store → 页面。先 `src/service/api/` 或模块内添加接口；再 Pinia store 补充状态、actions；最后页面绑定 Store、调用 API、处理加载/错误/空态。
4. **类型**：从 `@libs/common-types` 引用 API 类型，禁止手写。

## 注入顺序

| 步骤 | 位置               | 产物                                 |
| ---- | ------------------ | ------------------------------------ |
| 1    | `src/service/api/` | 接口函数、参数/返回值类型            |
| 2    | Pinia store        | state、actions、getters              |
| 3    | 页面 `.vue`        | 绑定 Store、onLoad 调 API、v-if 空态 |
| 4    | 类型               | 从 common-types 引用                 |

## Example

**PRD 片段**：首页需展示「我的积分」余额，点击跳积分明细。

**输出**：

- API：`fetchPointsBalance(memberId)`，返回 `{ availablePoints, frozenPoints }`
- Store：`usePointsStore` 增加 `balance`、`fetchBalance` action
- 页面：`onLoad` 调用 `fetchBalance`，展示 `store.balance`；空态用 `wd-status-tip`；点击跳转 `pages/points/detail`

## Validation

- [ ] API 类型来自 `@libs/common-types`
- [ ] 页面处理加载中、错误、空态
- [ ] Store 与页面解耦，可复用于其他页面
