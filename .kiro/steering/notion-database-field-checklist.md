# Notion 数据库字段配置清单（Step 2 操作手册）

> 按本清单逐表、逐字段在 Notion 中配置，可配合 `notion-workspace-spec.md` 使用。

---

## 配置顺序建议

**关系依赖**：Projects 为根表，其余表均关联 Projects。建议按以下顺序建表并添加字段：

1. **Projects**（无跨表 Relation，可先完成）
2. **Releases**（Projects 的 Rollup 需要它）
3. **Requirements**
4. **Tasks**
5. **Issues**
6. **Knowledge**

---

## 1️⃣ Projects（项目表）

| 序号 | 字段名     | Notion 类型 | 配置说明                                                                                                                                  |
| ---- | ---------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | 项目名称   | Title       | 默认已有，无需新建                                                                                                                        |
| 2    | 项目编号   | Text        | 新建 → Text                                                                                                                               |
| 3    | 项目状态   | Select      | 新建 → Select，选项：`规划中` `开发中` `测试中` `已上线` `维护中`                                                                         |
| 4    | 项目级别   | Select      | 新建 → Select，选项：`S` `A` `B` `C`                                                                                                      |
| 5    | 所属业务线 | Select      | 新建 → Select，按公司业务线填写                                                                                                           |
| 6    | 项目负责人 | Person      | 新建 → Person                                                                                                                             |
| 7    | 技术负责人 | Person      | 新建 → Person                                                                                                                             |
| 8    | 开始日期   | Date        | 新建 → Date                                                                                                                               |
| 9    | 目标上线   | Date        | 新建 → Date                                                                                                                               |
| 10   | 风险等级   | Select      | 新建 → Select，选项：`低` `中` `高`                                                                                                       |
| 11   | 当前版本   | Rollup      | 需先建 Releases 表并建立 Relation；Relation 选「Releases」，Rollup 属性选「版本号」，Calculate 选 `Show unique values` 或 `Show original` |
| 12   | 备注       | Text        | 新建 → Text                                                                                                                               |

**Relation 说明**：Projects 的「当前版本」来自 Releases。需在 Releases 中先添加「所属项目」Relation → Projects，Notion 会自动在 Projects 中生成反向 Relation；再在 Projects 中基于该 Relation 新建 Rollup。

**必备视图**：全部项目（表格）| 开发中项目（筛选：项目状态 = 开发中）| 高风险项目（筛选：风险等级 = 高）| 项目时间轴（Timeline）

---

## 2️⃣ Requirements（需求表）

| 序号 | 字段名       | Notion 类型 | 配置说明                                                          |
| ---- | ------------ | ----------- | ----------------------------------------------------------------- |
| 1    | 需求标题     | Title       | 默认已有                                                          |
| 2    | 需求编号     | Text        | 新建 → Text                                                       |
| 3    | 所属项目     | Relation    | 新建 → Relation → 选择 Projects 表，勾选「Show on Projects」      |
| 4    | 需求类型     | Select      | 新建 → Select，选项：`业务` `技术` `合规` `技术债`                |
| 5    | 优先级       | Select      | 新建 → Select，选项：`P0` `P1` `P2` `P3`                          |
| 6    | 状态         | Select      | 新建 → Select，选项：`待评审` `已确认` `开发中` `验收中` `已完成` |
| 7    | 业务负责人   | Person      | 新建 → Person                                                     |
| 8    | 技术负责人   | Person      | 新建 → Person                                                     |
| 9    | 是否影响现网 | Checkbox    | 新建 → Checkbox                                                   |
| 10   | 验收人       | Person      | 新建 → Person                                                     |
| 11   | 关联任务     | Relation    | 新建 → Relation → 选择 Tasks 表，勾选「Show on Tasks」            |
| 12   | 关联 Issue   | Relation    | 新建 → Relation → 选择 Issues 表，勾选「Show on Issues」          |
| 13   | 备注         | Text        | 新建 → Text                                                       |

**页面模板（PRD）**：在数据库的 `+` 旁添加模板，包含：背景、目标、功能说明、非功能要求、验收标准、风险与依赖

---

## 3️⃣ Tasks（任务表）

| 序号 | 字段名     | Notion 类型 | 配置说明                                                             |
| ---- | ---------- | ----------- | -------------------------------------------------------------------- |
| 1    | 任务名称   | Title       | 默认已有                                                             |
| 2    | 所属项目   | Relation    | 新建 → Relation → 选择 Projects 表，勾选「Show on Projects」         |
| 3    | 关联需求   | Relation    | 新建 → Relation → 选择 Requirements 表，勾选「Show on Requirements」 |
| 4    | 执行人     | Person      | 新建 → Person                                                        |
| 5    | 状态       | Select      | 新建 → Select，选项：`Todo` `Doing` `Blocked` `Done`                 |
| 6    | 任务类型   | Select      | 新建 → Select，选项：`开发` `重构` `文档` `调研`                     |
| 7    | 优先级     | Select      | 新建 → Select，选项：`高` `中` `低`                                  |
| 8    | 截止日期   | Date        | 新建 → Date                                                          |
| 9    | 是否技术债 | Checkbox    | 新建 → Checkbox                                                      |
| 10   | 备注       | Text        | 新建 → Text                                                          |

**必备视图**：

- 我的今日任务：筛选「执行人」= 我 + 「截止日期」≤ 今天
- 项目任务看板：按「状态」分组（Board 视图）
- Blocked 任务：筛选「状态」= Blocked
- 技术债池：筛选「是否技术债」= 是

---

## 4️⃣ Issues（问题表）

| 序号 | 字段名       | Notion 类型 | 配置说明                                                             |
| ---- | ------------ | ----------- | -------------------------------------------------------------------- |
| 1    | Issue 标题   | Title       | 默认已有                                                             |
| 2    | 所属项目     | Relation    | 新建 → Relation → 选择 Projects 表，勾选「Show on Projects」         |
| 3    | 类型         | Select      | 新建 → Select，选项：`Bug` `事故` `性能` `安全`                      |
| 4    | 严重级别     | Select      | 新建 → Select，选项：`P0` `P1` `P2` `P3`                             |
| 5    | 状态         | Select      | 新建 → Select，选项：`新建` `定位中` `修复中` `待验证` `已关闭`      |
| 6    | 发现环境     | Select      | 新建 → Select，选项：`测试` `预发` `生产`                            |
| 7    | 是否线上事故 | Checkbox    | 新建 → Checkbox                                                      |
| 8    | 负责人       | Person      | 新建 → Person                                                        |
| 9    | 关联需求     | Relation    | 新建 → Relation → 选择 Requirements 表，勾选「Show on Requirements」 |
| 10   | 关联任务     | Relation    | 新建 → Relation → 选择 Tasks 表，勾选「Show on Tasks」               |
| 11   | 备注         | Text        | 新建 → Text                                                          |

**页面模板（RCA）**：现象、影响范围、根因分析、修复方案、预防措施

---

## 5️⃣ Releases（版本 / 发布表）

| 序号 | 字段名     | Notion 类型 | 配置说明                                                             |
| ---- | ---------- | ----------- | -------------------------------------------------------------------- |
| 1    | 版本号     | Title       | 默认已有                                                             |
| 2    | 所属项目   | Relation    | 新建 → Relation → 选择 Projects 表，勾选「Show on Projects」         |
| 3    | 发布环境   | Select      | 新建 → Select，选项：`测试` `预发` `正式`                            |
| 4    | 发布日期   | Date        | 新建 → Date                                                          |
| 5    | 发布负责人 | Person      | 新建 → Person                                                        |
| 6    | 发布状态   | Select      | 新建 → Select，选项：`待发布` `已发布` `回滚`                        |
| 7    | 关联需求   | Relation    | 新建 → Relation → 选择 Requirements 表，勾选「Show on Requirements」 |
| 8    | 是否回滚   | Checkbox    | 新建 → Checkbox                                                      |
| 9    | 回滚原因   | Text        | 新建 → Text                                                          |

**页面模板（发布单）**：本次变更需求、配置/DB 变更、风险点、回滚方案、发布后验证

---

## 6️⃣ Knowledge（知识索引表）

| 序号 | 字段名   | Notion 类型  | 配置说明                                                     |
| ---- | -------- | ------------ | ------------------------------------------------------------ |
| 1    | 知识标题 | Title        | 默认已有                                                     |
| 2    | 分类     | Select       | 新建 → Select，选项：`技术` `业务` `架构` `SOP` `踩坑`       |
| 3    | 关联项目 | Relation     | 新建 → Relation → 选择 Projects 表，勾选「Show on Projects」 |
| 4    | 作者     | Person       | 新建 → Person                                                |
| 5    | 关键词   | Multi-select | 新建 → Multi-select，按需添加常用关键词                      |
| 6    | 最近更新 | Date         | 新建 → Date                                                  |
| 7    | 文档链接 | URL          | 新建 → URL                                                   |

---

## Select 选项颜色

每个 Select 选项可设置颜色：添加选项后，点击选项旁的**色块**选择颜色。  
详细配色见 `notion-import/Select选项颜色配置.md`，如项目状态：规划中(灰)、开发中(蓝)、测试中(黄)、已上线(绿)、维护中(橙)。

---

## 快速操作提示

| Notion 操作      | 快捷键/方式                                                      |
| ---------------- | ---------------------------------------------------------------- |
| 新建属性         | 点击表头最右侧 `+`                                               |
| 修改属性类型     | 点击属性名 → `⋮⋮` → Change type                                  |
| 添加 Select 选项 | 新建 Select 后点击空白处或 `+` 添加选项                          |
| 创建 Relation    | 选择目标数据库，勾选「Show on [目标表]」可生成双向关联           |
| 创建 Rollup      | 需先有 Relation，再选 Relation 属性、Rollup 属性、Calculate 方式 |
| 新建视图         | 点击数据库左上角视图名旁的 `+`                                   |
| 添加页面模板     | 点击数据库内 `+` 旁的 `▾` → Templates → New template             |

---

## Relation 依赖图（配置时参考）

```
Projects（根）
  ├── Releases 所属项目 → Projects（Projects 可 Rollup 当前版本）
  ├── Requirements 所属项目 → Projects
  ├── Tasks 所属项目 → Projects
  ├── Issues 所属项目 → Projects
  └── Knowledge 关联项目 → Projects

Requirements ←→ Tasks（关联任务 / 关联需求）
Requirements ←→ Issues（关联 Issue / 关联需求）
Issues ←→ Tasks（关联任务 / 关联任务）
Releases → Requirements（关联需求）
```

---

_文档生成：基于 notion-workspace-spec.md 整理_
