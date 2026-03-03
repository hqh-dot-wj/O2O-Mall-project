---
inclusion: fileMatch
fileMatchPattern: '{apps/miniapp-client/**/*.vue,apps/miniapp-client/**/*.ts}'
---

# P2C 需求文档到代码生成规则

当根据 PRD 生成逻辑代码时，遵循以下工作流。
核心理念：**先将 PRD 结构化，再分步注入到已有 UI 代码中**。

## 1. P2C 工作流（三步走）

### 第一步：PRD 结构化

将自然语言 PRD 解析为 StructuredPRD 格式：识别表格为 PRDModule，每行为 PRDScenario，保留 Markdown 格式，识别隐含的 API 调用和状态管理需求，向用户确认。

### 第二步：模块级路由

PRD 包含 3+ 模块或 5000+ 字符时，按模块分片处理，每个模块独立生成。

### 第三步：逻辑代码注入

基于已有 UI 代码，逐模块注入：

1. **API 接口对接**：`src/api/` 下创建或复用，使用 `@libs/common-types` 类型
2. **状态管理**：`src/store/` 下 Pinia store，按业务实体组织
3. **交互逻辑**：条件渲染、跳转、事件处理
4. **异常处理**：网络错误提示+重试、业务错误按 PRD 展示、未登录弹出登录弹窗

## 2. 场景到代码的映射规则

| PRD 中的描述         | 代码实现                                                         |
| -------------------- | ---------------------------------------------------------------- |
| "未登录弹窗"         | 调用 `src/store/auth.ts` → 弹出 `GlobalAuthModal`                |
| "网络异常提示"       | try-catch + `uni.showToast({ title: '提示文案', icon: 'none' })` |
| "点击跳转到 XX 页面" | `uni.navigateTo({ url: '/pages/xx/xx' })`                        |
| "加入购物车"         | 调用 `src/store/cart.ts` 的 `addToCart` action                   |
| "下拉刷新/上拉加载"  | `<z-paging>` + API 分页                                          |
| "倒计时"             | `setInterval` + `onUnmounted` 清理                               |
| "分享"               | `onShareAppMessage` / `onShareTimeline`                          |
| "支付"               | `src/api/payment.ts` → `uni.requestPayment`                      |
| "列表为空"           | `<wd-status-tip>` 空状态组件                                     |

## 3. 质量检查

- [ ] 所有 PRD 场景都有对应代码实现
- [ ] 条件分支完整（登录态、网络异常、空数据、正常态）
- [ ] API 调用使用了正确的接口
- [ ] 错误提示文案与 PRD 一致
- [ ] 类型安全（无 `any`）
- [ ] 页面跳转路径正确（与 `pages.config.ts` 一致）

## 4. 禁止事项

- 禁止跳过 PRD 结构化直接生成代码
- 禁止凭空编造 API 接口名和参数
- 禁止忽略 PRD 中的异常场景
- 禁止硬编码提示文案（PRD 指定文案必须使用原文）
- 禁止在逻辑注入时破坏已有 UI 结构
