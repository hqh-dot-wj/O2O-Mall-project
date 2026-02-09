# 营销活动预览功能说明

## 功能概述

门店营销活动配置器现在支持两种预览模式，帮助运营人员更直观地查看营销活动的展示效果。

## 预览模式

### 1. 卡片预览（默认）
- **用途**: 查看营销活动卡片的独立展示效果
- **页面**: `apps/miniapp-client/src/pages/preview/card.vue`
- **适用场景**: 
  - 快速预览活动配置
  - 查看活动标签、价格、特性等基础信息
  - 验证活动规则配置是否正确

### 2. 商品详情预览（新增）
- **用途**: 查看营销活动在真实商品详情页的展示效果
- **页面**: `apps/miniapp-client/src/pages/preview/product-detail.vue`
- **适用场景**:
  - 查看活动在商品详情页的实际效果
  - 验证活动价格与原价的对比展示
  - 查看活动标签在商品页面的位置和样式
  - 预览多规格商品的活动展示

## 使用方法

### 配置营销活动时

1. 打开"营销商品管理"页面
2. 点击"生产营销商品"或"配置"按钮
3. 在配置抽屉中：
   - **选择玩法模板**（如拼团、秒杀等）
   - **选择商品**（点击"选择"按钮）
   - **配置规则参数**（价格、时间等）

### 切换预览模式

在配置抽屉右侧预览区域：

- **卡片预览**: 默认模式，实时展示活动卡片
- **商品详情预览**: 点击"商品详情预览"按钮切换
  - ⚠️ 需要先选择商品后才能使用此模式

### 实时预览

- 左侧表单的任何修改都会**实时同步**到右侧预览
- 支持的实时更新内容：
  - 活动价格
  - 活动规则（拼团人数、有效期、课时等）
  - 活动类型标签
  - 库存模式

## 技术实现

### 通信机制

使用 `postMessage` 实现 Admin 端与小程序 H5 页面的跨域通信：

```typescript
// Admin 端发送
syncForm(model) // 通过 usePreview Hook

// 小程序端接收
window.addEventListener('message', handleMessage)
```

### 数据流

```
配置表单 (Admin)
    ↓ watch
usePreview Hook
    ↓ postMessage
预览页面 (H5)
    ↓ 渲染
实时预览效果
```

### 关键文件

- **配置抽屉**: `apps/admin-web/src/views/store/marketing/activity/modules/config-operate-drawer.vue`
- **预览 Hook**: `apps/admin-web/src/hooks/business/usePreview.ts`
- **卡片预览**: `apps/miniapp-client/src/pages/preview/card.vue`
- **商品详情预览**: `apps/miniapp-client/src/pages/preview/product-detail.vue`

## 注意事项

1. **商品详情预览需要先选择商品**
   - 如果未选择商品，"商品详情预览"按钮会被禁用

2. **编辑模式的限制**
   - 编辑已有配置时，商品信息可能不完整
   - 建议重新选择商品以获得完整的预览效果

3. **开发环境配置**
   - 小程序需要在 `localhost:9000` 运行
   - Admin 端在不同端口运行
   - 生产环境使用相对路径

## 未来优化方向

1. **编辑模式增强**
   - 自动加载商品完整信息
   - 调用商品详情 API 获取实时数据

2. **预览模式扩展**
   - 添加列表预览模式
   - 添加分享卡片预览

3. **交互优化**
   - 支持在预览中直接点击切换规格
   - 支持预览不同设备尺寸（iPhone、Android）

## 相关文档

- [营销活动配置指南](./COURSE_MANAGEMENT_GUIDE.md)
- [前端实现总结](./COURSE_FRONTEND_IMPLEMENTATION_SUMMARY.md)
