# Prisma Seeds 目录说明

本目录包含 Prisma 数据库的种子数据脚本和相关工具，用于在开发和测试环境中快速搭建基础数据。

---

## 📁 目录结构

```
prisma/
├── seeds/
│   ├── data/       # 种子数据脚本
│   ├── reset/      # 重置脚本
│   ├── setup/      # 设置脚本
│   ├── utils/      # 工具脚本
│   └── fix/        # 修复脚本
├── migrations/     # 数据库迁移文件
├── schema.prisma   # Prisma Schema 定义
├── seed.ts         # 主种子数据入口
└── SEED_README.md  # 本文件
```

---

## 🌱 seeds/ - 业务种子脚本（按流程分阶段）

流程：**总部准备 → 系统配置 → 开通租户 → 选品配置 → C 端数据**

| 阶段 | 目录                   | 说明                                                       |
| ---- | ---------------------- | ---------------------------------------------------------- |
| 01   | `01-hq-foundation/`    | 商品分类(10+百货+素质教育)、品牌、属性、总部商品、营销模板 |
| 02   | `02-system-config/`    | 分佣配置(4%/6%)                                            |
| 03   | `03-tenants/`          | 租户、套餐、管理员                                         |
| 04   | `04-tenant-selection/` | 门店选品、积分规则、优惠券                                 |
| 05   | `05-c-end/`            | 会员(含上下级)、地址、钱包、积分、领券                     |

主入口 `seed.ts` 会先执行平台基础数据（部门/用户/角色/菜单等），再调用 `seeds/run-phases.ts` 执行上述业务阶段。

---

## 🔄 seeds/reset/ - 重置脚本

用于重置特定模块数据的脚本。

| 文件                           | 说明                           |
| ------------------------------ | ------------------------------ |
| `reset-marketing-all.ts`       | 重置所有营销数据               |
| `reset-marketing-templates.ts` | 仅重置营销模板数据             |
| `clear-business-data.ts`       | 清理业务数据，保留系统基础数据 |

**使用方式**：

```bash
npx tsx prisma/seeds/reset/reset-marketing-all.ts

# 清理业务数据（会员、订单、分佣、营销、商品等），保留租户/用户/角色/菜单
pnpm --filter @apps/backend prisma:clear-business
```

**⚠️ 警告**：重置脚本会删除现有数据，请谨慎使用！

---

## ⚙️ seeds/setup/ - 设置脚本

用于设置特定功能或环境的脚本。

| 文件                      | 说明             |
| ------------------------- | ---------------- |
| `setup-tenant-courses.ts` | 设置租户课程数据 |

**使用方式**：

```bash
npx tsx prisma/seeds/setup/setup-tenant-courses.ts
```

---

## 🛠️ seeds/utils/ - 工具脚本

通用工具脚本。

| 文件                     | 说明                               |
| ------------------------ | ---------------------------------- |
| `convert-sql-to-seed.ts` | 将 SQL 文件转换为 Prisma seed 格式 |
| `clear-store-configs.ts` | 清理门店配置数据                   |

**使用方式**：

```bash
# 转换 SQL 到 seed
npx tsx prisma/seeds/utils/convert-sql-to-seed.ts

# 清理门店配置
npx tsx prisma/seeds/utils/clear-store-configs.ts
```

---

## 🔧 seeds/fix/ - 修复脚本

用于修复数据问题的 SQL 脚本。

| 文件               | 说明             |
| ------------------ | ---------------- |
| `fix-level-id.sql` | 修复层级 ID 问题 |

**使用方式**：

```bash
# 使用 psql 执行
psql -U username -d database -f prisma/seeds/fix/fix-level-id.sql

# 或使用 Prisma
npx prisma db execute --file prisma/seeds/fix/fix-level-id.sql
```

---

## 📝 主种子数据入口

### seed.ts

主种子数据文件，包含系统初始化所需的核心数据：

1. **部门数据** (10条) - 若依科技、深圳总公司、长沙分公司等
2. **用户数据** (2条) - admin、ry
3. **角色数据** (2条) - 超级管理员、普通角色
4. **岗位数据** (4条) - 董事长、项目经理、人力资源、普通员工
5. **字典类型** (10条) - 用户性别、菜单状态、系统开关等
6. **字典数据** (29条) - 性别字典、菜单显示状态等
7. **系统配置** (6条) - 主题配置、密码配置、验证码配置等
8. **菜单数据** (85条) - 系统管理模块菜单
9. **关联关系** - 用户-角色、用户-岗位、角色-菜单、角色-部门

---

## 🚀 使用方法

### 1. 首次初始化数据库

```bash
# 推送 schema 到数据库
npm run prisma:db:push

# 运行主种子数据
npm run prisma:seed
```

### 2. 重置数据库并重新初始化

```bash
# 重置数据库并自动运行种子数据
npm run prisma:reset
```

### 3. 仅运行业务种子（不重置库）

```bash
pnpm --filter @apps/backend prisma:seed:only
```

### 4. 重置特定模块数据

```bash
# 重置营销数据
npx tsx prisma/seeds/reset/reset-marketing-all.ts

# 仅重置营销模板
npx tsx prisma/seeds/reset/reset-marketing-templates.ts
```

---

## 🔐 登录信息

初始化完成后，可以使用以下账号登录系统：

### 管理员账号

- 用户名: `admin`
- 密码: `admin123`
- 权限: 超级管理员，拥有所有权限

### 测试账号

- 用户名: `ry`
- 密码: `admin123`
- 权限: 普通角色

### 租户管理员账号（业务种子后可用）

| 租户                          | 用户名       | 密码   |
| ----------------------------- | ------------ | ------ |
| 长沙天心区服务中心 (100001)   | admin_100001 | 123456 |
| 长沙岳麓生活馆 (100002)       | admin_100002 | 123456 |
| 长沙开福区便民服务站 (100003) | admin_100003 | 123456 |
| 北京朝阳区旗舰店 (100004)     | admin_100004 | 123456 |
| 广州天河区体验中心 (100005)   | admin_100005 | 123456 |

---

## ⚠️ 注意事项

1. **密码加密**：种子数据使用 bcrypt 加密密码，默认密码为 `admin123`
2. **主键冲突**：如果表中已存在数据，某些创建操作可能会失败
3. **开发环境**：建议在开发环境使用 `prisma:reset` 命令完全重置数据库
4. **生产环境**：请谨慎使用种子数据，避免覆盖重要数据
5. **重置脚本**：重置脚本会删除现有数据，使用前请备份

---

## 📚 相关命令

| 命令                      | 说明                             |
| ------------------------- | -------------------------------- |
| `npm run prisma:generate` | 生成 Prisma Client               |
| `npm run prisma:migrate`  | 创建并应用迁移                   |
| `npm run prisma:deploy`   | 应用迁移（生产环境）             |
| `npm run prisma:seed`     | 运行主种子数据                   |
| `npm run prisma:reset`    | 重置数据库并运行种子数据         |
| `npm run prisma:studio`   | 打开 Prisma Studio               |
| `npm run prisma:db:push`  | 推送 schema 到数据库（开发环境） |

---

## 🔗 相关文档

- [Prisma 官方文档](https://www.prisma.io/docs)
- [Prisma Seeding 指南](https://www.prisma.io/docs/guides/database/seed-database)
- [项目文档](../docs/)

---

**最后更新**：2026-03-06
**维护者**：Backend Team
