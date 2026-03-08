---
name: documentation
description: >
  Write requirements/design docs in docs/** or **/docs/**.
  Trigger: user asks to create or edit a requirements doc, design doc,
  PRD, or technical document; generating docs for new features or modules.
---

# 需求文档与设计文档规范

生成**需求文档**、**设计文档**时遵循本规范。适用于：新功能规划、接口设计、模块实现等需正式文档产出的场景。

## Instructions

1. **确认文档类型**：需求文档 vs 设计文档。需求含用例图、活动图、状态图；设计含类图、时序图、组件图、部署图。
2. **选择位置**：项目级 `docs/`；后端 `apps/backend/docs/`；Admin `apps/admin-web/docs/`；小程序 `apps/miniapp-client/docs/`。路径与 `src/module/` 对齐。
3. **套用结构**：需求文档 11 章节、设计文档 14 章节。详见 `references/requirement-template.md`、`references/design-template.md`。
4. **命名**：文件名小写 + 连字符，如 `commission-requirements.md`。
5. **绘图**：图须有标题和说明；Mermaid 禁止 Unicode 符号（→、≤ 等），用 ASCII。详见 `references/mermaid-conventions.md`。
6. **文字**：术语统一、主谓宾完整、量化优先、引用准确（`GET /api/xxx`）。
7. **缺陷分析**：必须先查阅项目代码；检查 `src/module/client/`、同级模块文档；P0-P3 分级，每条含现状/影响/建议。
8. **长文档**：>50 行用分段写入（首段 <50 行，后续 <100 行）。

目录结构详见 `references/directory-structure.md`；缺陷分析详见 `references/defect-analysis-checklist.md`；编写技巧详见 `references/writing-best-practices.md`。

## Validation

- [ ] 章节结构完整，编号连续
- [ ] 图有标题和说明，Mermaid 纯 ASCII
- [ ] 文件名小写+连字符，目录归类正确
- [ ] 缺陷分析已查阅 client/、关联模块，P0-P3 分级
- [ ] 术语统一、引用准确
