# 课程拼团管理前端实现指南

## 概述

本文档介绍课程拼团扩展功能的前端实现，包括排课管理和考勤管理两大模块。

## 文件结构

```
apps/admin-web/
├── src/
│   ├── service/api/
│   │   └── course-group-buy.ts              # API服务层
│   └── views/marketing/
│       ├── course-schedule/                  # 排课管理页面（独立）
│       │   └── index.vue
│       ├── course-attendance/                # 考勤管理页面（独立）
│       │   └── index.vue
│       └── course-management/                # 综合管理页面（推荐）
│           ├── index.vue                     # 主页面
│           └── modules/
│               ├── course-schedule-tab.vue   # 排课标签页
│               └── course-attendance-tab.vue # 考勤标签页
└── docs/
    └── COURSE_MANAGEMENT_GUIDE.md            # 本文档
```

## 功能模块

### 1. API服务层 (`course-group-buy.ts`)

提供4个API接口的封装：

#### 1.1 获取课程排课信息

```typescript
fetchCourseSchedules(instanceId: string): Promise<CourseSchedule[]>
```

#### 1.2 获取课程考勤信息

```typescript
fetchCourseAttendances(instanceId: string): Promise<CourseAttendance[]>
```

#### 1.3 标记学员出勤

```typescript
markAttendance(instanceId: string, data: MarkAttendanceRequest): Promise<CourseAttendance>
```

#### 1.4 获取学员出勤率

```typescript
fetchAttendanceRate(instanceId: string, memberId: string): Promise<AttendanceRate>
```

### 2. 排课管理模块

#### 功能特性

- ✅ 展示课程排课列表
- ✅ 按状态筛选（已排课/已完成/已取消）
- ✅ 统计卡片展示（总排课数、已完成、待上课、课时进度）
- ✅ 日期显示（包含星期几）
- ✅ 状态标签（带图标）
- ✅ 响应式设计

#### 数据字段

```typescript
interface CourseSchedule {
  id: string; // 排课ID
  date: string; // 上课日期
  startTime: string; // 开始时间 "09:00"
  endTime: string; // 结束时间 "17:00"
  lessons: number; // 课时数
  status: string; // 状态：SCHEDULED/COMPLETED/CANCELLED
  remark?: string; // 备注
  createTime: string; // 创建时间
}
```

#### 统计指标

- 总排课数
- 已完成数量
- 待上课数量
- 课时进度（已完成课时/总课时）

### 3. 考勤管理模块

#### 功能特性

- ✅ 展示学员考勤列表
- ✅ 按出勤状态筛选（全部/已出勤/未出勤）
- ✅ 标记学员出勤（弹窗表单）
- ✅ 查看学员出勤率（弹窗展示）
- ✅ 统计卡片展示（总记录、已出勤、未出勤、总出勤率、学员人数）
- ✅ 响应式设计

#### 数据字段

```typescript
interface CourseAttendance {
  id: string; // 考勤ID
  memberId: string; // 学员ID
  date: string; // 考勤日期
  attended: boolean; // 是否出勤
  remark?: string; // 备注
  createTime: string; // 记录时间
}
```

#### 统计指标

- 总考勤记录数
- 已出勤数量
- 未出勤数量
- 总出勤率
- 学员人数

### 4. 综合管理页面（推荐使用）

#### 特点

- 🎯 统一入口，Tab切换
- 📊 信息提示卡片
- 🎨 美观的UI设计
- 📱 响应式布局

#### 使用方式

```vue
<!-- 路由跳转 -->
<router-link
  :to="{
    path: '/marketing/course-management',
    query: { instanceId: 'xxx' },
  }"
>
  课程管理
</router-link>
```

## 使用指南

### 1. 路由配置

需要在路由配置中添加以下路由：

```typescript
// src/router/routes/index.ts
{
  path: '/marketing/course-management',
  name: 'course-management',
  component: () => import('@/views/marketing/course-management/index.vue'),
  meta: {
    title: '课程管理',
    requiresAuth: true
  }
}
```

### 2. 菜单配置

在营销模块菜单中添加入口：

```typescript
{
  label: '课程管理',
  key: 'course-management',
  icon: renderIcon('mdi-school'),
  path: '/marketing/course-management'
}
```

### 3. 从营销活动列表跳转

在营销活动列表中添加"课程管理"按钮：

```vue
<template>
  <NButton
    v-if="row.templateCode === 'COURSE_GROUP_BUY'"
    type="primary"
    ghost
    size="small"
    @click="gotoCourseManagement(row.id)"
  >
    课程管理
  </NButton>
</template>

<script setup>
function gotoCourseManagement(instanceId: string) {
  router.push({
    path: '/marketing/course-management',
    query: { instanceId }
  });
}
</script>
```

## UI设计说明

### 1. 配色方案

- **主色调**: 蓝色系（Primary）- 用于主要操作和强调
- **成功色**: 绿色系（Success）- 用于已完成、已出勤等正向状态
- **警告色**: 橙色系（Warning）- 用于待处理、待上课等中性状态
- **错误色**: 红色系（Error）- 用于已取消、未出勤等负向状态
- **紫色系**: 用于进度、统计等特殊指标

### 2. 图标使用

使用 Material Design Icons (mdi) 图标库：

- `mdi-school`: 课程/学校
- `mdi-calendar-multiple`: 排课
- `mdi-check-circle`: 完成/出勤
- `mdi-close-circle`: 取消/缺勤
- `mdi-clock-outline`: 时间
- `mdi-account`: 学员
- `mdi-chart-line`: 统计/出勤率
- `mdi-refresh`: 刷新

### 3. 卡片设计

统计卡片采用渐变背景和阴影效果：

- 悬停时阴影加深（hover:shadow-md）
- 图标使用半透明大图标作为背景装饰
- 数字使用大字号粗体突出显示

### 4. 表格设计

- 固定表头，内容区域可滚动
- 列宽自适应，重要列固定宽度
- 状态列使用彩色标签
- 操作列固定在右侧

## 开发注意事项

### 1. 类型安全

所有API接口都有完整的TypeScript类型定义，确保类型安全。

### 2. 错误处理

所有API调用都包含try-catch错误处理，并使用`window.$message`显示友好的错误提示。

### 3. 加载状态

所有异步操作都有loading状态，提升用户体验。

### 4. 数据刷新

提供手动刷新按钮，用户可以随时刷新数据。

### 5. 响应式设计

使用Grid布局和Flex布局，确保在不同屏幕尺寸下都有良好的显示效果。

## 扩展建议

### 1. 批量操作

可以添加批量标记出勤功能：

```typescript
// 批量标记出勤
async function batchMarkAttendance(records: MarkAttendanceRequest[]) {
  const promises = records.map((record) => markAttendance(instanceId.value, record));
  await Promise.all(promises);
}
```

### 2. 导出功能

可以添加导出考勤记录为Excel功能：

```typescript
import { utils, writeFile } from 'xlsx';

function exportAttendances() {
  const ws = utils.json_to_sheet(attendances.value);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, '考勤记录');
  writeFile(wb, `考勤记录_${new Date().toLocaleDateString()}.xlsx`);
}
```

### 3. 图表展示

可以使用ECharts添加出勤率趋势图：

```vue
<template>
  <div ref="chartRef" style="width: 100%; height: 300px"></div>
</template>

<script setup>
import * as echarts from 'echarts';

function renderChart() {
  const chart = echarts.init(chartRef.value);
  chart.setOption({
    // 配置项...
  });
}
</script>
```

### 4. 实时通知

可以集成WebSocket实现实时通知：

```typescript
// 监听考勤更新
socket.on('attendance:updated', (data) => {
  window.$message?.info('考勤记录已更新');
  loadAttendances();
});
```

## 测试建议

### 1. 单元测试

使用Vitest测试组件逻辑：

```typescript
import { mount } from '@vue/test-utils';
import CourseScheduleTab from './course-schedule-tab.vue';

describe('CourseScheduleTab', () => {
  it('should load schedules on mount', async () => {
    const wrapper = mount(CourseScheduleTab, {
      props: { instanceId: 'test-id' },
    });
    // 断言...
  });
});
```

### 2. E2E测试

使用Playwright测试完整流程：

```typescript
test('mark attendance flow', async ({ page }) => {
  await page.goto('/marketing/course-management?instanceId=xxx');
  await page.click('text=考勤管理');
  await page.click('text=标记出勤');
  // 填写表单...
  await page.click('text=确认标记');
  // 验证结果...
});
```

## 常见问题

### Q1: 页面加载慢怎么办？

A: 可以添加骨架屏或优化数据加载策略：

```vue
<template>
  <NSkeleton v-if="loading" :repeat="5" />
  <NDataTable v-else :data="data" />
</template>
```

### Q2: 如何处理大量数据？

A: 可以添加分页或虚拟滚动：

```vue
<NDataTable :data="data" :pagination="{ pageSize: 20 }" virtual-scroll />
```

### Q3: 如何自定义样式？

A: 使用scoped样式或UnoCSS工具类：

```vue
<style scoped>
.custom-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
```

## 总结

课程拼团管理前端已完整实现，包括：

- ✅ 完整的API服务层
- ✅ 排课管理页面
- ✅ 考勤管理页面
- ✅ 综合管理页面（推荐）
- ✅ 美观的UI设计
- ✅ 完善的错误处理
- ✅ 响应式布局

可以直接集成到现有系统中使用。
