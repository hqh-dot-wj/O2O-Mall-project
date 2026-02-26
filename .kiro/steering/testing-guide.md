---
inclusion: manual
---

# 测试最佳实践指南

> 手动引用: `#testing-guide`。编写测试时使用。

本文档整合项目测试规范和 Anthony Fu 的测试 Skills。

## 官方测试最佳实践（Anthony Fu Skills）

### Vitest 单元测试

- 测试组织和命名
- Mock 策略
- 快照测试
- 覆盖率配置

### Vue 组件测试

- 组件挂载和渲染
- 用户交互模拟
- 异步测试
- Composables 测试

---

**注意**: 需要先安装：

```bash
pnpx skills add antfu/skills --skill='vitest,vue-testing-best-practices'
```

## 项目测试规范

详细的测试规范请参考 `testing.md`：

- 单元测试: Vitest + @vue/test-utils
- E2E 测试: Playwright
- 测试文件位置: `src/**/*.spec.{ts,tsx,vue}`, `e2e/*.spec.ts`

### 何时可以直接编写测试

- 工具函数测试（无全局依赖）
- 简单组件测试（无复杂 mock）
- 冒烟 E2E 测试

### 何时需要先询问

- 复杂 mock（路由、Pinia、Naive UI）
- 强依赖环境的 E2E（登录态、权限）
- 大范围/长流程 E2E
- 性能/快照类测试
