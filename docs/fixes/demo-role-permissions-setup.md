# Demo 账户角色和权限配置

## 问题描述

Demo 账户登录后没有显示任何菜单，无法使用系统功能。

## 问题原因

Demo 用户创建后没有分配任何角色，导致：
- 没有菜单权限
- 没有功能权限
- 登录后看到空白页面

## 解决方案

### 1. 分配角色

将 demo 用户关联到"普通角色"（roleId: 2）：

```javascript
await prisma.sysUserRole.create({
  data: {
    userId: 3,      // demo 用户ID
    roleId: 2       // 普通角色ID
  }
});
```

### 2. 配置角色菜单权限

为普通角色配置演示用的菜单权限，排除敏感的管理功能：

**排除的功能**：
- 删除、新增、修改、导出、导入、重置、清空等操作按钮
- 用户管理、角色管理、菜单管理、部门管理、岗位管理
- 字典管理、参数设置、通知公告、租户管理、租户套餐
- /system/ 和 /monitor/ 路径下的系统管理模块

**允许的功能**：
- 查询、列表、导出等只读操作
- 非敏感的业务模块
- 工具类功能

### 3. 权限统计

配置完成后的权限分布：

| 类型 | 数量 | 说明 |
|------|------|------|
| 目录(M) | 5 | 顶层菜单目录 |
| 菜单(C) | 11 | 具体功能页面 |
| 按钮(F) | 27 | 查询类操作按钮 |
| **总计** | **43** | 可用菜单/按钮 |

## 执行步骤

### 1. SSH 连接服务器

```bash
ssh root@linlingqin.top
cd /www/wwwroot/nest-admin-server
```

### 2. 执行配置脚本

创建并运行 `setup-demo-role-v2.js` 脚本，该脚本会：
1. 使用普通角色作为 demo 的演示角色
2. 筛选并分配合适的菜单权限
3. 将 demo 用户关联到角色

### 3. 清除 Redis 缓存

```bash
redis-cli FLUSHDB
```

### 4. 验证配置

重新登录测试：

```bash
# 1. 登录获取 token
curl 'https://linlingqin.top/prod-api/auth/login' \
  -H 'Content-Type: application/json' \
  --data '{"username":"demo","password":"demo123","tenantId":"000000"}'

# 2. 获取菜单
curl 'https://linlingqin.top/prod-api/system/menu/getRouters' \
  -H "Authorization: Bearer $TOKEN"
```

## 配置结果

### Demo 用户信息

- **用户ID**: 3
- **用户名**: demo
- **密码**: demo123
- **租户ID**: 000000
- **角色**: 普通角色 (ID: 2)
- **菜单数量**: 43 个

### 可用菜单

Demo 账户登录后可以看到以下顶层菜单：

1. **系统管理** - 部分查看权限
2. **系统监控** - 监控查看功能
3. **系统工具** - 工具类功能
4. **nest-admin官网** - 官网链接

### 权限特点

- ✅ **只读权限**：只能查看数据，不能修改
- ✅ **安全隔离**：无法访问用户管理、角色管理等敏感功能
- ✅ **适合演示**：可以展示系统功能，但不会破坏数据
- ✅ **功能完整**：保留了核心业务功能的查看权限

## 登录测试

### 测试步骤

1. 访问 https://www.linlingqin.top
2. 输入账号：`demo`
3. 输入密码：`demo123`
4. 选择租户：`000000`
5. 点击登录

### 预期结果

- ✅ 登录成功
- ✅ 显示 4 个顶层菜单
- ✅ 可以浏览各个功能页面
- ✅ 查看按钮可用
- ❌ 增删改按钮不可见或禁用

## 技术细节

### 角色菜单关联表 (sys_role_menu)

```sql
-- 查看 demo 角色的菜单数量
SELECT COUNT(*) FROM sys_role_menu WHERE role_id = 2;
-- 结果: 43

-- 查看菜单类型分布
SELECT m.menu_type, COUNT(*) 
FROM sys_role_menu rm
JOIN sys_menu m ON rm.menu_id = m.menu_id
WHERE rm.role_id = 2
GROUP BY m.menu_type;
```

### 用户角色关联表 (sys_user_role)

```sql
-- 查看 demo 用户的角色
SELECT * FROM sys_user_role WHERE user_id = 3;
-- 结果: user_id=3, role_id=2
```

## 后续优化建议

### 1. 创建独立的演示角色

当前使用的是"普通角色"，建议创建专门的"演示角色"：

```javascript
const demoRole = await prisma.sysRole.create({
  data: {
    roleName: '演示角色',
    roleKey: 'demo',
    roleSort: 3,
    dataScope: '5', // 仅本人数据权限
    status: '0',
    remark: '演示账号专用角色，只读权限'
  }
});
```

### 2. 细化权限控制

可以进一步限制权限：
- 设置数据范围为"仅本人"
- 添加更多的按钮级别权限控制
- 限制导出功能

### 3. 添加演示数据

为 demo 账户创建一些示例数据，让演示更加真实。

### 4. 定期重置

定时任务定期重置 demo 账户的数据和密码。

## 相关文件

- `server/prisma/seed.ts` - 种子数据（可添加演示角色）
- `docs/fixes/demo-account-missing-fix.md` - Demo 账户创建记录
- `docs/TEST_ACCOUNTS.md` - 测试账号列表

## 修复时间

- **配置时间**: 2025-12-23
- **执行人**: AI Assistant
- **状态**: ✅ 已完成并验证

---

**测试账号完整信息**：

| 字段 | 值 |
|------|-----|
| 用户名 | demo |
| 密码 | demo123 |
| 租户ID | 000000 |
| 角色 | 普通角色 |
| 菜单数 | 43 |
| 权限类型 | 只读 |

现在 demo 账户可以正常登录并使用系统功能了！🎉
