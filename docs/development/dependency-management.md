# 依赖管理规范

本文档说明 Monorepo 项目的依赖管理策略和最佳实践。

---

## 📋 目录

- [核心原则](#核心原则)
- [Catalog 机制](#catalog-机制)
- [依赖分类](#依赖分类)
- [版本策略](#版本策略)
- [常见问题](#常见问题)
- [维护流程](#维护流程)

---

## 🎯 核心原则

### 1. 统一版本管理

所有子项目共享的依赖必须使用 `catalog:` 引用，确保版本一致性。

```json
// ✅ 正确 - 使用 catalog
{
  "dependencies": {
    "dayjs": "catalog:",
    "lodash": "catalog:"
  }
}

// ❌ 错误 - 硬编码版本
{
  "dependencies": {
    "dayjs": "^1.11.19",
    "lodash": "^4.17.21"
  }
}
```

### 2. 避免幻影依赖

所有直接使用的依赖必须在 `package.json` 中显式声明。

```typescript
// ❌ 错误 - 幻影依赖
import { format } from 'date-fns'; // date-fns 未在 package.json 中声明

// ✅ 正确 - 显式声明
// package.json 中有 "date-fns": "catalog:"
import { format } from 'date-fns';
```

### 3. 最小化依赖

只安装真正需要的依赖，定期清理未使用的包。

---

## 📦 Catalog 机制

### 什么是 Catalog

Catalog 是 pnpm 的依赖版本管理功能，允许在 `pnpm-workspace.yaml` 中集中定义版本，子项目通过 `catalog:` 引用。

### 配置位置

```yaml
# pnpm-workspace.yaml
catalog:
  typescript: '5.8.3'
  dayjs: '1.11.19'
  lodash: '4.17.21'
```

### 使用方式

```json
// apps/backend/package.json
{
  "dependencies": {
    "dayjs": "catalog:",
    "lodash": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

### 优势

1. **版本一致性**: 所有子项目使用相同版本
2. **集中管理**: 升级时只需修改一处
3. **避免冲突**: 消除版本漂移问题
4. **清晰可见**: 一眼看出哪些是共享依赖

---

## 🗂️ 依赖分类

### 1. 运行时共享库

所有子项目运行时都可能使用的库。

| 依赖      | 版本    | 用途         |
| --------- | ------- | ------------ |
| dayjs     | 1.11.19 | 日期时间处理 |
| axios     | 1.12.2  | HTTP 客户端  |
| lodash    | 4.17.21 | 工具函数库   |
| crypto-js | 4.2.0   | 加密库       |
| uuid      | 9.0.1   | UUID 生成    |

### 2. Vue 生态（前端专用）

| 依赖       | 版本   | 用途     |
| ---------- | ------ | -------- |
| vue        | 3.5.24 | Vue 框架 |
| vue-router | 4.6.3  | 路由     |
| pinia      | 3.0.4  | 状态管理 |
| vue-i18n   | 9.14.2 | 国际化   |

### 3. NestJS 生态（后端专用）

| 依赖                     | 版本    | 用途           |
| ------------------------ | ------- | -------------- |
| @nestjs/common           | 10.4.15 | NestJS 核心    |
| @nestjs/core             | 10.4.15 | NestJS 核心    |
| @nestjs/platform-express | 10.4.15 | Express 适配器 |
| @nestjs/config           | 3.1.1   | 配置管理       |
| @nestjs/jwt              | 10.2.0  | JWT 认证       |

### 4. 开发工具

| 依赖       | 版本   | 用途              |
| ---------- | ------ | ----------------- |
| typescript | 5.8.3  | TypeScript 编译器 |
| eslint     | 9.39.1 | 代码检查          |
| prettier   | 3.3.3  | 代码格式化        |
| vitest     | 2.1.9  | 测试框架          |

### 5. 构建与部署

| 依赖      | 版本   | 用途           |
| --------- | ------ | -------------- |
| chalk     | 4.1.2  | 终端颜色       |
| ora       | 5.4.1  | 终端加载动画   |
| ssh2      | 1.17.0 | SSH 连接       |
| cross-env | 7.0.3  | 跨平台环境变量 |

---

## 📌 版本策略

### 1. 语义化版本

遵循 [Semantic Versioning](https://semver.org/)：

- **主版本号 (Major)**: 不兼容的 API 变更
- **次版本号 (Minor)**: 向后兼容的功能新增
- **修订号 (Patch)**: 向后兼容的问题修正

### 2. 版本范围

| 符号 | 含义     | 示例     | 说明           |
| ---- | -------- | -------- | -------------- |
| 无   | 精确版本 | `1.2.3`  | 只安装 1.2.3   |
| `^`  | 兼容版本 | `^1.2.3` | >=1.2.3 <2.0.0 |
| `~`  | 近似版本 | `~1.2.3` | >=1.2.3 <1.3.0 |
| `*`  | 任意版本 | `*`      | 最新版本       |

### 3. Catalog 版本规则

Catalog 中的版本建议：

- **核心依赖**: 使用精确版本（如 `5.8.3`）
- **工具库**: 使用兼容版本（如 `^4.17.21`）
- **开发工具**: 使用精确版本（如 `9.39.1`）

```yaml
catalog:
  # 精确版本 - 核心依赖
  typescript: '5.8.3'
  vue: '3.5.24'

  # 兼容版本 - 工具库
  lodash: '4.17.21' # 实际会安装 ^4.17.21
  dayjs: '1.11.19' # 实际会安装 ^1.11.19
```

---

## 🔍 常见问题

### Q1: 如何添加新的共享依赖？

1. 在 `pnpm-workspace.yaml` 的 `catalog` 中添加
2. 在需要的子项目中使用 `catalog:` 引用
3. 运行 `pnpm install`

```yaml
# pnpm-workspace.yaml
catalog:
  new-package: '1.0.0'
```

```json
// apps/backend/package.json
{
  "dependencies": {
    "new-package": "catalog:"
  }
}
```

### Q2: 如何升级共享依赖？

1. 修改 `pnpm-workspace.yaml` 中的版本
2. 运行 `pnpm install`
3. 测试所有受影响的子项目

```yaml
# 升级前
catalog:
  dayjs: '1.11.19'

# 升级后
catalog:
  dayjs: '1.11.20'
```

### Q3: 某个子项目需要特定版本怎么办？

如果确实需要，可以在子项目中硬编码版本，但需要：

1. 在 PR 中说明原因
2. 添加注释解释为什么不用 catalog
3. 定期评估是否可以统一

```json
{
  "dependencies": {
    // 特殊原因需要旧版本
    "old-package": "^1.0.0" // 注释：因为 XXX 功能需要
  }
}
```

### Q4: 如何检查版本冲突？

```bash
# 查看所有依赖的版本
pnpm list --depth=0

# 查看特定包的版本
pnpm list dayjs

# 查看为什么安装了某个版本
pnpm why dayjs
```

### Q5: 幻影依赖如何检测？

```bash
# 使用 pnpm 的严格模式
pnpm install --strict-peer-dependencies

# 或者在 .npmrc 中配置
echo "strict-peer-dependencies=true" >> .npmrc
```

---

## 🔄 维护流程

### 每月例行检查

1. **检查过时依赖**

```bash
# 查看可更新的依赖
pnpm outdated

# 或使用 npm-check-updates
npx npm-check-updates
```

2. **更新依赖**

```bash
# 更新所有 patch 版本
pnpm update

# 更新特定包
pnpm update dayjs

# 更新到最新版本（谨慎）
pnpm update --latest
```

3. **测试验证**

```bash
# 运行所有测试
pnpm -r test

# 运行 lint
pnpm -r lint

# 类型检查
pnpm -r typecheck
```

### 重大版本升级流程

1. **创建升级分支**

```bash
git checkout -b upgrade/typescript-5.9
```

2. **更新 catalog**

```yaml
catalog:
  typescript: '5.9.0' # 从 5.8.3 升级
```

3. **安装依赖**

```bash
pnpm install
```

4. **修复破坏性变更**

- 查看 CHANGELOG
- 修复编译错误
- 更新代码适配新 API

5. **全面测试**

```bash
# 后端测试
cd apps/backend && pnpm test

# 前端测试
cd apps/admin-web && pnpm test

# E2E 测试
cd apps/admin-web && pnpm test:e2e
```

6. **创建 PR**

- 说明升级原因
- 列出破坏性变更
- 附上测试结果

---

## 📊 依赖健康度检查清单

### 每周检查

- [ ] 无幻影依赖
- [ ] 无版本冲突
- [ ] 无安全漏洞

```bash
# 安全审计
pnpm audit

# 修复安全问题
pnpm audit --fix
```

### 每月检查

- [ ] 依赖版本不超过 3 个月
- [ ] 无废弃的包
- [ ] 无未使用的依赖

```bash
# 检查未使用的依赖
npx depcheck
```

### 每季度检查

- [ ] 主要依赖升级到最新稳定版
- [ ] 清理技术债
- [ ] 更新文档

---

## 🛠️ 工具推荐

### 1. npm-check-updates

检查和更新依赖版本。

```bash
# 安装
npm install -g npm-check-updates

# 检查可更新的依赖
ncu

# 更新 package.json
ncu -u

# 安装新版本
pnpm install
```

### 2. depcheck

检测未使用的依赖。

```bash
# 安装
npm install -g depcheck

# 检查
depcheck

# 检查特定目录
depcheck apps/backend
```

### 3. pnpm audit

安全审计。

```bash
# 审计
pnpm audit

# 查看详情
pnpm audit --json

# 自动修复
pnpm audit --fix
```

---

## 📝 最佳实践

### 1. 添加依赖前

- [ ] 确认是否真的需要
- [ ] 检查包的维护状态
- [ ] 查看包的大小
- [ ] 评估安全性

### 2. 选择依赖时

- [ ] 优先选择活跃维护的包
- [ ] 查看 GitHub stars 和 issues
- [ ] 检查最后更新时间
- [ ] 阅读文档和示例

### 3. 使用依赖时

- [ ] 只导入需要的部分
- [ ] 使用 tree-shaking
- [ ] 考虑按需加载
- [ ] 避免重复依赖

### 4. 维护依赖时

- [ ] 定期更新
- [ ] 关注安全公告
- [ ] 测试升级影响
- [ ] 记录变更原因

---

## 🔗 相关资源

- [pnpm Catalogs 文档](https://pnpm.io/catalogs)
- [Semantic Versioning](https://semver.org/)
- [npm-check-updates](https://github.com/raineorshine/npm-check-updates)
- [depcheck](https://github.com/depcheck/depcheck)

---

## 📈 依赖统计

### 当前状态

| 指标           | 数值 |
| -------------- | ---- |
| Catalog 依赖数 | 40+  |
| 后端依赖数     | 60+  |
| 前端依赖数     | 50+  |
| 小程序依赖数   | 40+  |
| 共享依赖占比   | ~30% |

### 目标

- 共享依赖占比 > 40%
- 无版本冲突
- 无安全漏洞
- 依赖更新周期 < 3 个月

---

**最后更新**: 2026-02-23  
**维护者**: @linlingqin77
