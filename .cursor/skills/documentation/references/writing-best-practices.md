# 文档编写最佳实践

## 分段写入（必须遵守）

- fsWrite 单次写入限制：50 行
- 超过 50 行用 fsWrite + fsAppend 组合
- 第一段：核心章节框架（<50 行）；后续每段建议 <100 行

## 工具使用

- **批量读取**：一次读取多个文件，减少工具调用
- **strReplace**：前必须先 readFile 确认 oldStr 完全匹配；优先用 fsAppend 追加
- **常见错误**：fsWrite 超 50 行会失败 → 分段写入；strReplace 不匹配 → 先读取确认

## 批量文档流程

1. **准备**：确认模块列表、文档类型；第一个模块建立标准模板
2. **单模块**：探索模块结构 → 批量读取源码 → 分析业务逻辑 → 创建需求文档（分段）→ 创建设计文档（分段）→ 缺陷 P0-P3 分级
3. **第一个模块**：详细阅读代码；完整编写需求+设计；建立模板
4. **后续模块**：复用结构；仅修改业务内容；每 5-10 个模块验收一次

## 大模块（先整体后子模块）

1. **整体架构评估**：`{module}-overall-analysis.md` 放 `apps/backend/docs/requirements/{module}/`
2. **子模块需求**：`requirements/{module}/{submodule}/{submodule}-requirements.md`
3. **子模块设计**：`design/{module}/{submodule}/{submodule}-design.md`

## 质量检查清单

- 结构完整性：必需章节、图表；编号连续
- 内容准确性：术语统一；接口路径、表名准确；图文一致
- 规范遵循：文件名小写+连字符；Mermaid 纯 ASCII；缺陷 P0-P3 分级
