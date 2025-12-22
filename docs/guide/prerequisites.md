# 环境要求

在开始使用 Nest-Admin-Soybean 之前，请确保你的开发环境满足以下要求。

## 软件要求

### Node.js

**版本**: >= 20.19.0

**安装方式**：

#### macOS
```bash
# 使用 Homebrew
brew install node@20

# 或使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### Linux
```bash
# 使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 或使用包管理器（Ubuntu）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Windows
下载并安装 [Node.js LTS](https://nodejs.org/)

**验证安装**：
```bash
node --version  # 应该 >= v20.19.0
npm --version
```

### pnpm

**版本**: >= 10.5.0

**安装**：
```bash
# 全局安装 pnpm
npm install -g pnpm@latest

# 验证安装
pnpm --version  # 应该 >= 10.5.0
```

**配置镜像**（可选）：
```bash
# 淘宝镜像
pnpm config set registry https://registry.npmmirror.com
```

### PostgreSQL

**版本**: >= 14

**安装方式**：

#### macOS
```bash
# 使用 Homebrew
brew install postgresql@14
brew services start postgresql@14

# 创建数据库
createdb nest-admin-soybean
```

#### Linux (Ubuntu/Debian)
```bash
# 添加 PostgreSQL 仓库
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql-14

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库
sudo -u postgres createdb nest-admin-soybean
```

#### Windows
下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)

#### Docker (推荐)
```bash
# 使用 Docker 运行 PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_DB=nest-admin-soybean \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:14
```

**验证安装**：
```bash
psql --version  # 应该 >= 14.0
```

### Redis

**版本**: >= 7

**安装方式**：

#### macOS
```bash
# 使用 Homebrew
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)
```bash
# 从源码安装
wget https://download.redis.io/redis-stable.tar.gz
tar -xzvf redis-stable.tar.gz
cd redis-stable
make
sudo make install

# 启动服务
redis-server --daemonize yes
```

#### Windows
下载 [Redis for Windows](https://github.com/microsoftarchive/redis/releases)

#### Docker (推荐)
```bash
# 使用 Docker 运行 Redis
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7
```

**验证安装**：
```bash
redis-cli ping  # 应该返回 PONG
```

## 可选软件

### Git

**安装**：
```bash
# macOS
brew install git

# Linux
sudo apt install git

# Windows
# 下载 https://git-scm.com/download/win
```

### VS Code

推荐使用 VS Code 作为开发工具。

**下载**：[Visual Studio Code](https://code.visualstudio.com/)

**推荐扩展**：
- Vue - Official
- Prisma
- ESLint
- UnoCSS
- GitLens

### PM2 (生产环境)

**安装**：
```bash
npm install -g pm2
```

### Nginx (生产环境)

**安装**：
```bash
# macOS
brew install nginx

# Linux
sudo apt install nginx

# 验证
nginx -v
```

## 使用 Docker Compose

如果你熟悉 Docker，可以使用 Docker Compose 一键启动所有依赖服务。

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    container_name: nest-admin-postgres
    environment:
      POSTGRES_DB: nest-admin-soybean
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7
    container_name: nest-admin-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

启动服务：
```bash
docker-compose up -d
```

停止服务：
```bash
docker-compose down
```

## 系统要求

### 开发环境

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 操作系统 | macOS 10.15+<br>Windows 10+<br>Ubuntu 20.04+ | 最新版本 |
| CPU | 2 核 | 4 核以上 |
| 内存 | 4 GB | 8 GB 以上 |
| 磁盘 | 20 GB | 50 GB SSD |

### 生产环境

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 操作系统 | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |
| CPU | 2 核 | 4 核以上 |
| 内存 | 4 GB | 8 GB 以上 |
| 磁盘 | 40 GB | 100 GB SSD |
| 带宽 | 5 Mbps | 10 Mbps 以上 |

## 配置数据库

### 创建数据库

```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE "nest-admin-soybean";

# 创建用户（可选）
CREATE USER nest_admin WITH PASSWORD 'your_password';

# 授予权限
GRANT ALL PRIVILEGES ON DATABASE "nest-admin-soybean" TO nest_admin;

# 退出
\q
```

### 配置连接

编辑 `server/src/config/index.ts`：

```typescript
export default {
  db: {
    postgresql: {
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'nest-admin-soybean'
    }
  }
}
```

## 配置 Redis

### 基本配置

默认 Redis 配置通常无需修改，如需自定义：

编辑 `server/src/config/index.ts`：

```typescript
export default {
  redis: {
    host: 'localhost',
    port: 6379,
    password: '',  // 如果设置了密码
    db: 0
  }
}
```

### Redis 持久化

编辑 Redis 配置文件（通常在 `/etc/redis/redis.conf`）：

```conf
# 启用 AOF 持久化
appendonly yes
appendfsync everysec

# 启用 RDB 快照
save 900 1
save 300 10
save 60 10000
```

## 端口配置

确保以下端口未被占用：

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| 前端开发服务器 | 9527 | Vite dev server |
| 后端 API | 8080 | NestJS 应用 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Nginx | 80/443 | Web 服务器 |
| Prisma Studio | 5555 | 数据库管理 |

**检查端口占用**：
```bash
# macOS/Linux
lsof -i :8080

# Windows
netstat -ano | findstr :8080
```

## 防火墙配置

### 开发环境

通常无需配置防火墙。

### 生产环境

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# 内部服务端口不要对外开放
# PostgreSQL (5432) 和 Redis (6379) 只允许本地访问
```

## 环境变量

### 开发环境

**后端** (`.env.development`)：
```ini
NODE_ENV=development
```

**前端** (`.env.development`)：
```ini
VITE_API_BASE_URL=http://localhost:8080/api
VITE_PORT=9527
VITE_ENABLE_ENCRYPT=true
```

### 生产环境

**后端** (`.env.production`)：
```ini
NODE_ENV=production
```

**前端** (`.env.production`)：
```ini
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_ENABLE_ENCRYPT=true
```

## 验证环境

运行以下命令验证环境配置：

```bash
# 检查 Node.js
node --version

# 检查 pnpm
pnpm --version

# 检查 PostgreSQL
psql --version
psql -U postgres -c "SELECT version();"

# 检查 Redis
redis-cli ping

# 检查 Git
git --version
```

所有命令都应该成功执行。

## 故障排除

### Node.js 版本过低

```bash
# 使用 nvm 升级
nvm install 20
nvm use 20
nvm alias default 20
```

### PostgreSQL 连接失败

1. 检查服务是否运行：
```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql
```

2. 检查防火墙
3. 检查 `pg_hba.conf` 配置

### Redis 连接失败

1. 检查服务是否运行：
```bash
redis-cli ping
```

2. 检查配置文件
3. 检查是否设置了密码

### pnpm 安装失败

```bash
# 清除缓存
pnpm store prune

# 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 重新安装
pnpm install
```

## 下一步

环境准备完成后，继续：

- [快速开始](/guide/quick-start) - 启动项目
- [开始开发](/development/getting-started) - 开始开发
- [部署指南](/deployment/overview) - 部署到生产环境
