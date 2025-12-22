# 演示账户功能实施指南

## 📋 功能说明

演示账户功能基于现有的 RBAC 权限系统实现，**无需修改后端代码**，仅通过配置即可完成。

### 核心特性

- ✅ **仅查看权限** - 演示账户只能查询数据，无法增删改
- ✅ **自动按钮隐藏** - 前端根据权限自动隐藏操作按钮
- ✅ **快速登录入口** - 登录页面提供演示账户快速填充
- ✅ **零代码改动** - 完全利用现有权限系统
- ✅ **易于管理** - 可随时调整演示角色权限

---

## 🚀 实施步骤

### 第一步：初始化数据库

**推荐方式：使用 TypeScript 脚本**

```bash
cd server
pnpm exec ts-node scripts/init-demo-account.ts
```

脚本会自动：
- 清理旧的演示数据
- 创建演示角色和权限
- 创建演示用户
- 分配角色和岗位

**成功输出示例：**
```
🚀 开始初始化演示账户...
📝 清理现有演示数据...
  ✓ 已删除旧的演示角色
📝 创建演示角色...
  ✓ 演示角色已创建 (ID: 6)
📝 分配查询权限...
  ✓ 已分配 52 个权限
📝 创建演示用户...
  ✓ 演示用户已创建 (ID: 3)
📝 分配角色...
  ✓ 用户角色已关联
  ✓ 用户岗位已关联
✅ 演示账户初始化完成！

==================================================
📋 账户信息：
==================================================
用户名：demo
密码：  demo123
租户：  000000
角色：  演示角色 (demo)
权限数：52 个（仅查看权限）
==================================================
```

**备用方式：SQL 脚本**

如果你安装了 psql 客户端：
```bash
PGPASSWORD=your_password psql -h 127.0.0.1 -U postgres -d nest-admin-soybean -f sql/demo-account-init.sql
```

### 第二步：验证后端

```bash
# 1. 测试演示账户登录
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -H "tenant-id: 000000" \
  -d '{"userName":"demo","password":"demo123"}'

# 应该返回：
# {
#   "code": 200,
#   "msg": "登录成功",
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   }
# }
```

测试权限：
```bash
# 2. 获取 token（从上一步响应中复制）
TOKEN="your_token_here"

# 3. 查询用户列表（应该成功 - 200）
curl http://localhost:8080/api/system/user/list \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "tenant-id: 000000"

# 4. 创建用户（应该失败 - 403 Forbidden）
curl -X POST http://localhost:8080/api/system/user \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "tenant-id: 000000" \
  -H "Content-Type: application/json" \
  -d '{"userName":"test","password":"test123"}'

# 预期返回: {"code": 403, "msg": "Forbidden resource"}
```

### 第三步：查看前端效果

前端登录页面已添加演示账户快速登录卡片。

```bash
cd admin-naive-ui
pnpm dev
```

访问 http://localhost:9527，你会看到：

**登录页面显示：**
```
┌─────────────────────────────────────────┐
│  👤  演示账户快速体验                     │
│      账号: demo / 密码: demo123           │
│      (仅查看权限)                    →   │
└─────────────────────────────────────────┘
```

点击卡片后，表单自动填充演示账户信息。

---

## 🎨 前端修改说明

### 修改文件
`admin-naive-ui/src/views/_builtin/login/modules/pwd-login.vue`

### 新增功能
1. **快速填充函数** - `handleDemoLogin()` 自动填充演示账号密码
2. **演示入口卡片** - 醒目的卡片式快速登录入口
3. **动态显示** - 填充后自动隐藏，避免重复

### 样式特性
- 渐变背景色（紫色主题）
- Hover 悬停效果
- 深色模式适配
- 响应式设计

---

## 📊 权限配置详情

### 演示角色拥有的权限

演示角色只分配了以下类型的权限：

```sql
-- 查询列表权限
system:user:list      -- 用户列表
system:role:list      -- 角色列表
system:dept:list      -- 部门列表
system:post:list      -- 岗位列表
system:menu:list      -- 菜单列表
system:dict:list      -- 字典列表
system:config:list    -- 配置列表
system:notice:list    -- 通知列表

-- 查询详情权限
system:user:query     -- 用户详情
system:role:query     -- 角色详情
system:dept:query     -- 部门详情
...

-- 导出权限
system:user:export    -- 用户导出
system:role:export    -- 角色导出
...
```

### 演示角色没有的权限

```sql
-- 禁止的操作权限
system:user:add       -- ❌ 新增用户
system:user:edit      -- ❌ 编辑用户
system:user:remove    -- ❌ 删除用户
system:user:import    -- ❌ 导入用户
system:user:resetPwd  -- ❌ 重置密码

-- 所有增删改操作都被禁止
*:add                 -- ❌ 新增
*:edit                -- ❌ 编辑
*:remove              -- ❌ 删除
*:update              -- ❌ 更新
```

---

## 🎯 使用场景

### 1. 在线演示站点
将项目部署为演示站点，提供演示账户让用户体验功能，同时保护数据不被篡改。

### 2. 产品展示
向客户展示系统功能时，使用演示账户避免误操作影响数据。

### 3. 培训教学
新员工培训时提供演示账户，让他们熟悉系统界面和流程。

### 4. 测试验证
测试人员使用演示账户验证只读场景的功能。

---

## 🔧 自定义配置

### 调整演示角色权限

如果需要调整演示角色的权限范围：

```sql
-- 1. 查看当前权限
SELECT m.menu_name, m.perms
FROM sys_role_menu rm
JOIN sys_menu m ON rm.menu_id = m.menu_id
WHERE rm.role_id = (SELECT role_id FROM sys_role WHERE role_key = 'demo')
AND m.perms IS NOT NULL;

-- 2. 添加额外权限（例如：允许导入）
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 
  (SELECT role_id FROM sys_role WHERE role_key = 'demo'),
  menu_id
FROM sys_menu 
WHERE perms = 'system:user:import';

-- 3. 删除某个权限（例如：禁止导出）
DELETE rm FROM sys_role_menu rm
JOIN sys_menu m ON rm.menu_id = m.menu_id
WHERE rm.role_id = (SELECT role_id FROM sys_role WHERE role_key = 'demo')
AND m.perms = 'system:user:export';
```

### 创建多个演示账户

可以创建不同权限级别的演示账户：

```sql
-- 创建基础演示账户（只能看用户模块）
INSERT INTO sys_user (user_name, nick_name, password, ...)
VALUES ('demo-basic', '基础演示', '$2a$10$...', ...);

-- 创建高级演示账户（可以看更多模块）
INSERT INTO sys_user (user_name, nick_name, password, ...)
VALUES ('demo-advanced', '高级演示', '$2a$10$...', ...);
```

### 修改演示账户密码

```sql
-- 修改演示账户密码
UPDATE sys_user 
SET password = '$2a$10$YOUR_NEW_ENCRYPTED_PASSWORD'
WHERE user_name = 'demo';
```

生成加密密码：
```bash
# 使用 bcrypt 在线工具生成，或运行：
node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"
```

---

## 🧪 测试验证清单

- [ ] **后端 - 登录测试**
  ```bash
  curl -X POST http://localhost:8080/api/login \
    -d '{"username":"demo","password":"demo123"}'
  ```
  
- [ ] **后端 - 查询权限测试**
  ```bash
  # 应该成功
  curl http://localhost:8080/api/system/user/list \
    -H "Authorization: Bearer ${TOKEN}"
  ```

- [ ] **后端 - 修改权限测试**
  ```bash
  # 应该失败（权限不足）
  curl -X POST http://localhost:8080/api/system/user \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"userName":"test"}'
  ```

- [ ] **前端 - 登录页面**
  - [ ] 显示演示账户卡片
  - [ ] 点击卡片后自动填充
  - [ ] 填充后卡片隐藏

- [ ] **前端 - 权限控制**
  - [ ] 查询按钮显示
  - [ ] 新增按钮隐藏
  - [ ] 编辑按钮隐藏
  - [ ] 删除按钮隐藏

---

## 🐛 常见问题

### Q1: 演示账户登录后看不到任何菜单？
**A:** 检查演示角色是否分配了菜单权限：
```sql
SELECT COUNT(*) as menu_count
FROM sys_role_menu
WHERE role_id = (SELECT role_id FROM sys_role WHERE role_key = 'demo');
```
如果为 0，重新执行初始化脚本。

### Q2: 演示账户能看到按钮但点击无效？
**A:** 这是正常的，后端已拦截，返回"权限不足"。前端会自动显示错误提示。

### Q3: 如何临时禁用演示账户？
**A:** 修改用户状态：
```sql
UPDATE sys_user SET status = '1' WHERE user_name = 'demo';
```
恢复：
```sql
UPDATE sys_user SET status = '0' WHERE user_name = 'demo';
```

### Q4: 前端卡片不显示？
**A:** 确保：
1. 前端代码已更新
2. 清除浏览器缓存
3. 重新运行 `pnpm dev`

### Q5: 如何完全删除演示账户？
**A:** 执行 SQL 脚本中的清理部分（取消注释）。

---

## 📝 维护建议

1. **定期检查** - 每月检查演示账户是否被误修改
2. **权限审计** - 定期审计演示角色的权限配置
3. **密码更新** - 定期更换演示账户密码
4. **日志监控** - 监控演示账户的操作日志
5. **数据备份** - 演示环境也需要定期备份

---

## 🎉 总结

演示账户功能已完成！主要优势：

✅ **零代码** - 完全基于配置，无需修改后端代码  
✅ **灵活** - 可随时调整权限范围  
✅ **安全** - 基于成熟的 RBAC 系统  
✅ **易用** - 前端提供快速登录入口  
✅ **可维护** - 配置清晰，易于管理  

---

**实施人员**: AI Assistant  
**实施日期**: 2025-12-22  
**版本**: v1.0.0
