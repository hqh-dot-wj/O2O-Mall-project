# 数据库迁移指南 - 添加商品关联字段

## 修改内容

为 `PlayTemplate` 模型添加了商品/规格关联字段：
- `productId` - 关联的商品ID
- `skuId` - 关联的规格ID  
- `productName` - 商品名称（用于显示）

## 遇到的问题

如果执行 `npm run prisma:migrate` 时遇到以下错误：
```
Error: P3006
Migration `20260128104031_add_performance_indexes` failed to apply cleanly to the shadow database.
```

这是因为之前的迁移文件与当前 schema 状态不一致。

## 解决方案

### 方案1：使用 db push（推荐，快速）

这个方法会直接将 schema 同步到数据库，不创建迁移文件：

```bash
cd apps/backend

# 直接推送 schema 到数据库
npx prisma db push
```

优点：
- 快速，不需要处理迁移历史
- 适合开发环境
- 会自动添加缺失的字段

缺点：
- 不会生成迁移文件
- 不适合生产环境

### 方案2：重置迁移历史（开发环境）

如果你的数据可以重新生成，可以完全重置：

```bash
cd apps/backend

# 重置数据库并重新应用所有迁移
npm run prisma:reset

# 这会：
# 1. 删除所有数据
# 2. 重新应用所有迁移
# 3. 运行 seed 脚本
```

⚠️ **警告**：这会删除所有数据！

### 方案3：修复有问题的迁移文件（生产环境）

如果是生产环境或数据不能丢失：

```bash
cd apps/backend

# 1. 标记迁移为已解决
npx prisma migrate resolve --applied 20260128104031_add_performance_indexes

# 2. 创建新的迁移
npx prisma migrate dev --name add_product_fields_to_play_template
```

### 方案4：删除有问题的迁移并重新创建（开发环境）

```bash
cd apps/backend

# 1. 删除有问题的迁移文件夹
# Windows:
rmdir /s /q prisma\migrations\20260128104031_add_performance_indexes

# 2. 重新创建迁移
npx prisma migrate dev --name add_product_fields_to_play_template
```

## 推荐执行步骤（开发环境）

最简单的方式是使用 `db push`：

```bash
cd apps/backend
npx prisma db push
npx prisma generate
```

然后重启后端服务：

```bash
npm run start:dev
```

## 验证

迁移完成后，可以通过以下方式验证：

### 1. 检查数据库表结构

连接到 PostgreSQL 数据库：
```bash
psql -h 127.0.0.1 -p 5432 -U postgres -d nest-admin-soybean
```

查看表结构：
```sql
\d mkt_play_template
```

应该能看到新增的字段：
- product_id
- sku_id
- product_name

### 2. 重启后端服务

```bash
cd apps/backend
npm run start:dev
```

### 3. 测试前端功能

- 打开模板管理页面
- 新增/编辑模板
- 选择商品/规格
- 保存后刷新页面，查看是否正确回显

## 已修改的文件

### 后端
- `apps/backend/prisma/schema.prisma` - 数据库模型
- `apps/backend/src/module/marketing/template/vo/template.vo.ts` - 响应VO
- `apps/backend/src/module/marketing/template/dto/template.dto.ts` - 请求DTO

### 前端
- `apps/admin-web/src/typings/api/marketing.api.d.ts` - TypeScript类型定义
- `apps/admin-web/src/views/marketing/template/modules/template-operate-drawer.vue` - 抽屉组件

## 注意事项

1. 这些字段都是可选的（nullable），不会影响现有数据
2. 如果是生产环境，建议先在测试环境验证
3. 迁移前建议备份数据库
4. `db push` 适合开发环境快速迭代，生产环境应使用 `migrate deploy`

