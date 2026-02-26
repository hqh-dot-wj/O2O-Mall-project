# Steering 配置变更日志

## [2.0.0] - 2026-02-26

### 🎯 重大变更：Steering 文件重构

为了优化 AI context 消耗，对整个 `.kiro/steering/` 目录进行了重构。

### ✨ 新增

#### 核心文件

- **00-core-principles.md** - 始终加载的核心原则（仅 28 行）
- **README.md** - Steering 文件组织说明

#### Anthony Fu Skills 引用文件

- **vue-ecosystem.md** - Vue 3 + Pinia + VueUse 最佳实践
- **vue-best-practices.md** - Vue 3 + TypeScript 最佳实践
- **vue-router-guide.md** - Vue Router 最佳实践
- **build-tools.md** - Vite + UnoCSS 配置指南
- **testing-guide.md** - Vitest + Vue Testing 最佳实践
- **monorepo-tools.md** - pnpm + Turborepo 工具链指南

#### 文档

- **SKILLS_INSTALLATION.md** - Anthony Fu Skills 安装指南
- **STEERING_REFACTORING_SUMMARY.md** - 重构总结和技术细节
- **QUICK_START.md** - 快速开始指南
- **CHANGELOG.md** - 本文档

### 🔄 变更

#### Inclusion 类型调整

**改为 File Match（自动触发）**:

- `admin-web-frontend.md` - 触发条件: `apps/admin-web/src/**/*.{vue,ts,tsx}`
- `backend-nestjs.md` - 触发条件: `apps/backend/src/**/*.ts`
- `miniapp-client.md` - 触发条件: `apps/miniapp-client/src/**/*.{vue,ts,tsx}`
- `monorepo.md` - 触发条件: `{package.json,turbo.json,pnpm-*}`
- `windows-dev-environment.md` - 触发条件: `{**/*.ps1,scripts/**/*}`

**改为 Manual（手动引用）**:

- `architecture-meta-model.md` - 引用: `#architecture`
- `testing.md` - 引用: `#testing`
- `documentation.md` - 引用: `#doc`
- `documentation-workflow.md` - 引用: `#doc-workflow`
- `prompt-templates.md` - 引用: `#prompts`

### 📊 性能提升

| 指标           | 改造前        | 改造后        | 提升   |
| -------------- | ------------- | ------------- | ------ |
| 新对话 Context | ~8,000 tokens | ~75 tokens    | ⬇️ 99% |
| 编辑 Vue 文件  | ~8,000 tokens | ~3,500 tokens | ⬇️ 56% |
| 编辑后端文件   | ~8,000 tokens | ~1,500 tokens | ⬇️ 81% |
| 编辑配置文件   | ~8,000 tokens | ~2,000 tokens | ⬇️ 75% |

### 🎯 影响范围

#### 对开发者的影响

**无需改变工作流程**:

- 日常开发无需关心 steering 配置
- 编辑文件时会自动加载相关规范
- AI 的回复质量保持不变或更好

**新增功能**:

- 可以使用 `#` 引用特定规范（如 `#testing`、`#architecture`）
- 支持 Anthony Fu 官方 Skills（需要安装）

**性能提升**:

- 新对话启动更快
- AI 响应速度可能提升
- Context 窗口利用更高效

#### 对 AI 的影响

**Always Included（始终加载）**:

- 只有 `00-core-principles.md`（28 行）
- 包含最核心的 5 条原则

**File Match（按需加载）**:

- 编辑前端代码 → 自动加载前端规范
- 编辑后端代码 → 自动加载后端规范
- 编辑配置文件 → 自动加载配置指南

**Manual（手动引用）**:

- 架构设计 → `#architecture`
- 编写测试 → `#testing` 或 `#testing-guide`
- 配置工具 → `#monorepo-tools`
- 编写文档 → `#doc` 或 `#doc-workflow`

### 📝 迁移指南

#### 对于开发者

**无需任何操作**，配置已自动生效。

**可选操作**:

1. 阅读 `.kiro/QUICK_START.md` 了解新功能
2. 安装 Anthony Fu Skills（见 `.kiro/SKILLS_INSTALLATION.md`）
3. 尝试使用 `#` 引用特定规范

#### 对于 AI

**自动适配**，无需手动配置。

**新的工作模式**:

1. 新对话只加载核心原则
2. 根据编辑的文件自动加载相关规范
3. 根据用户的 `#` 引用加载特定指南

### 🔧 技术细节

#### 触发机制

```yaml
# Always Included
00-core-principles.md: 无 frontmatter 或默认

# File Match
admin-web-frontend.md:
  inclusion: fileMatch
  fileMatchPattern: 'apps/admin-web/src/**/*.{vue,ts,tsx}'

# Manual
testing.md:
  inclusion: manual
```

#### Context 计算

```
Always:     28 行 ≈   75 tokens
File Match: 按需加载，单次 1,000-3,000 tokens
Manual:     按需加载，单次 1,000-2,500 tokens
```

### 🐛 已知问题

无

### 🔮 未来计划

1. **短期（1-2 周）**:
   - 收集使用反馈
   - 优化 fileMatchPattern
   - 完善文档

2. **中期（1-2 月）**:
   - 安装 Anthony Fu Skills
   - 创建项目特定的 Skills
   - 优化 context 消耗

3. **长期（3-6 月）**:
   - 定期更新 Skills
   - 根据使用情况调整配置
   - 探索更多优化方案

### 📚 相关资源

- [Steering 文件组织说明](../../.kiro/steering/README.md)
- [Anthony Fu Skills 安装指南](./skills-installation.md)
- [重构总结](./steering-refactoring.md)
- [快速开始指南](./steering-quick-start.md)

### 🙏 致谢

感谢 Anthony Fu 的 Skills 项目提供了优秀的参考实现。

---

## 如何查看变更

### 查看新的文件结构

```bash
ls -la .kiro/steering/
```

### 查看配置说明

```bash
cat .kiro/steering/README.md
```

### 快速开始

```bash
cat .kiro/QUICK_START.md
```

### 验证配置

1. 开启新对话，检查加载的 steering 文件
2. 编辑 `apps/admin-web/src/views/test.vue`，观察触发的文件
3. 输入 `#testing`，验证 Manual 引用

---

## 反馈和问题

如有问题或建议，请：

1. 查看 `.kiro/QUICK_START.md` 的故障排除部分
2. 查看 `.kiro/steering/README.md` 的使用建议
3. 联系项目维护者

---

**变更生效时间**: 立即生效（无需重启）

**影响范围**: 所有使用 Kiro 的开发者

**回滚方案**: 如需回滚，可以恢复 Git 历史中的旧配置
