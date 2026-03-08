---
name: miniapp-p2c
description: Generate miniapp logic from PRD. Use when injecting logic from requirements into existing miniapp UI.
---

# Miniapp P2C（需求到逻辑）

根据 PRD 生成逻辑代码时，先将 PRD 结构化，再分步注入到已有 UI 代码中。

## 结构化 PRD 格式

- `StructuredPRD`：title、background、objectives、detail、nonFunctional、acceptanceCriteria
- `PRDModule`：moduleName、scenarios
- `PRDScenario`：scene、demoImages、description、apis、stores

## 注入策略

1. 解析 PRD 为结构化格式
2. 识别涉及的 API、Store、页面
3. 分步注入：先 API 调用，再 Store 状态，最后交互逻辑

## 注入顺序

1. **API**：在 `src/service/api/` 或对应模块添加接口调用
2. **Store**：在 Pinia store 中补充状态、actions
3. **页面**：在页面中绑定 Store、调用 API、处理加载/错误/空态
4. **类型**：从 `@libs/common-types` 引用 API 类型，禁止手写
