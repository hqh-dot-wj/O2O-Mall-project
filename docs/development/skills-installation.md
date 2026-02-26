# Anthony Fu Skills 安装指南

本文档说明如何为项目安装 Anthony Fu 的官方 Skills。

## 📋 前提条件

1. 确认 Kiro 支持 Skills 机制
2. 确认可以访问 GitHub（Skills 托管在 GitHub）
3. 确认已安装 Node.js 和 pnpm

## 🎯 推荐安装的 Skills

基于项目技术栈（Vue 3 + Vite + UnoCSS + NestJS + pnpm + Turborepo），推荐安装以下 11 个 Skills：

### 核心技术栈（7 个）- File Match 触发

| Skill                     | 用途               | 触发条件            |
| ------------------------- | ------------------ | ------------------- |
| vue                       | Vue 3 核心 API     | 编辑 .vue 文件      |
| pinia                     | 状态管理           | 编辑 .vue 文件      |
| vite                      | 构建工具           | 编辑 vite.config.ts |
| unocss                    | 原子 CSS           | 编辑 uno.config.ts  |
| vueuse-functions          | Composition 工具库 | 编辑 .vue 文件      |
| vue-router-best-practices | 路由最佳实践       | 编辑 router/ 目录   |
| vue-best-practices        | Vue 最佳实践       | 编辑 .vue 文件      |

### 工具链（4 个）- Manual 触发

| Skill                      | 用途          | 触发方式        |
| -------------------------- | ------------- | --------------- |
| pnpm                       | 包管理器      | #monorepo-tools |
| turborepo                  | Monorepo 构建 | #monorepo-tools |
| vitest                     | 单元测试      | #testing-guide  |
| vue-testing-best-practices | Vue 测试      | #testing-guide  |

## 📦 安装方法

### 方法 1: 使用 skills CLI（推荐）

如果 Kiro 支持 `pnpx skills` 命令：

```bash
# 安装所有推荐的 Skills
pnpx skills add antfu/skills --skill='vue,pinia,vite,unocss,vueuse-functions,vue-router-best-practices,vue-best-practices,pnpm,turborepo,vitest,vue-testing-best-practices'

# 或者分批安装
# 核心技术栈
pnpx skills add antfu/skills --skill='vue,pinia,vite,unocss,vueuse-functions,vue-router-best-practices,vue-best-practices'

# 工具链
pnpx skills add antfu/skills --skill='pnpm,turborepo,vitest,vue-testing-best-practices'
```

### 方法 2: 手动下载（如果 CLI 不可用）

1. 访问 https://github.com/antfu/skills
2. 下载对应的 Skill 文件到 `.kiro/skills/` 目录
3. 在 steering 文件中使用 `#[[skill:skill-name]]` 引用

### 方法 3: Git Submodule（高级）

```bash
# 在 .kiro/skills/ 目录下添加 submodule
cd .kiro/skills
git submodule add https://github.com/antfu/skills antfu-skills

# 只复制需要的 Skills
cp antfu-skills/skills/vue .
cp antfu-skills/skills/pinia .
# ... 其他 Skills
```

## ✅ 验证安装

安装完成后，验证 Skills 是否生效：

### 测试 1: Vue Skill

```bash
# 1. 创建测试文件
echo '<template><div>test</div></template>' > test.vue

# 2. 在 Kiro 中打开 test.vue
# 3. 询问 AI: "Vue 3 Composition API 的最佳实践是什么？"
# 4. 检查回复是否引用了 vue skill 的内容
```

### 测试 2: Vite Skill

```bash
# 1. 打开 apps/admin-web/vite.config.ts
# 2. 询问 AI: "如何优化 Vite 构建性能？"
# 3. 检查回复是否引用了 vite skill 的内容
```

### 测试 3: Manual Skills

```bash
# 1. 在聊天中输入: #monorepo-tools
# 2. 询问 AI: "pnpm workspace 的最佳实践是什么？"
# 3. 检查回复是否引用了 pnpm skill 的内容
```

## 🔍 检查 Skills 状态

### 查看已安装的 Skills

```bash
# 如果支持 skills CLI
pnpx skills list

# 或者手动检查
ls -la .kiro/skills/
```

### 查看 Skill 内容

```bash
# 查看 vue skill 的内容
cat .kiro/skills/vue/SKILL.md

# 或者在 Kiro 中
# 使用 readFile 工具读取 .kiro/skills/vue/SKILL.md
```

## 🚫 不推荐安装的 Skills

以下 Skills 不适合本项目：

| Skill                 | 原因                          |
| --------------------- | ----------------------------- |
| antfu                 | 太个人化，项目已有 my-skill   |
| nuxt                  | 项目使用 Vue 3 SPA，不是 Nuxt |
| vitepress             | 不需要静态站点生成            |
| slidev                | 不需要做演示文稿              |
| tsdown                | 不需要打包 TypeScript 库      |
| web-design-guidelines | 项目已有 ui-ux-pro-max        |

## 📊 预期效果

安装完成后，context 消耗情况：

```
场景                          Context 消耗
─────────────────────────────────────────
开启新对话                    ~75 tokens
编辑 Vue 组件                 ~3,500 tokens
编辑 Vite 配置                ~2,000 tokens
编辑后端代码                  ~1,500 tokens
写测试 (#testing-guide)       ~3,000 tokens
配置 monorepo (#monorepo-tools) ~2,500 tokens
```

相比改造前的 8,000 tokens，新对话的 context 消耗降低了 **99%**！

## 🔧 故障排除

### 问题 1: Skills 未生效

**症状**: 编辑文件时没有加载对应的 Skill

**解决方案**:

1. 检查 steering 文件的 `fileMatchPattern` 是否正确
2. 确认文件路径匹配模式
3. 重启 Kiro 或重新加载配置

### 问题 2: Skills 内容冲突

**症状**: Anthony Fu Skills 和项目规范有冲突

**解决方案**:

1. 项目规范优先级更高
2. 在 steering 文件中明确说明项目特定规范
3. 使用 "项目规范见 xxx.md" 引导 AI

### 问题 3: Context 仍然过大

**症状**: 加载的 Skills 太多，context 消耗仍然很高

**解决方案**:

1. 检查是否有多个 steering 文件匹配同一路径
2. 考虑将部分 File Match 改为 Manual
3. 精简 steering 文件内容

## 📝 维护建议

1. **定期更新**: Anthony Fu 的 Skills 会持续更新，建议定期同步
2. **选择性安装**: 只安装真正需要的 Skills
3. **监控 context**: 定期检查 context 消耗情况
4. **反馈优化**: 根据实际使用效果调整配置

## 🔗 相关资源

- Anthony Fu Skills 仓库: https://github.com/antfu/skills
- Skills 规范: https://agentskills.io/
- Vercel Skills CLI: https://github.com/vercel-labs/skills
- 项目 Steering 配置: `.kiro/steering/README.md`

## 💡 下一步

安装完成后：

1. 阅读 `.kiro/steering/README.md` 了解触发机制
2. 测试不同场景下的 Skills 加载
3. 根据实际使用效果调整配置
4. 向团队分享使用经验
