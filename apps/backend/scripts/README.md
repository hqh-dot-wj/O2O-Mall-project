# 后端部署脚本目录

此目录包含后端项目的部署和配置脚本。

## 📁 文件说明

### deploy.cjs
后端自动化部署脚本，用于将构建后的 NestJS 项目部署到服务器。

**功能：**
- 构建 NestJS 项目
- 打包所有必要文件（dist、prisma、public、package.json 等）
- 上传到远程服务器
- 安装依赖
- 使用 PM2 启动/重启服务

**使用方法：**
```bash
# 部署到开发环境
pnpm run deploy:dev

# 部署到测试环境
pnpm run deploy:test

# 部署到生产环境
pnpm run deploy:prod
```

### deploy.config.cjs
部署配置文件，包含不同环境的服务器配置信息（SSH、路径、PM2 等）。

**配置项：**
- 服务器 SSH 连接信息
- 远程服务器路径
- 构建命令
- 是否包含 .env 文件
- PM2 配置

### deploy.config.example.cjs
部署配置示例文件，复制此文件并重命名为 `deploy.config.cjs`，然后填入实际的服务器配置。

### ecosystem.config.cjs
PM2 进程管理配置文件，定义了应用的运行方式。

**配置项：**
- 应用名称和命名空间
- 执行模式（fork/cluster）
- 实例数量
- 内存限制
- 自动重启策略
- 日志配置

## 🚀 快速开始

1. 复制配置示例文件：
```bash
cp scripts/deploy.config.example.cjs scripts/deploy.config.cjs
```

2. 编辑 `deploy.config.cjs`，填入服务器配置

3. 执行部署命令：
```bash
pnpm run deploy:prod
```

## 🔧 本地 PM2 管理

如果需要在本地使用 PM2 管理服务：

```bash
# 启动服务
pm2 start scripts/ecosystem.config.cjs

# 重启服务
pm2 reload scripts/ecosystem.config.cjs

# 停止服务
pm2 stop nest_admin_server

# 查看日志
pm2 logs nest_admin_server

# 监控状态
pm2 monit
```

## ⚠️ 注意事项

- 请勿将 `deploy.config.cjs` 提交到版本控制系统
- 确保服务器已安装 Node.js、pnpm 和 PM2
- 确保服务器已配置 SSH 密钥或密码认证
- 部署前请确认数据库连接配置
- 建议先在测试环境验证部署流程
- PM2 日志文件会随时间增长，建议定期清理
