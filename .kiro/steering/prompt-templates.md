---
inclusion: manual
---

# Kiro 提示词模板（Nest-Admin-Soybean 项目专用）

本项目为 Monorepo 架构，包含 4 个子项目：
- `apps/backend` — NestJS + Prisma + TypeScript 后端
- `apps/admin-web` — Vue3 + Naive UI + TypeScript 管理后台
- `apps/miniapp-client` — uniapp + Vue3 + TypeScript 小程序/H5
- `apps/upload` — 上传服务

以下模板已对齐项目 steering 规范，可直接复制使用。

---

## 一、后端功能开发（apps/backend）

### 模板 A：新增业务模块

```
在 apps/backend 中新增 [模块名] 模块。

功能需求：
1. [功能1，如：CRUD 接口]
2. [功能2，如：分页查询，支持按 xxx 筛选]
3. [功能3，如：导出功能]

执行要求：
- 参考 apps/backend/src/module/admin/system/user 的实现模式
- 遵循项目模块结构：dto/ vo/ services/ xxx.repository.ts xxx.service.ts xxx.controller.ts xxx.module.ts
- 使用 Result.ok() / BusinessException 统一响应和异常
- DTO 继承 PageQueryDto，使用 PaginationHelper 分页
- Repository 继承 SoftDeleteRepository
- 事务使用 @Transactional() 装饰器
- Controller 使用 @Api、@RequirePermission、@Operlog 装饰器
- 补充单元测试 xxx.spec.ts

性能评估（PR 必答）：
- QPS 档位：[低/中/高]
- 是否大表：[是/否]
- 数据量预估：[D1/D2/D3/D4]
```

### 模板 B：后端 Bug 修复

```
修复 apps/backend 中 [模块名] 的 [问题描述]。

复现步骤：
1. [步骤1]
2. [步骤2]
3. [期望行为 vs 实际行为]

执行要求：
- 先定位问题根因，记录在 findings.md
- 修复时遵循项目规范（卫语句、枚举、Where IN 批量查询）
- 补充对应的单元测试覆盖此 case
- 如涉及资金/订单，确保幂等性和防重复提交
```

### 模板 C：后端接口优化

```
优化 apps/backend 中 [接口路径] 的性能。

当前问题：
- [如：P95 > 500ms / 存在 N+1 查询 / offset 深分页]

执行要求：
- 分析当前 SQL 和查询模式
- 遵循性能规范：禁止 offset > 5000、禁止 order by 非索引字段
- 大表查询必须带时间范围
- 流水表只允许 insert，禁止 update/delete
- 评估是否需要缓存、索引优化、游标分页
- 给出优化前后的对比说明
```

---

## 二、管理后台开发（apps/admin-web）

### 模板 D：新增管理页面

```
在 apps/admin-web 中新增 [模块名]/[实体名] 管理页面。

功能需求：
1. [如：列表展示，支持分页和搜索]
2. [如：新增/编辑（侧滑抽屉）]
3. [如：删除（确认弹窗）]
4. [如：状态切换]

页面布局：[标准 Search+Table / 左侧树筛选 / 左侧树主从 / 树形表格]

执行要求：
- 遵循目录结构：index.vue + modules/（search、operate-drawer、modal）
- 文件命名 kebab-case，组件名 PascalCase（defineOptions）
- 使用 useTable / useTableOperate / useNaiveForm
- API 命名：fetchGet[Entity]List、fetchCreate[Entity]、fetchUpdate[Entity]、fetchDelete[Entity]
- TypeScript 类型安全：禁止 any，Props/Emits 显式类型，ref/reactive 带泛型
- 类型定义在 src/typings/，使用 Api.[Module].[Entity] 格式
- 文案使用 $t() 国际化
- 样式 <style scoped>，类名 kebab-case
```

### 模板 E：前端组件开发

```
在 apps/admin-web 中开发 [组件名] 组件。

组件用途：[描述组件的使用场景]

Props：
- [prop1]: [类型] — [说明]
- [prop2]: [类型] — [说明]

Emits：
- [event1]: [说明]

执行要求：
- 全局组件放 src/components/，页面级组件放 src/pages/xx/components/
- 使用 <script setup lang="ts">，标签顺序 script → template → style
- Props/Emits 用 interface 定义，defineModel 带泛型
- 可直接编写简单组件的单元测试（Vitest + @vue/test-utils）
- 复杂 mock 场景先询问再实现
```

---

## 三、小程序/H5 开发（apps/miniapp-client）

### 模板 F：新增小程序页面

```
在 apps/miniapp-client 中新增 [页面名] 页面。

功能需求：
1. [功能1]
2. [功能2]
3. [功能3]

目标平台：[H5 / 微信小程序 / 两者都要]

执行要求：
- 页面放在 src/pages/[module]/ 下，页面级组件放 src/pages/[module]/components/
- 使用 definePage 配置页面信息（写在文件最上方）
- 平台差异必须用条件编译 #ifdef/#endif，不用运行时判断
- 优先使用 uni.xxx 统一 API
- 样式优先 rpx + UnoCSS 原子类，避免 px
- 安全区使用 env(safe-area-inset-*) 或 pb-safe
- 颜色避免 oklch、空格分隔 rgb 等新语法
- TypeScript 严格模式，禁止 any
- 页面用 uni 生命周期（onLoad/onShow），组件用 Vue3 生命周期
- 长列表使用 z-paging 或虚拟滚动
- 注意包体积：主包 < 1.5M，大图放 CDN
```

### 模板 G：小程序跨平台适配

```
将 apps/miniapp-client 中 [页面/组件名] 适配 [目标平台]。

当前状态：[目前支持的平台]
目标：[需要新增支持的平台]

差异点：
1. [如：支付方式不同]
2. [如：分享 API 不同]
3. [如：样式表现差异]

执行要求：
- 使用条件编译隔离平台差异代码
- JS/TS: // #ifdef MP-WEIXIN ... // #endif
- CSS: /* #ifdef H5 */ ... /* #endif */
- 模板: <!-- #ifdef MP-WEIXIN --> ... <!-- #endif -->
- 支持 || 组合：// #ifdef H5 || MP-WEIXIN
- 能用 uni.xxx 统一的不写条件编译
- 测试两个平台的表现
```

---

## 四、全栈功能开发（跨子项目）

### 模板 H：全栈新功能

```
开发 [功能名] 全栈功能，涉及后端 + 管理后台 [+ 小程序]。

功能描述：
[详细描述功能需求]

执行要求：

1. 后端（apps/backend）：
   - 新增 [模块] 的 CRUD 接口
   - 遵循 NestJS 后端规范（Result.ok、BusinessException、@Transactional）
   - 补充单元测试

2. 管理后台（apps/admin-web）：
   - 新增 [实体] 管理页面（Search + Table + OperateDrawer）
   - 遵循前端规范（useTable、TypeScript 类型安全、$t 国际化）
   - 类型定义在 src/typings/

3. 小程序（apps/miniapp-client）[可选]：
   - 新增 [页面名] 页面
   - 条件编译处理平台差异
   - 注意包体积和性能

工作流程：
- 先用 Spec 创建需求文档（requirements.md → design.md → tasks.md）
- 后端接口先行，前端对接
- 每个子项目遵循各自的 steering 规范
```

### 模板 I：全栈 Bug 修复

```
修复 [功能名] 的 [问题描述]，可能涉及多个子项目。

复现步骤：
1. [步骤]

排查方向：
- 后端：[可能的接口/逻辑问题]
- 前端：[可能的组件/状态问题]
- 小程序：[可能的平台兼容问题]

执行要求：
- 先定位问题所在的子项目和具体文件
- 修复时遵循对应子项目的 steering 规范
- 补充测试覆盖此 case
- 如涉及多个子项目，说明修改的关联关系
```

---

## 五、复杂任务（使用 Planning 工作流）

### 模板 J：大型功能规划

```
规划并实现 [大型功能名]。

背景：
[功能背景和业务价值]

核心需求：
1. [需求1]
2. [需求2]
3. [需求3]

执行要求：
- 使用 Spec 驱动开发：先创建 requirements.md → design.md → tasks.md
- 复杂任务使用 planning-with-files 做任务拆解（#planning-workflow）
- 初始化规划文件：powershell -ExecutionPolicy Bypass -File .kiro/scripts/init-session.ps1
- 按阶段推进，每完成一个阶段更新 task_plan.md
- 研究发现记录在 findings.md
- 错误和进度记录在 progress.md
- 遵循 3-Strike 错误协议
- 每个子项目遵循各自的 steering 规范

验收标准：
- [ ] [验收项1]
- [ ] [验收项2]
- [ ] [验收项3]
- [ ] 所有子项目代码通过 lint 和类型检查
- [ ] 补充必要的测试
```

---

## 六、使用说明

### 如何选择模板

| 场景 | 推荐模板 |
|------|----------|
| 后端新模块 | A |
| 后端 Bug | B |
| 后端性能优化 | C |
| 管理后台新页面 | D |
| 前端组件 | E |
| 小程序新页面 | F |
| 小程序跨平台 | G |
| 全栈新功能 | H |
| 全栈 Bug | I |
| 大型功能规划 | J |

### 使用方式

1. 复制对应模板
2. 替换 `[占位符]` 为实际内容
3. 删除不需要的可选部分
4. 发送给 Kiro

### 配合 Kiro 功能

- Spec 驱动：复杂功能先创建 spec（requirements → design → tasks）
- Planning：大型任务引用 #planning-workflow 启动规划工作流
- Steering：编辑对应子项目文件时，规范自动加载
- Hooks：可配置 agent hooks 自动化检查
