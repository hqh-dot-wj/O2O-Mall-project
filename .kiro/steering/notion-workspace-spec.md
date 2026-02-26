# Notion 工作区设计规范与落地指南

> **核心原则**：宁可少一张表，也不要多一个「自由发挥」。  
> 没字段 → 不记录 | 没模板 → 不创建 | 没负责人 → 不存在

---

## 一、全局设计约定（所有数据库必须遵守）

| 约定                | 说明                                       |
| ------------------- | ------------------------------------------ |
| **负责人（Owner）** | 每条记录必须有                             |
| **关联 Project**    | 必须能关联到项目                           |
| **Status**          | 必须有状态字段                             |
| **长文本**          | 允许，但状态不写在正文，用 Select/Relation |

---

## 二、核心数据库一览（6 张表）

| 序号 | 数据库       | 用途              |
| ---- | ------------ | ----------------- |
| 1    | Projects     | 项目              |
| 2    | Requirements | 需求              |
| 3    | Tasks        | 任务 / 每日执行   |
| 4    | Issues       | Bug / 问题 / 事故 |
| 5    | Releases     | 版本 / 发布       |
| 6    | Knowledge    | 知识索引          |

---

## 三、Projects（项目表）

**公司级唯一项目源**

### 字段清单

| 字段名     | 类型   | 说明                                       |
| ---------- | ------ | ------------------------------------------ |
| 项目名称   | Title  |                                            |
| 项目编号   | Text   | 例如 PROJ-2026-01                          |
| 项目状态   | Select | 规划中 / 开发中 / 测试中 / 已上线 / 维护中 |
| 项目级别   | Select | S / A / B / C                              |
| 所属业务线 | Select |                                            |
| 项目负责人 | Person |                                            |
| 技术负责人 | Person |                                            |
| 开始日期   | Date   |                                            |
| 目标上线   | Date   |                                            |
| 风险等级   | Select | 低 / 中 / 高                               |
| 当前版本   | Rollup | 来自 Releases                              |
| 备注       | Text   |                                            |

### 必备视图

- **全部项目**（表格）
- **开发中项目**（筛选：项目状态 = 开发中）
- **高风险项目**（筛选：风险等级 = 高）
- **项目时间轴**（Timeline）

---

## 四、Requirements（需求表）

**产品 & 技术对齐的中枢**

### 字段清单

| 字段名       | 类型                |
| ------------ | ------------------- | ------------------------------------------ |
| 需求标题     | Title               |
| 需求编号     | Text                |
| 所属项目     | Relation → Projects |
| 需求类型     | Select              | 业务 / 技术 / 合规 / 技术债                |
| 优先级       | Select              | P0 / P1 / P2 / P3                          |
| 状态         | Select              | 待评审 / 已确认 / 开发中 / 验收中 / 已完成 |
| 业务负责人   | Person              |
| 技术负责人   | Person              |
| 是否影响现网 | Checkbox            |
| 验收人       | Person              |
| 关联任务     | Relation → Tasks    |
| 关联 Issue   | Relation → Issues   |
| 备注         | Text                |

### 页面模板（PRD）

- 背景
- 目标
- 功能说明
- 非功能要求
- 验收标准
- 风险与依赖

---

## 五、Tasks（任务表）——最重要的一张表

**所有每日计划，只允许出现在这里**

### 字段清单

| 字段名     | 类型                    |
| ---------- | ----------------------- | ----------------------------- |
| 任务名称   | Title                   |
| 所属项目   | Relation → Projects     |
| 关联需求   | Relation → Requirements |
| 执行人     | Person                  |
| 状态       | Select                  | Todo / Doing / Blocked / Done |
| 任务类型   | Select                  | 开发 / 重构 / 文档 / 调研     |
| 优先级     | Select                  | 高 / 中 / 低                  |
| 截止日期   | Date                    |
| 是否技术债 | Checkbox                |
| 备注       | Text                    |

### 必备视图

- **我的今日任务**（执行人 = 我，截止 ≤ 今天）
- **项目任务看板**（按状态分组）
- **Blocked 任务**（状态 = Blocked）
- **技术债池**（是否技术债 = 是）

---

## 六、Issues（Bug / 问题 / 事故）

**质量与稳定性中心**

### 字段清单

| 字段名       | 类型                    |
| ------------ | ----------------------- | ---------------------------------------- |
| Issue 标题   | Title                   |
| 所属项目     | Relation → Projects     |
| 类型         | Select                  | Bug / 事故 / 性能 / 安全                 |
| 严重级别     | Select                  | P0 / P1 / P2 / P3                        |
| 状态         | Select                  | 新建 / 定位中 / 修复中 / 待验证 / 已关闭 |
| 发现环境     | Select                  | 测试 / 预发 / 生产                       |
| 是否线上事故 | Checkbox                |
| 负责人       | Person                  |
| 关联需求     | Relation → Requirements |
| 关联任务     | Relation → Tasks        |
| 备注         | Text                    |

### 页面模板（RCA）

- 现象
- 影响范围
- 根因分析
- 修复方案
- 预防措施

---

## 七、Releases（版本 / 发布）

**发布可追溯**

### 字段清单

| 字段名     | 类型                    |
| ---------- | ----------------------- | ---------------------- |
| 版本号     | Title                   |
| 所属项目   | Relation → Projects     |
| 发布环境   | Select                  | 测试 / 预发 / 正式     |
| 发布日期   | Date                    |
| 发布负责人 | Person                  |
| 发布状态   | Select                  | 待发布 / 已发布 / 回滚 |
| 关联需求   | Relation → Requirements |
| 是否回滚   | Checkbox                |
| 回滚原因   | Text                    |                        |

### 页面模板（发布单）

- 本次变更需求
- 配置 / DB 变更
- 风险点
- 回滚方案
- 发布后验证

---

## 八、Knowledge（知识索引）

**文档的「目录」，不是全文仓库**

### 字段清单

| 字段名   | 类型                |
| -------- | ------------------- | ------------------------------- |
| 知识标题 | Title               |
| 分类     | Select              | 技术 / 业务 / 架构 / SOP / 踩坑 |
| 关联项目 | Relation → Projects |
| 作者     | Person              |
| 关键词   | Multi-select        |
| 最近更新 | Date                |
| 文档链接 | URL                 |

---

## 九、落地顺序（5 步）

| 步骤 | 操作                                    | 执行方式                                          |
| ---- | --------------------------------------- | ------------------------------------------------- |
| 1    | 建这 6 张表                             | 在 Notion 中手动创建                              |
| 2    | 字段原样复制                            | 按上表逐字段添加                                  |
| 3    | 每张表建「我 / Blocked / 项目」视图     | 按必备视图配置                                    |
| 4    | Requirements / Issues / Releases 建模板 | 在对应页面添加模板                                |
| 5    | 旧信息迁移                              | 只迁「还会再用的」，可用 Cursor + Notion 插件辅助 |

---

## 十、Notion 插件可协助的部分

建好库后，在 Cursor 中可：

- **create-database-row**：在任意表中批量插入记录
- **create-task**：快速创建任务（含负责人、截止日期等）
- **database-query**：按条件查询、筛选、排序
- **search / find**：在工作区搜索页面和数据库
- **spec-to-implementation**：把 PRD 拆成任务
- **tasks-build**：按任务 URL 执行并更新状态

---

## 附录：关系与依赖

```
Projects（根）
  ├── Requirements → Tasks, Issues
  ├── Tasks → Requirements, Issues
  ├── Issues → Requirements, Tasks
  ├── Releases → Requirements, Projects
  └── Knowledge → Projects
```

---

---

## 十一、MCP 已创建数据库（2026-02-26）

通过 Notion MCP 已创建 6 张表，位于父页面「新页面」下：

| 数据库       | Notion 链接                                            |
| ------------ | ------------------------------------------------------ |
| Projects     | https://www.notion.so/c42a780eb38648318ad2a8e5107f4e9a |
| Requirements | https://www.notion.so/15491d08a529458899eb82bbb321b886 |
| Tasks        | https://www.notion.so/f9c627a3fcd6451faeb0ad895bb968da |
| Issues       | https://www.notion.so/d32ac5bbcd37404c8a887456052a4c09 |
| Releases     | https://www.notion.so/041fe996e2b74e89989ffb3e47f04217 |
| Knowledge    | https://www.notion.so/4b47de3239004badbb3c772601b4ed60 |

**MCP 限制**：当前 `notion-create-database` 的 schema 仅支持创建首个 title 列，`notion-update-data-source` 暂未成功添加其余列。请在 Notion 中手动为每张表补充字段（参考上文字段清单），并配置 Relation 关联、Select 选项、视图和模板。

---

_文档生成：基于团队规范整理_
