---
inclusion: manual
---

# 任务执行工作流规范

> 当用户提供需求分析文档后，自动触发此工作流

## 触发条件

当用户提供以下类型的文档时，自动应用此工作流：

- 需求分析文档（requirements.md）
- 缺陷分析文档（defects.md）
- 改进计划文档（improvements.md）
- 包含待办任务列表的文档

## 工作流步骤

### 第 1 步：创建任务清单

从需求文档中提取任务，创建简洁的任务清单文档：

**文件位置**：`docs/tasks/{模块名}-task-list.md`

**文件格式**：

```markdown
# {模块名}任务清单

> 来源：{需求文档路径}
> 创建时间：{日期}

## 短期任务（1-2周）

- [ ] T-1: 任务名称 (预估工时)
- [ ] T-2: 任务名称 (预估工时)
- [ ] T-3: 任务名称 (预估工时)

## 中期任务（1-2月）

- [ ] T-4: 任务名称 (预估工时)
- [ ] T-5: 任务名称 (预估工时)

## 长期任务（3-6月）

- [ ] T-6: 任务名称 (预估工时)
```

**要求**：

- ✅ 简洁明了，只包含任务编号、名称、预估工时
- ✅ 使用 checkbox `- [ ]` 标记未完成，`- [x]` 标记已完成
- ✅ 按优先级/时间分组
- ❌ 不包含详细描述、背景、分析（这些在需求文档中）

### 第 2 步：逐个执行任务

每完成一个任务，必须遵循以下标准流程：

#### 2.1 实现功能代码

- 遵循项目规范（backend-nestjs.md / admin-web-frontend.md）
- 使用类型安全、异常处理、事务等最佳实践
- 代码简洁，单函数不超过 80 行

#### 2.2 编写单元测试 ⭐ 必须

- 测试文件位置：与源文件同目录，命名为 `*.spec.ts`
- 测试覆盖：
  - ✅ 正常情况（Happy Path）
  - ✅ 边界情况（Edge Cases）
  - ✅ 异常情况（Error Cases）
- 测试文件顶部添加 `// @ts-nocheck`

**测试模板**：

```typescript
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        // mock dependencies
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  describe('methodName', () => {
    it('应该成功处理正常情况', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('应该在边界情况下正确处理', async () => {
      // Test edge cases
    });

    it('应该在异常情况下抛出错误', async () => {
      // Test error cases
    });
  });
});
```

#### 2.3 运行测试

```bash
# 运行单个测试文件
pnpm --filter backend test -- service-name.spec

# 运行所有测试
pnpm --filter backend test
```

#### 2.4 更新任务清单

- 将 `- [ ]` 改为 `- [x]`
- 可选：添加完成时间和备注

```markdown
- [x] T-1: SKU 创建时传入 costPrice (0.5h) ✅ 2026-02-26
```

### 第 3 步：批量完成后总结

当一批任务完成后（如短期任务全部完成），创建总结文档：

**文件位置**：`docs/improvements/{模块名}-{批次}-summary.md`

**内容包含**：

- 已完成任务列表
- 测试结果统计
- 规范合规验证
- 遗留问题（如有）

## 工作流原则

### ✅ 必须做

1. **任务清单先行**：收到需求文档后，第一件事是创建任务清单
2. **测试驱动**：每个任务必须有对应的单元测试
3. **逐个完成**：一次只专注一个任务，完成后再进行下一个
4. **及时标记**：完成任务后立即更新 checkbox
5. **保持简洁**：任务清单只记录任务，不重复需求分析

### ❌ 不要做

1. **不要跳过测试**：即使是简单的修复，也要写测试
2. **不要批量标记**：完成一个标记一个，不要事后补标记
3. **不要在任务清单中写详细描述**：详细内容在需求文档中
4. **不要修改需求文档**：需求文档保持不变，只更新任务清单

## 示例

### 输入：需求文档

```markdown
# PMS 模块需求分析

## 背景

...（大量背景描述）

## 缺陷分析

- D-1: 无商品删除接口
- D-2: 无独立上下架接口
  ...

## 待办任务

### 短期（1-2周）

- T-1: SKU 创建时传入 costPrice (0.5h)
- T-2: 新增独立上下架接口 (1h)
  ...
```

### 输出：任务清单

```markdown
# PMS 模块任务清单

> 来源：docs/requirements/pms/pms-requirements.md
> 创建时间：2026-02-26

## 短期任务（1-2周）

- [ ] T-1: SKU 创建时传入 costPrice (0.5h)
- [ ] T-2: 新增独立上下架接口 (1h)
- [ ] T-3: 上下架调用通知方法 (1h)
- [ ] T-4: 注册 Bull 队列 (1h)
- [ ] T-5: 创建 UpdateProductDto (0.5h)
- [ ] T-6: 商品列表价格改为 MIN (0.5h)
- [ ] T-7: 添加 @ApiBearerAuth (0.5h)

## 中期任务（1-2月）

- [ ] T-8: 商品删除接口 (2-3d)
- [ ] T-9: 校验 distRate 范围 (1d)
- [ ] T-10: 商品变更事件机制 (2-3d)
```

### 执行过程

```markdown
## 短期任务（1-2周）

- [x] T-1: SKU 创建时传入 costPrice (0.5h) ✅ 2026-02-26
- [x] T-2: 新增独立上下架接口 (1h) ✅ 2026-02-26
- [ ] T-3: 上下架调用通知方法 (1h) 🔄 进行中
- [ ] T-4: 注册 Bull 队列 (1h)
      ...
```

## 文件组织

```
docs/
├── requirements/          # 需求文档（详细分析）
│   └── pms/
│       └── pms-requirements.md
├── tasks/                 # 任务清单（简洁执行）
│   └── pms-task-list.md
└── improvements/          # 完成总结
    └── pms-short-term-fixes-summary.md
```

## 检查清单

在开始执行任务前，确认：

- [ ] 已创建任务清单文档
- [ ] 任务清单简洁明了（无冗余描述）
- [ ] 任务按优先级分组
- [ ] 每个任务有预估工时

在完成每个任务后，确认：

- [ ] 功能代码已实现
- [ ] 单元测试已编写（覆盖正常/边界/异常）
- [ ] 测试已运行并通过
- [ ] 任务清单已更新（checkbox 标记为完成）

在批量任务完成后，确认：

- [ ] 所有任务的 checkbox 已标记
- [ ] 已创建完成总结文档
- [ ] 测试统计已记录
- [ ] 需求文档已更新状态（如需要）

---

**版本**：1.0  
**最后更新**：2026-02-26  
**适用范围**：所有需求驱动的开发任务
