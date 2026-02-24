# 文档规范更新总结

> 日期：2026-02-24  
> 状态：已完成规范更新，待执行文档重组

---

## 1. 更新内容

### 1.1 明确了文档位置规范

**两个文档位置**：

- **项目级文档**（`docs/`）：用户指南、快速开始、部署指南等通用文档
- **应用级文档**（`apps/backend/docs/`）：后端模块的需求、设计、任务、计划等技术文档

**选择原则**：

- 后端模块的需求/设计 → `apps/backend/docs/`
- 项目通用的指南/说明 → 根目录 `docs/`

### 1.2 新增了文档分类目录

在 `apps/backend/docs/` 下新增以下分类目录：

| 目录              | 用途                                     | 示例                                    |
| ----------------- | ---------------------------------------- | --------------------------------------- |
| `guides/`         | 指南文档（操作步骤、使用说明、配置指南） | `quick-start.md`、`deployment-guide.md` |
| `tasks/`          | 任务文档（具体任务的执行过程、进度）     | `architecture-optimization.md`          |
| `plans/`          | 计划文档（未来工作计划、优化方案）       | `performance-optimization-plan.md`      |
| `summaries/`      | 总结文档（阶段总结、工作总结）           | `performance-optimization-summary.md`   |
| `references/`     | 参考文档（快速查阅的参考信息）           | `api-reference.md`                      |
| `best-practices/` | 最佳实践（编码规范、设计模式）           | `logging-best-practices.md`             |
| `testing/`        | 测试文档（测试指南、测试策略）           | `e2e-test-guide.md`                     |
| `progress/`       | 进度文档（项目进度、待办事项）           | `documentation-progress.md`             |

### 1.3 强制小写命名规范

**所有新文档必须使用小写+连字符命名**：

```
✅ 正确
- quick-start.md
- architecture-optimization.md
- performance-optimization-plan.md
- api-reference.md

❌ 错误
- QUICK_START.md
- Architecture_Optimization.md
- PerformanceOptimizationPlan.md
- API_REFERENCE.md
```

### 1.4 更新了跨模块文档查阅规范

在编写需求或设计文档前，必须先查阅相关模块的现有文档，避免误判功能缺失：

**查阅范围**：

1. 同级模块文档（如编写 Finance 时查阅 Marketing）
2. 关联模块文档（如 Finance 与 Marketing、Store 与 PMS）
3. C 端接口实现（`src/module/client/` 目录）

**常见误判场景**：

- 认为 Finance 缺少积分系统 → 实际在 Marketing 模块
- 认为 Finance 缺少优惠券 → 实际在 Marketing 模块
- 认为模块缺少 C 端接口 → 实际在 `src/module/client/` 目录

---

## 2. 文档重组计划

### 2.1 当前问题

`apps/backend/docs/` 根目录存在 30+ 个大写命名的文档，未按类型分类，导致：

- 文档查找困难
- 命名不规范
- 结构混乱

### 2.2 重组目标

1. 将所有文档按类型分类到对应目录
2. 统一使用小写+连字符命名
3. 根目录只保留 `README.md`
4. 更新所有文档内部链接

### 2.3 重组清单

详见 `apps/backend/docs/TODO/document-reorganization-plan.md`

**统计**：

- 指南文档：12 个
- 任务文档：6 个
- 计划文档：3 个
- 总结文档：5 个
- 参考文档：3 个
- 最佳实践：4 个
- 进度文档：1 个

**总计**：34 个文档需要移动和重命名

---

## 3. 执行计划

### 3.1 阶段一：规范更新（已完成）

- [x] 更新 `.kiro/steering/documentation.md` 文档规范
- [x] 明确文档位置选择原则
- [x] 新增文档分类目录说明
- [x] 强制小写命名规范
- [x] 更新跨模块文档查阅规范
- [x] 创建文档重组计划

### 3.2 阶段二：文档重组（待执行）

**优先级**：P2（中优先级）  
**预计耗时**：2-3 小时  
**执行步骤**：

1. 创建新的分类目录
2. 移动并重命名文件（使用 `git mv` 保留历史）
3. 更新文档内部链接
4. 更新 `README.md` 索引
5. 验证所有链接正常

**注意事项**：

- 使用 `git mv` 而非 `mv`，保留文件历史
- 分批执行，避免一次性改动过大
- 每批次执行后验证链接

### 3.3 阶段三：持续维护（长期）

**新文档要求**：

- 即使历史文档尚未重组，新增文档也必须遵循新规范
- 新文档必须放入对应的分类目录
- 新文档必须使用小写+连字符命名

**文档审查**：

- 定期检查是否有文档放错位置
- 定期检查是否有文档命名不规范
- 定期更新 `README.md` 索引

---

## 4. 规范文档位置

**主规范文档**：`.kiro/steering/documentation.md`

**关键章节**：

- §9.1：文档位置选择
- §9.2：后端文档目录结构
- §9.3：项目级文档目录结构
- §9.4：跨文档引用规范
- §9.5：文档命名规范
- §9.6：文档重组说明
- §10.1：跨模块文档查阅规范
- §13：大模块文档编写流程

---

## 5. 示例

### 5.1 新增指南文档

```bash
# 创建新的部署指南
touch apps/backend/docs/guides/docker-deployment-guide.md

# 更新 README.md
# 在 "指南文档" 章节添加链接
```

### 5.2 新增任务文档

```bash
# 创建新的任务文档
touch apps/backend/docs/tasks/api-versioning-implementation.md

# 更新 README.md
# 在 "任务文档" 章节添加链接
```

### 5.3 新增需求文档

```bash
# 创建新的模块需求文档
mkdir -p apps/backend/docs/requirements/order
touch apps/backend/docs/requirements/order/order-overall-analysis.md

# 创建子模块需求文档
mkdir -p apps/backend/docs/requirements/order/cart
touch apps/backend/docs/requirements/order/cart/cart-requirements.md
```

---

## 6. 相关文档

- **文档规范**：`.kiro/steering/documentation.md`
- **重组计划**：`apps/backend/docs/TODO/document-reorganization-plan.md`
- **文档索引**：`apps/backend/docs/README.md`

---

## 7. 常见问题

### Q1: 历史文档什么时候重组？

A: 重组计划已创建（`document-reorganization-plan.md`），可以根据团队时间安排执行。优先级为 P2（中优先级）。

### Q2: 新文档是否必须遵循新规范？

A: 是的。即使历史文档尚未重组，所有新增文档都必须遵循新规范（小写命名+分类目录）。

### Q3: 如何判断文档应该放在哪个目录？

A: 参考 §9.2 的文档类型说明表，根据文档的主要用途选择对应目录。

### Q4: 文档内部链接如何更新？

A: 使用相对路径引用。参考 §9.4 的跨文档引用规范。

### Q5: 如何避免将其他模块的功能误判为缺失？

A: 编写需求或设计文档前，必须先查阅相关模块的现有文档。参考 §10.1 的跨模块文档查阅规范。

---

**维护者**：开发团队  
**最后更新**：2026-02-24
