# 文档与项目结构整理指南

> 基于当前仓库的文档分布与 MONOREPO_DEEP_REVIEW 结论，给出可执行的整理方案。

---

## 一、现状概览：文档确实分散且边界不清

### 1.1 文档分布（事实来源）

| 位置 | 数量/内容 | 问题 |
|------|-----------|------|
| **仓库根目录** | MONOREPO_REVIEW.md、MONOREPO_DEEP_REVIEW.md、MIGRATION_GUIDE.md | 无统一入口指向各 app；与 docs/ 关系未说明 |
| **docs/**（VitePress 站） | guide/、deploy-online/、development/、marketing/、DOCUMENTATION_INDEX.md 等 | DOCUMENTATION_INDEX 中大量链接指向 **`../server/`**，实际应为 **`../apps/backend/`**，链接已失效 |
| **apps/backend/docs/** | 约 97 个 .md，含 e2e-tests/、TODO/ 子目录 | 与代码脱节（如 ResultData 文档说已迁移但代码/OpenAPI 仍存在）；“当前有效”与“历史报告”混在一起 |
| **apps/backend/src/module/** | marketing/、finance/ 等目录下的 README、IMPLEMENTATION_*.md | 文档在源码深处，不易被索引和发现 |
| **apps/admin-web/** | 根目录 QUICK_START.md、Coding Rules.md；docs/ 下 6+ 篇（TESTING、COURSE_*、MARKETING_* 等） | 仅覆盖 admin-web，与 backend 无交叉索引 |
| **.kiro / .cursor / .agents** | 流程与规则类 | 与业务文档分离，可保持现状 |

结论：**没有单一文档索引或“事实来源”说明**，新人或 AI 容易按过期/错误路径理解（MONOREPO_DEEP_REVIEW §6、§11 已指出）。

---

## 二、项目结构是否“很混乱”？

- **是**。MONOREPO_DEEP_REVIEW 已给出明确结论：具备 Monorepo 形式，但**共享层薄弱、重复多、命名与配置不统一、文档与代码脱节**，整体仍很混乱。
- 文档只是其中一环，与“配置分散、命名不一致、依赖与脚本混乱”等并列（见该文档 §7 汇总表、§9 小结）。

因此：**既要整理文档，也建议与 P0/P1 改进一起规划**（例如先修文档入口与 backend 索引，再逐步统一配置与命名）。

---

## 三、整理原则（不扩大范围）

1. **单一入口**：仓库根有一个“文档入口”页，指向各 app 的文档首页或索引，且**路径正确**。
2. **按应用分界**：根 docs/ 放**全仓库通用**内容（架构、部署、Monorepo 说明）；各 app 的“当前有效”文档留在各自 `apps/<app>/docs/` 或显眼位置。
3. **区分“当前”与“历史”**：backend 的 REFACTORING_*、P0_*、COMMISSION_* 等报告可归档到 `docs/archive/` 或 `docs/history/`，并在主索引中标注“已归档，仅作历史参考”。
4. **索引与代码一致**：索引中提到的路径、概念（如 Result vs ResultData）与当前代码/OpenAPI 一致；若不一致，先更新代码或 OpenAPI，再改文档，或至少在索引中标注“待同步”。

---

## 四、推荐调整方案（分步执行）

### 第一步：修复根文档入口与路径（立即可做）

- **在仓库根**增加或指定**唯一入口**：
  - 方案 A：使用根目录 **README.md** 增加一节“文档导航”，列出指向各处的正确链接。
  - 方案 B：保留 **docs/DOCUMENTATION_INDEX.md** 作为入口，但**全面替换**其中的 `../server/` 为 `../apps/backend/`，并增加 `apps/admin-web`、`apps/miniapp-client` 的文档链接。
- **在 docs/.vitepress/config.mts** 的 nav/sidebar 中，如有指向 backend 的链接，一并改为 `apps/backend` 或相对路径，避免再次出现 `server`。

**验收**：从根 README 或 docs 索引出发，能通过正确路径打开 backend/admin-web 的快速开始或主 README。

---

### 第二步：统一“文档首页”与索引（短期）

- **apps/backend/docs/README.md**  
  - 已有分类索引，保留并维护。  
  - 在 README 顶部增加一句“**事实来源**：本文档索引最后与代码/OpenAPI 核对日期：YYYY-MM-DD”，并约定定期（如每迭代）核对。  
  - 将“已过时/仅历史”的文档在索引中移到“归档”小节，或集中到子目录如 **docs/archive/**，并在文件名或索引中标注 `[已归档]`。
- **apps/admin-web**  
  - 在 **README 或 docs/README.md** 中明确“admin-web 文档首页”，并列出 docs/ 下各文档的用途（如 TESTING.md、COURSE_MANAGEMENT_GUIDE.md）。  
  - 在根文档入口（或 docs/DOCUMENTATION_INDEX）中增加“Admin Web 文档”链接，指向该首页。

这样每个 app 都有一个清晰的“文档首页”，根入口只做导航，不重复内容。

---

### 第三步：Backend 文档瘦身与归档（短期）

- 在 **apps/backend/docs/** 下建立 **archive/**（或 **history/**）子目录。  
- 将明显“历史报告、已完成任务”的文档移入归档，例如：  
  - REFACTORING_*、OPTIMIZATION_*、P0_*、P1_*、PHASE_*、COMMISSION_TEST_EXECUTION_REPORT、COMPLETION_* 等。  
- 在 **apps/backend/docs/README.md** 中：  
  - 保留“当前有效”的链接（QUICK_START、API_REFERENCE、E2E_TEST_GUIDE、业务指南等）。  
  - 增加“归档文档”一节，指向 `archive/` 并说明“仅作历史参考，可能与当前代码不一致”。  
- 若某文档描述与代码已不一致（如 ResultData），要么：  
  - 更新文档与 OpenAPI 以符合当前实现，要么  
  - 将文档移入归档并注明“已过时”。

**验收**：backend 主索引中只保留“当前有效”的文档，历史报告不混在常用链接中。

---

### 第四步：源码内文档的可见性（可选）

- **apps/backend/src/module/marketing/**、**finance/** 等下的 README、IMPLEMENTATION_*.md：**  
  - 在 **apps/backend/docs/README.md** 的“按模块”或“功能实现”小节中，增加指向这些文件的链接（相对路径），避免文档“藏在源码里”没人发现。  
- 若某模块文档与 **apps/backend/docs/** 中内容重复，可二选一：只保留一处，或在索引中写清“概览在 docs/，细节在 src/module/xxx/”。

---

### 第五步：与 Monorepo 改进对齐（中期）

- 文档整理与 **MONOREPO_DEEP_REVIEW** 中的 P0/P1/P2 建议一起看：  
  - 例如完成“Result/ResultData 统一”“枚举收拢到 libs”后，在 docs 中更新“事实来源”说明和架构图。  
- 在根或 docs 中增加一页 **“Monorepo 文档与结构说明”**（可合并进现有 MONOREPO_REVIEW 或单独一篇）：  
  - 说明根 docs/ 与各 app docs/ 的职责、索引位置、以及“当前事实来源”的维护方式。

---

## 五、不建议的做法

- **不要**在未修正路径的情况下继续引用 `server/`。  
- **不要**为“整洁”而大规模移动或删除文档，导致现有链接大面积失效；优先“改索引 + 归档”，再按需迁移。  
- **不要**在文档里保留与当前代码/OpenAPI 明显矛盾的“事实”（如“ResultData 已迁移”但代码仍用 ResultData）；要么改代码，要么改文档并标注状态。

---

## 六、小结

| 问题 | 建议 |
|------|------|
| 文档四散、无单一入口 | 根 README 或 docs/DOCUMENTATION_INDEX 作为唯一入口，并修正所有路径（server → apps/backend） |
| 根 docs 与 backend 边界不清 | 根 docs 以“全仓库通用 + 导航”为主；各 app 的“当前文档”以各 app 的 docs/ 为准 |
| Backend 文档过多且与代码脱节 | 建立 archive/，将历史报告移入；主索引只保留当前有效；标注“事实来源”核对日期 |
| 源码内文档难发现 | 在 backend docs 索引中增加指向 src/module 下文档的链接 |
| 与整体 Monorepo 改进的关系 | 文档整理与 P0/P1 改进同步规划；增加 Monorepo 文档与结构说明页 |

按**第一步 → 第二步 → 第三步**执行，即可在不大动仓库结构的前提下，明显改善“文档四散、项目结构看起来混乱”的问题；第四、五步可按需迭代。

---

## 执行记录（2026-02-10）

- **第一步**：已修正 `docs/DOCUMENTATION_INDEX.md` 中全部 `../server/` → `../apps/backend/`，并增加各应用文档入口表（Backend / Admin Web / Miniapp / 文档结构说明）。
- **第二步**：已补充 `docs/README.md` 作为文档入口说明；已在 `apps/backend/docs/README.md` 顶部增加事实来源与核对日期，并注明归档目录。
- **第三步**：已创建 `apps/backend/docs/archive/`，将 28 篇历史报告类文档移入，并新增 `archive/README.md`；已更新 backend 主索引与根文档索引中的归档链接。
