---
inclusion: fileMatch
fileMatchPattern: '{**/*.spec.ts,**/*.spec.tsx,**/*.spec.vue,**/*.test.ts,**/*.test.tsx,**/*.test.vue,**/*.e2e-spec.ts,**/test/**/*.ts,**/e2e/**/*.ts}'
---

# 测试最佳实践指南

> 手动引用: `#testing-guide`

详细测试规范已整合到 `testing.md` 中（`#testing` 引用）。

## 快速参考

- 单元测试: Vitest + @vue/test-utils
- E2E 测试: Playwright
- 测试文件: `*.spec.{ts,tsx,vue}`（与源文件同目录）
- 覆盖: Happy Path + Edge Cases + Error Cases
- 测试文件顶部: `// @ts-nocheck`

### 何时可以直接编写测试

- 工具函数测试（无全局依赖）
- 简单组件测试（无复杂 mock）
- 冒烟 E2E 测试

### 何时需要先询问

- 复杂 mock（路由、Pinia、Naive UI）
- 强依赖环境的 E2E（登录态、权限）
- 大范围/长流程 E2E
- 性能/快照类测试

## Anthony Fu Skills

```bash
pnpx skills add antfu/skills --skill='vitest,vue-testing-best-practices'
```
