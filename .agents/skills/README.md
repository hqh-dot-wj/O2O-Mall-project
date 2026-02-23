# 🛠️ Agent Skills 使用指南

本项目已安装以下 Skills，可根据任务类型按需激活。

---

## 📦 已安装 Skills

| Skill                       | 位置              | 用途                   | 触发场景                     |
| --------------------------- | ----------------- | ---------------------- | ---------------------------- |
| `doc-coauthoring-custom` ⭐ | `.agent/skills/`  | **项目定制版**文档协作 | 模块分析、设计文档、架构报告 |
| `doc-coauthoring`           | `.agents/skills/` | 通用文档协作 (原版)    | PRD、RFC、决策文档           |
| `find-skills`               | `.agents/skills/` | 发现和安装新 Skills    | 需要扩展能力时               |
| `my-skill`                  | `.agent/skills/`  | 项目编码规范           | NestJS/Vue/UniApp 开发       |
| `ui-ux-pro-max`             | `.agent/skills/`  | UI/UX 设计指南         | 前端界面设计                 |

> ⭐ `doc-coauthoring-custom` 是推荐使用的文档 Skill，它整合了项目特有的文档格式规范。

---

## 🎯 使用方式

### 方式一：自然语言触发

直接描述你的需求，AI 会自动识别并激活对应 Skill：

```
# 触发 doc-coauthoring-custom (项目定制版，推荐)
"分析 finance 模块"
"写一个佣金模块的设计文档"
"生成 admin 模块的架构分析报告"

# 触发 doc-coauthoring (通用版)
"帮我写一个 PRD"
"起草一个决策文档"
"创建一个 RFC"

# 触发 my-skill (编码规范)
"帮我写一个 NestJS Service"
"创建一个 Vue 组件"

# 触发 ui-ux-pro-max
"设计一个登录页面"
"推荐一个配色方案"
```

### 方式二：显式引用

在消息中使用 `#` 引用特定 Skill：

```
#doc-coauthoring-custom 分析 marketing 模块
#my-skill 检查这段代码是否符合规范
```

---

## 📝 doc-coauthoring-custom 详细使用说明 (推荐)

这是**项目定制版**的文档协作 Skill，整合了：

- `doc-coauthoring` 的三阶段工作流
- 项目特有的文档格式规范
- 已有文档的风格 (如 `architecture-comprehensive-analysis.md`)

### 文档格式规范

生成的文档会遵循以下格式：

```markdown
# [模块名] 设计文档

> **文档日期**: YYYY-MM-DD  
> **分析范围**: [路径]

## 1. 执行摘要

### 1.1 模块定位

### 1.2 架构成熟度评分 (表格)

## 2. 模块结构总览 (代码树)

## 3. 核心业务逻辑分析

- 现有逻辑 + 代码示例
- ✅ 优点
- ❌ 不足

## 4. 与市面产品差距 (表格对比)

## 5. 代码质量分析

## 6. 安全性分析

## 7. 待办事项 (短期/中期/长期)

## 8. 功能扩展建议

## 9. 模块依赖关系图

## 10. 总结
```

### 评分标准

| 维度         | 说明                       |
| ------------ | -------------------------- |
| 模块化与边界 | 模块划分清晰度、职责单一性 |
| 代码质量     | 规范遵循、复杂度控制       |
| 可测试性     | 单测覆盖、Mock 难度        |
| 安全性       | 权限控制、数据隔离         |
| 可扩展性     | 模块可加性、横切关注点     |

### 使用示例

```
用户: 分析 finance 模块

AI: 好的，我将使用项目定制版文档协作流程来分析 finance 模块。

先确认几个问题：
1. 分析范围：整个 finance 模块还是特定子模块 (commission/wallet/withdrawal)？
2. 文档类型：架构分析报告 / 重构方案 / 设计文档？
3. 是否需要与市面产品对比？
4. 主要关注点：代码质量 / 业务逻辑 / 安全性 / 性能？
```

---

## 📄 doc-coauthoring 详细使用说明 (通用版)

适用于**非项目特定**的文档，如 PRD、RFC、决策文档等。

### 工作流程

该 Skill 提供三阶段协作式文档创建流程：

```
┌─────────────────────────────────────────────────────────┐
│  Stage 1: Context Gathering (上下文收集)                │
│  ├── 文档类型、目标受众、期望效果                       │
│  ├── 背景信息、相关讨论、技术依赖                       │
│  └── 约束条件、时间压力、利益相关者                     │
├─────────────────────────────────────────────────────────┤
│  Stage 2: Refinement & Structure (结构化与精炼)         │
│  ├── 确定文档结构                                       │
│  ├── 逐节头脑风暴 (5-20 个选项)                         │
│  ├── 用户筛选保留/删除/合并                             │
│  └── 迭代修改直到满意                                   │
├─────────────────────────────────────────────────────────┤
│  Stage 3: Reader Testing (读者测试)                     │
│  ├── 预测读者可能的问题                                 │
│  ├── 用新的 AI 实例测试文档                             │
│  └── 修复发现的盲点                                     │
└─────────────────────────────────────────────────────────┘
```

### 适用文档类型

- 技术设计文档 (Technical Spec)
- 产品需求文档 (PRD)
- 决策文档 (Decision Doc)
- RFC (Request for Comments)
- API 设计文档
- 架构分析报告

### 使用示例

```
用户: 帮我写一个佣金模块的技术设计文档

AI: 我可以用结构化的协作流程来帮你创建这个文档。流程分三个阶段：
1. 上下文收集 - 你提供所有相关信息，我会问澄清问题
2. 结构化与精炼 - 逐节构建，通过头脑风暴和筛选迭代
3. 读者测试 - 用新的 AI 测试文档，确保读者能理解

要使用这个流程吗？还是你更喜欢自由形式？

用户: 用这个流程

AI: 好的，先回答几个元问题：
1. 这是什么类型的文档？(技术规格/设计文档/...)
2. 主要读者是谁？
3. 读完后你希望他们有什么反应？
4. 有模板或特定格式要求吗？
5. 其他约束或背景？
```

### 高效使用技巧

1. **信息倾倒**: 不用组织，直接把所有相关信息丢出来
2. **简写回答**: 可以用 "1: 是, 2: 见 #channel, 3: 不需要" 这样的简写
3. **指定修改**: 不要直接编辑文档，而是告诉 AI 要改什么，这样 AI 能学习你的风格
4. **链接资源**: 可以指向相关的文档、讨论、代码

---

## 💻 my-skill (编码规范) 使用说明

### 自动激活场景

当你进行以下任务时会自动应用：

- NestJS 后端开发
- Vue3 Admin 前端开发
- UniApp 小程序开发

### 核心规范

| 层级       | 规范要点                                                        |
| ---------- | --------------------------------------------------------------- |
| **后端**   | Result 响应、BusinessException、@Transactional、Repository 模式 |
| **前端**   | useTable/useTableOperate、模块拆分、NaiveUI 组件                |
| **移动端** | definePage 宏、条件编译、UnoCSS                                 |

### 质量检查清单

- [ ] 嵌套深度 ≤ 3 层
- [ ] 函数长度 ≤ 80 行
- [ ] 无魔法数字
- [ ] 无 N+1 查询
- [ ] 使用卫语句

---

## 🎨 ui-ux-pro-max 使用说明

### 触发命令

```bash
# 生成完整设计系统
python3 .agent/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "项目名"

# 搜索特定领域
python3 .agent/skills/ui-ux-pro-max/scripts/search.py "glassmorphism" --domain style
python3 .agent/skills/ui-ux-pro-max/scripts/search.py "elegant serif" --domain typography

# 获取技术栈指南
python3 .agent/skills/ui-ux-pro-max/scripts/search.py "responsive" --stack html-tailwind
```

### 可用领域

| 领域         | 用途          |
| ------------ | ------------- |
| `product`    | 产品类型推荐  |
| `style`      | UI 风格、效果 |
| `typography` | 字体配对      |
| `color`      | 配色方案      |
| `landing`    | 落地页结构    |
| `chart`      | 图表类型      |
| `ux`         | UX 最佳实践   |

---

## 🔍 find-skills 使用说明

当你需要新能力时，可以搜索和安装新的 Skills：

```bash
# 搜索 Skills
npx skills find react performance
npx skills find testing

# 安装 Skills
npx skills add <owner/repo> --skill <skill-name> -y

# 检查更新
npx skills check
npx skills update
```

---

## ⚙️ 配置说明

### Skills 存放位置

```
.agents/skills/           # 项目级 Skills (当前项目)
~/.agents/skills/         # 用户级 Skills (全局)
```

### 不自动触发的设置

如果某个 Skill 不想自动触发，可以在 SKILL.md 的 frontmatter 中设置：

```yaml
---
name: my-skill
description: ...
inclusion: manual # 设置为手动触发
---
```

---

## 📚 参考资源

- [Skills 官方文档](https://skills.sh/)
- [Anthropic Skills 仓库](https://github.com/anthropics/skills)
- [Skills CLI 文档](https://www.npmjs.com/package/skills)
