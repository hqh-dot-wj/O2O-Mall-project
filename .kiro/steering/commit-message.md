---
inclusion: auto
---

# Commit Message 规范

当用户请求生成或编写 commit message 时，**必须**遵循本项目的 Conventional Commits 规范。

## 格式

```
<type>(<scope>): <description>
```

- **type**：必填，从下表选择
- **scope**：选填，常用：`backend`、`admin-web`、`miniapp-client`、`libs`、`common-types`
- **description**：必填，简短描述（**须使用中文**）

## Type 类型

| type     | 说明                   |
| -------- | ---------------------- |
| feat     | 新功能                 |
| feat-wip | 开发中的功能（未完成） |
| fix      | 修复 Bug               |
| docs     | 仅文档更新             |
| typo     | 拼写/勘误              |
| style    | 代码风格（不影响逻辑） |
| refactor | 重构                   |
| perf     | 性能优化               |
| optimize | 代码质量优化           |
| test     | 测试相关               |
| build    | 构建系统/外部依赖      |
| ci       | CI 配置与脚本          |
| chore    | 其他杂项               |
| revert   | 回滚先前提交           |

## 示例

```
feat(backend): 新增订单导出接口
fix(admin-web): 修复表格分页在 Safari 下的展示异常
docs(backend): 精简 docs 目录结构
chore(projects): 升级 TypeScript 至 5.6
refactor(backend): 抽离营销模块公共类型
```

## 破坏性变更

在 description 前加 `!`，或在 body 中写 `BREAKING CHANGE:`：

```
feat(api)!: 移除 v1 接口，统一使用 v2
```
