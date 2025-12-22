# 部署概述

Nest-Admin-Soybean 支持多种部署方式，本文档将介绍各种部署方案和最佳实践。

## 部署架构

### 标准部署架构

```
┌─────────────────────────────────────────────┐
│              Nginx (反向代理)                │
│  - 静态文件服务                              │
│  - API 请求转发                              │
│  - HTTPS/SSL                                │
│  - Gzip 压缩                                │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ 前端静态文件 │  │  NestJS API  │
│             │  │  (PM2 管理)  │
└─────────────┘  └──────┬───────┘
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
       ┌─────────────┐    ┌─────────────┐
       │ PostgreSQL  │    │   Redis     │
       │  (数据存储)  │    │  (缓存)     │
       └─────────────┘    └─────────────┘
```

## 部署方式

### 1. 传统服务器部署

**适用场景**：
- 单机部署
- 小型应用
- 预算有限

**优点**：
- 部署简单
- 成本低
- 易于维护

**缺点**：
- 扩展性差
- 单点故障风险

👉 [服务器部署指南](/deployment/environment)

### 2. Docker 容器化部署

**适用场景**：
- 微服务架构
- 需要快速部署
- 环境一致性要求高

**优点**：
- 环境隔离
- 快速部署
- 易于扩展

**缺点**：
- 学习成本
- 资源开销

👉 [Docker 部署指南](/deployment/docker)

### 3. Kubernetes 集群部署

**适用场景**：
- 大规模应用
- 高可用要求
- 自动化运维

**优点**：
- 自动扩容
- 自愈能力
- 负载均衡

**缺点**：
- 复杂度高
- 运维成本高

👉 [K8s 部署指南](/deployment/cicd)

### 4. Serverless 部署

**适用场景**：
- 流量不稳定
- 按需付费
- 无运维需求

**优点**：
- 自动扩展
- 按量付费
- 零运维

**缺点**：
- 冷启动
- 功能限制

## 环境要求

### 生产环境

| 组件 | 版本要求 | 推荐配置 |
|------|---------|---------|
| Node.js | >= 20.19.0 | 20.x LTS |
| pnpm | >= 10.5.0 | 最新版 |
| PostgreSQL | >= 14 | 14.x 或 15.x |
| Redis | >= 7 | 7.x |
| Nginx | >= 1.20 | 最新稳定版 |
| PM2 | >= 5.0 | 最新版 |

### 服务器配置

| 规模 | CPU | 内存 | 磁盘 | 带宽 |
|------|-----|------|------|------|
| 小型（< 100 用户） | 2 核 | 4 GB | 40 GB | 5 Mbps |
| 中型（100-1000 用户） | 4 核 | 8 GB | 100 GB | 10 Mbps |
| 大型（> 1000 用户） | 8+ 核 | 16+ GB | 200+ GB | 20+ Mbps |

## 部署准备

### 1. 代码准备

```bash
# 克隆仓库
git clone https://github.com/linlingqin77/Nest-Admin-Soybean.git
cd Nest-Admin-Soybean

# 切换到生产分支
git checkout main
git pull origin main
```

### 2. 环境变量配置

#### 后端配置

编辑 `server/.env.production`：

```ini
# 环境
NODE_ENV=production

# 数据库（通过 config/index.ts 管理）
# 在 config/index.ts 中配置数据库连接
```

#### 前端配置

编辑 `admin-naive-ui/.env.production`：

```ini
# API 地址
VITE_API_BASE_URL=https://api.yourdomain.com/api

# 是否启用加密
VITE_ENABLE_ENCRYPT=true
```

### 3. 数据库准备

```bash
# 创建数据库
createdb nest-admin-soybean

# 运行迁移
cd server
pnpm prisma:migrate

# 初始化数据
pnpm prisma:seed
```

### 4. 生成密钥

```bash
cd server
pnpm generate:keys
```

## 构建项目

### 后端构建

```bash
cd server
pnpm install --prod
pnpm build
```

生成的文件位于 `server/dist/`

### 前端构建

```bash
cd admin-naive-ui
pnpm install
pnpm build
```

生成的文件位于 `admin-naive-ui/dist/`

## 快速部署脚本

项目提供了自动化部署脚本。

### 1. 配置部署参数

复制配置模板：

```bash
# 后端
cp server/scripts/deploy.config.example.cjs server/scripts/deploy.config.cjs

# 前端
cp admin-naive-ui/scripts/deploy.config.example.cjs admin-naive-ui/scripts/deploy.config.cjs
```

编辑配置文件：

```javascript
module.exports = {
  // 服务器配置
  server: {
    host: '192.168.1.100',
    port: 22,
    username: 'root',
    password: 'your-password',
    // 或使用私钥
    privateKey: require('fs').readFileSync('/path/to/private-key')
  },
  
  // 部署路径
  deployPath: '/www/nest-admin',
  
  // 备份
  backup: true,
  backupPath: '/www/backup'
}
```

### 2. 执行部署

```bash
# 部署后端
cd server
pnpm deploy:prod

# 部署前端
cd admin-naive-ui
pnpm deploy:prod
```

## 手动部署步骤

### 1. 上传文件

```bash
# 打包项目
tar -czf nest-admin.tar.gz dist/ prisma/ package.json

# 上传到服务器
scp nest-admin.tar.gz user@server:/path/to/deploy/

# SSH 到服务器
ssh user@server

# 解压文件
cd /path/to/deploy
tar -xzf nest-admin.tar.gz
```

### 2. 安装依赖

```bash
# 后端
cd server
pnpm install --prod

# 生成 Prisma 客户端
pnpm prisma:generate
```

### 3. 启动服务

使用 PM2 管理进程：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. 配置 Nginx

```nginx
# /etc/nginx/sites-available/nest-admin
server {
    listen 80;
    server_name yourdomain.com;

    # 前端静态文件
    location / {
        root /www/nest-admin/admin-naive-ui/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/nest-admin /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 健康检查

部署完成后验证服务：

```bash
# 检查后端健康
curl http://localhost:8080/api/health

# 检查前端访问
curl http://yourdomain.com

# 查看 PM2 进程
pm2 list

# 查看日志
pm2 logs
```

## 部署检查清单

部署前检查：

- [ ] 代码已提交到 Git
- [ ] 环境变量已配置
- [ ] 数据库已准备
- [ ] 密钥已生成
- [ ] 构建成功
- [ ] 测试通过

部署后检查：

- [ ] 服务正常运行
- [ ] 健康检查通过
- [ ] 前端可访问
- [ ] API 可调用
- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] 日志正常输出
- [ ] 监控数据正常

## 常见问题

### 1. 构建失败

**原因**：依赖安装不完整

**解决**：
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 2. 端口被占用

**解决**：
```bash
# 查找占用端口的进程
lsof -i :8080

# 杀死进程
kill -9 <PID>
```

### 3. 权限问题

**解决**：
```bash
# 修改文件所有者
chown -R www-data:www-data /www/nest-admin

# 修改文件权限
chmod -R 755 /www/nest-admin
```

### 4. Nginx 502 错误

**原因**：后端服务未启动

**解决**：
```bash
# 检查后端服务
pm2 list
pm2 logs

# 重启服务
pm2 restart all
```

## 性能优化

### 1. 启用 Gzip 压缩

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml+rss 
           application/json;
```

### 2. 静态资源缓存

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. PM2 集群模式

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'nest-admin',
    script: './dist/main.js',
    instances: 'max',  // 使用所有 CPU 核心
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
```

## 安全加固

### 1. HTTPS 配置

使用 Let's Encrypt 免费证书：

```bash
certbot --nginx -d yourdomain.com
```

### 2. 防火墙配置

```bash
# 只开放必要端口
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### 3. 定期更新

```bash
# 系统更新
apt update && apt upgrade

# 依赖更新
pnpm update
```

## 下一步

- [环境准备](/deployment/environment) - 详细环境配置
- [构建项目](/deployment/build) - 构建优化技巧
- [Docker 部署](/deployment/docker) - 容器化部署
- [监控告警](/deployment/monitoring) - 生产监控方案
