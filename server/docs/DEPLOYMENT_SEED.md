# 部署种子数据说明

## 问题背景

部署到线上环境后，发现没有租户管理等菜单，原因是：

1. 部署脚本只运行了数据库迁移（`prisma migrate deploy`）或同步（`prisma db push`）
2. **没有导入种子数据**（seed），导致数据库中缺少菜单、角色等初始数据

## 解决方案

### 1. 部署脚本增强（v2.0 新增功能）

在 `scripts/deploy.config.cjs` 中新增 `runSeed` 配置项：

```javascript
module.exports = {
  prod: {
    // ... 其他配置
    runSeed: false,  // 是否运行种子数据（首次部署或需要重置数据时使用，谨慎！）
  }
}
```

**使用场景：**
- ✅ **首次部署**：设置 `runSeed: true`，自动导入菜单、角色等初始数据
- ✅ **数据重置**：需要重新导入基础数据时
- ❌ **日常更新**：保持 `runSeed: false`，避免覆盖生产数据

### 2. 手动运行 Seed（适用于已部署环境）

如果已经部署但缺少数据，可以手动 SSH 到服务器运行：

```bash
# 方法1：从本地通过 SSH 执行
ssh root@your-server-ip "cd /your/project/path && pnpm run prisma:seed:only"

# 方法2：登录服务器后执行
ssh root@your-server-ip
cd /your/project/path
pnpm run prisma:seed:only
```

### 3. 可用的 Seed 命令

```bash
# 仅导入种子数据（不重置数据库）- 推荐用于生产环境
pnpm run prisma:seed:only

# 完全重置数据库并导入种子数据（会删除所有数据！）- 仅开发环境
pnpm run prisma:seed

# 重置迁移历史并导入种子数据
pnpm run prisma:reset
```

## 种子数据包含内容

根据 `prisma/seed.ts`，种子数据包括：

- ✅ 租户套餐（SysTenantPackage）
- ✅ 租户信息（SysTenant）- 默认超级管理员租户（000000）
- ✅ 客户端配置（SysClient）- PC 和 APP 客户端
- ✅ 字典类型和数据（SysDictType、SysDictData）
- ✅ 菜单数据（SysMenu）- **包括租户管理菜单（menuId: 118, 119）**
- ✅ 角色数据（SysRole）- 超级管理员和普通角色
- ✅ 部门数据（SysDept）
- ✅ 岗位数据（SysPost）
- ✅ 用户数据（SysUser）- admin 和普通用户
- ✅ 角色菜单关联（SysRoleMenu）
- ✅ 角色部门关联（SysRoleDept）
- ✅ 用户角色关联（SysUserRole）
- ✅ 用户岗位关联（SysUserPost）

## 部署最佳实践

### 首次部署流程

1. **配置环境变量**
   ```bash
   # 确保 .env.production 配置正确
   cp .env.example .env.production
   # 编辑数据库连接等配置
   ```

2. **修改部署配置**
   ```javascript
   // scripts/deploy.config.cjs
   {
     runMigration: true,  // 运行迁移
     dbPush: false,       // 首次部署建议用 migration
     runSeed: true,       // ⚠️ 首次部署时开启
   }
   ```

3. **执行部署**
   ```bash
   pnpm run deploy:prod
   ```

4. **部署后验证**
   - 登录系统检查菜单是否正常显示
   - 确认租户管理、租户套餐管理等菜单可见
   - 测试基础功能

### 日常更新流程

```javascript
// scripts/deploy.config.cjs
{
  runMigration: true,   // 有数据库变更时开启
  dbPush: false,        // 生产环境建议用 migration
  runSeed: false,       // ⚠️ 日常更新关闭，避免数据覆盖
}
```

## 注意事项

⚠️ **重要警告：**

1. **生产环境慎用 seed**：`prisma:seed` 会重置数据库，删除所有数据！
2. **使用 seed:only**：生产环境只用 `prisma:seed:only`，它只插入数据，不删除
3. **数据冲突**：如果数据已存在，seed 会因为主键冲突而失败（这是好事，保护了数据）
4. **备份优先**：任何生产环境数据操作前，务必备份数据库

## 故障排查

### 问题1：菜单不显示

**症状：** 登录后看不到租户管理等菜单

**原因：** 缺少种子数据

**解决：**
```bash
ssh root@your-server "cd /path/to/project && pnpm run prisma:seed:only"
```

### 问题2：Seed 执行失败

**可能原因：**
- 数据已存在（主键冲突）- 正常，说明数据已导入
- 数据库连接失败 - 检查 .env 配置
- Prisma Client 未生成 - 运行 `pnpm exec prisma generate`

### 问题3：角色没有菜单权限

**检查：**
1. 确认菜单数据已导入（SysMenu 表）
2. 确认角色菜单关联已导入（SysRoleMenu 表）
3. 超级管理员（roleKey: 'admin'）应该有所有权限

## 相关文件

- `prisma/seed.ts` - 种子数据脚本
- `scripts/deploy.cjs` - 部署脚本（包含 seed 步骤）
- `scripts/deploy.config.cjs` - 部署配置
- `package.json` - Seed 命令定义

## 更新历史

- **2025-12-16**: 添加 `runSeed` 配置项到部署脚本
- **2025-12-16**: 首次解决线上环境缺少菜单数据问题
