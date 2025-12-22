# 常见问题

本页面收集了使用 Nest-Admin-Soybean 时的常见问题及解决方案。

## 安装问题

### pnpm 安装依赖失败

**问题**：运行 `pnpm install` 时报错

**解决方案**：

1. 清除缓存并重试：
```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

2. 使用淘宝镜像：
```bash
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

3. 检查 Node.js 版本：
```bash
node --version  # 应该 >= 20.19.0
```

### Prisma 客户端未生成

**问题**：`Cannot find module '@prisma/client'`

**解决方案**：
```bash
cd server
pnpm prisma:generate
```

## 数据库问题

### 数据库连接失败

**问题**：`Can't reach database server at localhost:5432`

**解决方案**：

1. 检查 PostgreSQL 是否运行：
```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

2. 检查数据库配置（`server/src/config/index.ts`）：
```typescript
db: {
  postgresql: {
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'nest-admin-soybean'
  }
}
```

3. 确认数据库已创建：
```bash
psql -U postgres -c "\l" | grep nest-admin-soybean
```

### 数据库迁移失败

**问题**：`P3009: migrate found failed migration`

**解决方案**：

1. 重置迁移：
```bash
pnpm prisma:migrate:reset
```

2. 手动清理失败的迁移：
```bash
# 查看迁移状态
pnpm prisma migrate status

# 标记迁移为已应用
pnpm prisma migrate resolve --applied "migration_name"
```

### Prisma Studio 无法启动

**问题**：端口 5555 被占用

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :5555

# 杀死进程
kill -9 <PID>

# 或使用其他端口
npx prisma studio --port 5556
```

## Redis 问题

### Redis 连接失败

**问题**：`Could not connect to Redis`

**解决方案**：

1. 检查 Redis 是否运行：
```bash
redis-cli ping  # 应返回 PONG
```

2. 检查 Redis 配置（`server/src/config/index.ts`）：
```typescript
redis: {
  host: 'localhost',
  port: 6379,
  password: '',  // 如果设置了密码
  db: 0
}
```

3. 启动 Redis：
```bash
# macOS
brew services start redis

# Linux
redis-server --daemonize yes

# Docker
docker run -d --name redis -p 6379:6379 redis:7
```

## 启动问题

### 后端启动失败

**问题**：`Error: listen EADDRINUSE: address already in use :::8080`

**解决方案**：

1. 端口被占用，杀死占用进程：
```bash
# macOS/Linux
lsof -i :8080
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

2. 或修改端口（`server/src/config/index.ts`）：
```typescript
app: {
  port: 8081  // 使用其他端口
}
```

### 前端启动失败

**问题**：前端无法访问后端 API

**解决方案**：

1. 检查后端是否运行：
```bash
curl http://localhost:8080/api/health
```

2. 检查前端 API 配置（`.env.development`）：
```ini
VITE_API_BASE_URL=http://localhost:8080/api
```

3. 检查代理配置（`admin-naive-ui/build/config/proxy.ts`）

### 热重载不生效

**问题**：修改代码后没有自动刷新

**解决方案**：

1. 检查文件监听限制（Linux）：
```bash
# 增加文件监听数量
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

2. 重启开发服务器

## 登录问题

### 登录失败：密码错误

**问题**：使用 `admin/admin123` 无法登录

**解决方案**：

1. 重置数据库：
```bash
cd server
pnpm prisma:seed
```

2. 手动重置密码：
```bash
# 使用 Prisma Studio
pnpm prisma:studio

# 或通过 SQL
psql -U postgres -d nest-admin-soybean
```

### 登录后白屏

**问题**：登录成功但页面空白

**解决方案**：

1. 检查浏览器控制台错误
2. 清除浏览器缓存和 LocalStorage
3. 检查路由权限配置

### 演示账户无法登录

**问题**：`demo/demo123` 无法登录

**解决方案**：

运行演示账户初始化脚本：
```bash
cd server
./scripts/init-demo.sh
```

## 权限问题

### 403 Forbidden

**问题**：访问 API 返回 403

**可能原因**：

1. **无权限**：用户没有对应的权限标识
```typescript
// 检查用户权限
SELECT p.permission 
FROM sys_user u
JOIN _SysRoleToSysUser ru ON u.user_id = ru.B
JOIN _SysMenuToSysRole rm ON ru.A = rm.B
JOIN sys_menu p ON rm.A = p.menu_id
WHERE u.username = 'your-username';
```

2. **演示账户**：演示账户不能执行写操作
```typescript
// 使用非演示账户或跳过检查
@NotRequireAuth()
```

3. **Token 过期**：JWT token 已过期
```bash
# 重新登录获取新 token
```

### 菜单不显示

**问题**：登录后看不到菜单

**解决方案**：

1. 检查角色是否分配了菜单权限
2. 检查菜单状态是否为启用
3. 查看浏览器控制台是否有错误

## 加密问题

### 解密失败

**问题**：登录时提示"解密失败"

**解决方案**：

1. 重新生成 RSA 密钥：
```bash
cd server
pnpm generate:keys
```

2. 确认前端获取了正确的公钥：
```typescript
// 检查 localStorage
localStorage.getItem('publicKey')
```

3. 检查加密配置是否一致

### 开发环境关闭加密

**问题**：调试时加密很不方便

**解决方案**：

编辑 `.env.development`：
```ini
VITE_ENABLE_ENCRYPT=false
```

## 构建问题

### 前端构建失败

**问题**：`pnpm build` 报错

**解决方案**：

1. 清理缓存：
```bash
rm -rf node_modules .vite dist
pnpm install
pnpm build
```

2. 检查 TypeScript 错误：
```bash
pnpm typecheck
```

3. 修复 ESLint 错误：
```bash
pnpm lint:fix
```

### 后端构建失败

**问题**：`pnpm build` 失败

**解决方案**：

1. 生成 Prisma 客户端：
```bash
pnpm prisma:generate
```

2. 检查 TypeScript 配置
3. 查看具体错误信息

## 部署问题

### PM2 启动失败

**问题**：`pm2 start` 没有反应

**解决方案**：

1. 查看日志：
```bash
pm2 logs
```

2. 检查配置文件（`ecosystem.config.cjs`）
3. 手动启动测试：
```bash
node dist/main.js
```

### Nginx 502 错误

**问题**：访问前端显示 502

**解决方案**：

1. 检查后端是否运行：
```bash
pm2 list
curl http://localhost:8080/api/health
```

2. 检查 Nginx 配置：
```bash
nginx -t
```

3. 查看 Nginx 错误日志：
```bash
tail -f /var/log/nginx/error.log
```

### HTTPS 配置问题

**问题**：HTTPS 无法访问

**解决方案**：

1. 检查证书是否正确安装
2. 检查 Nginx HTTPS 配置
3. 使用 Let's Encrypt 自动续期：
```bash
certbot renew --dry-run
```

## 性能问题

### 页面加载慢

**解决方案**：

1. 启用 Gzip 压缩
2. 使用 CDN
3. 优化图片资源
4. 启用浏览器缓存

### API 响应慢

**解决方案**：

1. 添加数据库索引
2. 使用 Redis 缓存
3. 优化查询语句
4. 启用 PM2 集群模式

### 数据库查询慢

**解决方案**：

1. 添加索引：
```prisma
@@index([tenantId, username])
```

2. 使用 Prisma 查询优化
3. 分析慢查询：
```sql
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

## 开发工具问题

### VS Code Prisma 扩展不工作

**解决方案**：

1. 安装 Prisma 扩展
2. 重启 VS Code
3. 检查 `schema.prisma` 文件格式

### ESLint 报错太多

**解决方案**：

1. 批量修复：
```bash
pnpm lint:fix
```

2. 临时禁用某些规则
3. 配置 `.eslintrc.cjs`

## 其他问题

### 找不到模块

**问题**：`Cannot find module '@/...'`

**解决方案**：

1. 检查路径别名配置（`tsconfig.json`）
2. 重启 TypeScript 服务器
3. 重启 IDE

### 类型错误

**问题**：TypeScript 类型不匹配

**解决方案**：

1. 重新生成类型：
```bash
pnpm prisma:generate
```

2. 重启 TypeScript 服务器
3. 检查类型定义文件

### Git 冲突

**问题**：合并代码时出现冲突

**解决方案**：

1. 查看冲突文件：
```bash
git status
```

2. 手动解决冲突
3. 标记为已解决：
```bash
git add .
git commit
```

## 获取帮助

如果以上方案都无法解决你的问题：

1. **查看日志**：
   - 后端：`server/logs/`
   - PM2：`pm2 logs`
   - Nginx：`/var/log/nginx/`

2. **提交 Issue**：[GitHub Issues](https://github.com/linlingqin77/Nest-Admin-Soybean/issues)

3. **查看文档**：浏览其他文档页面

4. **社区讨论**：查看项目讨论区

## 反馈问题

提交问题时请提供：

- **错误信息**：完整的错误堆栈
- **环境信息**：操作系统、Node.js 版本等
- **复现步骤**：如何重现问题
- **相关代码**：出问题的代码片段
- **截图**：如果有界面问题

这样可以帮助我们更快地定位和解决问题。
