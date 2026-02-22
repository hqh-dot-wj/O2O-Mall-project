# Config 模块说明文档

## 📋 概述

`src/config` 是 NestJS 后端应用的配置管理模块，提供类型安全、可验证、环境隔离的配置系统。采用 **环境变量为单一数据源** 的设计理念，通过 class-validator 和 class-transformer 确保配置的正确性和类型安全。

**核心特性**：

- ✅ 类型安全：强类型配置，IDE 自动补全
- ✅ 自动验证：启动时验证配置，失败则阻止启动
- ✅ 环境隔离：支持 development、test、production 环境
- ✅ 敏感信息保护：自动脱敏密码、密钥等敏感字段
- ✅ 嵌套配置：支持多层级配置结构
- ✅ 全局可用：通过 @Global 装饰器在任何模块中注入

---

## 📁 目录结构

```
config/
├── types/                      # 配置类型定义
│   ├── index.ts                # 配置类型导出
│   ├── app.config.ts           # 应用配置（端口、日志、文件）
│   ├── database.config.ts      # 数据库配置
│   ├── redis.config.ts         # Redis 配置
│   ├── jwt.config.ts           # JWT 配置
│   ├── tenant.config.ts        # 租户配置
│   ├── crypto.config.ts        # 加密配置
│   ├── cos.config.ts           # 腾讯云 COS 配置
│   ├── permission.config.ts    # 权限配置
│   ├── generator.config.ts     # 代码生成器配置
│   ├── user.config.ts          # 用户配置
│   ├── client.config.ts        # 客户端配置
│   └── wechat.config.ts        # 微信配置
├── index.ts                    # 配置工厂函数（主入口）
├── app-config.module.ts        # 配置模块
├── app-config.service.ts       # 配置服务（类型安全访问）
├── config.transformer.ts       # 配置转换器（验证）
├── env.validation.ts           # 环境变量验证
├── config-example.service.ts   # 使用示例
└── template.yml                # 配置模板
```

---

## 🔧 核心组件详解

### 1. 配置工厂函数 (`index.ts`)

**职责**：从环境变量构建完整配置对象

**设计模式**：工厂模式 + 构建器模式

**核心流程**：

```typescript
环境变量 → 类型转换 → 默认值填充 → 配置验证 → 返回配置对象
```

**关键代码**：

```typescript
export default () => {
  const rawConfig = {
    app: {
      env: process.env.NODE_ENV || 'development',
      port: num(process.env.APP_PORT, 8080),
      prefix: process.env.APP_PREFIX || '/api',
      logger: { ... },
      file: { ... },
    },
    db: { ... },
    redis: { ... },
    // ...
  };

  // 应用配置转换器进行类型验证
  const validatedConfig = ConfigTransformer.transform(rawConfig);
  return validatedConfig;
};
```

**辅助函数**：

- `bool(val, fallback)` - 布尔值转换
- `num(val, fallback)` - 数字转换
- `json(val, fallback)` - JSON 转换

**环境变量命名规范**：

- 应用配置：`APP_*`
- 数据库配置：`DB_*`
- Redis 配置：`REDIS_*`
- JWT 配置：`JWT_*`
- 租户配置：`TENANT_*`
- 日志配置：`LOG_*`
- 文件配置：`FILE_*`

---

### 2. 配置服务 (`app-config.service.ts`)

**职责**：提供类型安全的配置访问接口

**核心特性**：

- 强类型 getter 方法
- IDE 自动补全
- 环境判断方法
- 向后兼容的字符串路径访问

**使用示例**：

```typescript
@Injectable()
export class UserService {
  constructor(private readonly config: AppConfigService) {}

  async create() {
    // ✅ 类型安全，IDE 自动补全
    const port = this.config.app.port; // number
    const dbHost = this.config.db.postgresql.host; // string
    const redisDb = this.config.redis.db; // number

    // 环境判断
    if (this.config.isProduction) {
      // 生产环境逻辑
    }

    // 租户配置
    if (this.config.tenant.enabled) {
      // 多租户逻辑
    }
  }
}
```

**可用配置访问器**：
| Getter | 返回类型 | 说明 |
|--------|---------|------|
| `config.app` | `AppConfig` | 应用配置 |
| `config.db` | `DatabaseConfig` | 数据库配置 |
| `config.redis` | `RedisConfig` | Redis 配置 |
| `config.jwt` | `JwtConfig` | JWT 配置 |
| `config.tenant` | `TenantConfig` | 租户配置 |
| `config.crypto` | `CryptoConfig` | 加密配置 |
| `config.cos` | `CosConfig` | COS 配置 |
| `config.perm` | `PermissionConfig` | 权限配置 |
| `config.gen` | `GeneratorConfig` | 代码生成器配置 |
| `config.user` | `UserConfig` | 用户配置 |
| `config.client` | `ClientConfig` | 客户端配置 |
| `config.wechat` | `WechatConfig` | 微信配置 |

**环境判断方法**：

```typescript
config.isProduction; // boolean
config.isDevelopment; // boolean
config.isTest; // boolean
```

---

### 3. 配置转换器 (`config.transformer.ts`)

**职责**：将原始配置对象转换为强类型实例并验证

**核心方法**：

#### `transform(rawConfig)` - 转换并验证

```typescript
const validatedConfig = ConfigTransformer.transform(rawConfig);
```

**验证流程**：

1. 使用 `class-transformer` 转换为类实例
2. 使用 `class-validator` 验证所有字段
3. 验证失败抛出详细错误信息
4. 返回类型安全的配置对象

#### `printSafe(config)` - 安全打印

```typescript
const safeStr = ConfigTransformer.printSafe(config);
console.log(safeStr); // 敏感信息已脱敏
```

**自动脱敏字段**：

- `db.postgresql.password` → `******`
- `redis.password` → `******`
- `jwt.secretkey` → `******`
- `crypto.rsaPrivateKey` → `******`
- `cos.secretKey` → `******`

---

### 4. 环境变量验证 (`env.validation.ts`)

**职责**：在应用启动时验证环境变量

**验证规则**：

```typescript
class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string;

  @IsString()
  DATABASE_URL: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  APP_PORT?: number;

  @IsOptional()
  @IsString()
  @MinLength(16)
  JWT_SECRET?: string;

  @IsOptional()
  @Matches(/^\d+[smhd]$/)
  JWT_EXPIRES_IN?: string;
}
```

**验证装饰器**：
| 装饰器 | 用途 | 示例 |
|--------|------|------|
| `@IsString()` | 字符串验证 | `DB_HOST` |
| `@IsNumber()` | 数字验证 | `APP_PORT` |
| `@IsBoolean()` | 布尔值验证 | `TENANT_ENABLED` |
| `@IsIn([...])` | 枚举验证 | `NODE_ENV` |
| `@IsOptional()` | 可选字段 | `REDIS_PASSWORD` |
| `@Min() / @Max()` | 数值范围 | `APP_PORT: 1-65535` |
| `@MinLength()` | 最小长度 | `JWT_SECRET: ≥16` |
| `@Matches()` | 正则匹配 | `JWT_EXPIRES_IN: 1h, 30m` |

**验证失败示例**：

```
环境变量验证失败:
  - APP_PORT: must not be greater than 65535
  - JWT_SECRET: must be longer than or equal to 16 characters
  - NODE_ENV: must be one of the following values: development, test, production

请检查 .env.development 文件
```

---

### 5. 配置类型定义 (`types/`)

**职责**：定义所有配置的类型结构

#### 主配置类 (`types/index.ts`)

```typescript
export class Configuration {
  @ValidateNested()
  @Type(() => AppConfig)
  app: AppConfig;

  @ValidateNested()
  @Type(() => DatabaseConfig)
  db: DatabaseConfig;

  // ... 其他配置
}
```

#### 应用配置 (`types/app.config.ts`)

```typescript
export class AppConfig {
  @IsIn(['development', 'test', 'production'])
  env: string;

  @IsString()
  prefix: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ValidateNested()
  @Type(() => LoggerConfig)
  logger: LoggerConfig;

  @ValidateNested()
  @Type(() => FileConfig)
  file: FileConfig;
}
```

#### 日志配置

```typescript
export class LoggerConfig {
  @IsString()
  dir: string; // 日志目录

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
  level: string; // 日志级别

  @IsBoolean()
  prettyPrint: boolean; // 美化输出

  @IsBoolean()
  toFile: boolean; // 写入文件

  @IsString({ each: true })
  excludePaths: string[]; // 排除路径

  @IsString({ each: true })
  sensitiveFields: string[]; // 敏感字段
}
```

#### 文件配置

```typescript
export class FileConfig {
  @IsBoolean()
  isLocal: boolean; // 是否本地存储

  @IsString()
  location: string; // 存储位置

  @IsUrl({ require_tld: false })
  domain: string; // 访问域名

  @IsString()
  serveRoot: string; // 服务根路径

  @IsNumber()
  @Min(1)
  @Max(200)
  maxSize: number; // 最大文件大小（MB）

  @IsBoolean()
  thumbnailEnabled: boolean; // 是否启用缩略图
}
```

---

## 📊 配置项完整列表

### 应用配置 (`app`)

| 配置项               | 环境变量               | 类型      | 默认值                  | 说明               |
| -------------------- | ---------------------- | --------- | ----------------------- | ------------------ |
| `env`                | `NODE_ENV`             | `string`  | `development`           | 运行环境           |
| `prefix`             | `APP_PREFIX`           | `string`  | `/api`                  | API 路由前缀       |
| `port`               | `APP_PORT`             | `number`  | `8080`                  | 应用端口           |
| `logger.dir`         | `LOG_DIR`              | `string`  | `../logs`               | 日志目录           |
| `logger.level`       | `LOG_LEVEL`            | `string`  | `debug`                 | 日志级别           |
| `logger.prettyPrint` | `LOG_PRETTY_PRINT`     | `boolean` | `true` (dev)            | 美化输出           |
| `logger.toFile`      | `LOG_TO_FILE`          | `boolean` | `true` (prod)           | 写入文件           |
| `file.isLocal`       | `FILE_IS_LOCAL`        | `boolean` | `true` (dev)            | 本地存储           |
| `file.location`      | `FILE_UPLOAD_LOCATION` | `string`  | `../admin/upload`       | 存储位置           |
| `file.domain`        | `FILE_DOMAIN`          | `string`  | `http://localhost:8080` | 访问域名           |
| `file.maxSize`       | `FILE_MAX_SIZE`        | `number`  | `10`                    | 最大文件大小（MB） |

### 数据库配置 (`db`)

| 配置项                | 环境变量      | 类型      | 默认值               | 说明       |
| --------------------- | ------------- | --------- | -------------------- | ---------- |
| `postgresql.host`     | `DB_HOST`     | `string`  | `127.0.0.1`          | 数据库主机 |
| `postgresql.port`     | `DB_PORT`     | `number`  | `5432`               | 数据库端口 |
| `postgresql.username` | `DB_USERNAME` | `string`  | `postgres`           | 用户名     |
| `postgresql.password` | `DB_PASSWORD` | `string`  | ``                   | 密码       |
| `postgresql.database` | `DB_DATABASE` | `string`  | `nest-admin-soybean` | 数据库名   |
| `postgresql.schema`   | `DB_SCHEMA`   | `string`  | `public`             | Schema     |
| `postgresql.ssl`      | `DB_SSL`      | `boolean` | `true` (prod)        | 启用 SSL   |

### Redis 配置 (`redis`)

| 配置项      | 环境变量           | 类型     | 默认值                | 说明       |
| ----------- | ------------------ | -------- | --------------------- | ---------- |
| `host`      | `REDIS_HOST`       | `string` | `localhost`           | Redis 主机 |
| `port`      | `REDIS_PORT`       | `number` | `6379`                | Redis 端口 |
| `password`  | `REDIS_PASSWORD`   | `string` | ``                    | Redis 密码 |
| `db`        | `REDIS_DB`         | `number` | `0` (prod), `2` (dev) | 数据库索引 |
| `keyPrefix` | `REDIS_KEY_PREFIX` | `string` | ``                    | Key 前缀   |

### JWT 配置 (`jwt`)

| 配置项             | 环境变量                 | 类型     | 默认值                    | 说明         |
| ------------------ | ------------------------ | -------- | ------------------------- | ------------ |
| `secretkey`        | `JWT_SECRET`             | `string` | `change-me-in-production` | JWT 密钥     |
| `expiresin`        | `JWT_EXPIRES_IN`         | `string` | `1h`                      | 过期时间     |
| `refreshExpiresIn` | `JWT_REFRESH_EXPIRES_IN` | `string` | `2h`                      | 刷新过期时间 |

### 租户配置 (`tenant`)

| 配置项            | 环境变量            | 类型      | 默认值   | 说明        |
| ----------------- | ------------------- | --------- | -------- | ----------- |
| `enabled`         | `TENANT_ENABLED`    | `boolean` | `true`   | 启用多租户  |
| `superTenantId`   | `TENANT_SUPER_ID`   | `string`  | `000000` | 超级租户 ID |
| `defaultTenantId` | `TENANT_DEFAULT_ID` | `string`  | `000000` | 默认租户 ID |

### 其他配置

- **加密配置** (`crypto`): RSA 公钥/私钥
- **COS 配置** (`cos`): 腾讯云对象存储
- **权限配置** (`perm`): 路由白名单
- **代码生成器** (`gen`): 作者、包名、表前缀
- **用户配置** (`user`): 初始密码
- **客户端配置** (`client`): 默认客户端 ID
- **微信配置** (`wechat`): AppID、Secret

---

## ⚠️ 缺陷分析

### 🔴 严重缺陷

#### 1. 生产环境默认值不安全（P0）

**问题**：JWT 密钥、初始密码等敏感配置有不安全的默认值

**风险代码**：

```typescript
// index.ts:95
jwt: {
  secretkey: process.env.JWT_SECRET || 'change-me-in-production', // ⚠️ 不安全
}

// index.ts:107
user: {
  initialPassword: process.env.USER_INITIAL_PASSWORD || '123456', // ⚠️ 弱密码
}
```

**影响**：

- 生产环境忘记设置环境变量时使用默认值
- JWT 密钥泄露导致认证绕过
- 弱密码导致账户被暴力破解

**建议**：

```typescript
// 生产环境强制要求设置
jwt: {
  secretkey: process.env.JWT_SECRET ||
    (env === 'production'
      ? (() => { throw new Error('JWT_SECRET is required in production') })()
      : 'dev-secret-key'
    ),
}

// 或在验证层检查
class EnvironmentVariables {
  @IsString()
  @MinLength(32)
  @ValidateIf((o) => o.NODE_ENV === 'production')
  JWT_SECRET: string;
}
```

---

#### 2. 配置验证不完整（P0）

**问题**：`env.validation.ts` 和 `config.transformer.ts` 验证逻辑重复且不一致

**风险**：

- 环境变量验证通过，但配置转换失败
- 两处验证规则不同步
- 维护成本高

**代码位置**：

- `env.validation.ts` - 验证环境变量
- `config.transformer.ts` - 验证配置对象
- `types/*.ts` - 配置类型定义

**建议**：

```typescript
// 统一验证入口，移除重复验证
export default () => {
  // 1. 环境变量验证（基础类型）
  const validatedEnv = validate(process.env);

  // 2. 构建配置对象
  const rawConfig = buildConfig(validatedEnv);

  // 3. 配置对象验证（业务规则）
  const validatedConfig = ConfigTransformer.transform(rawConfig);

  return validatedConfig;
};
```

---

#### 3. 缺少配置变更热更新（P1）

**问题**：配置在启动时加载，运行时无法动态更新

**影响**：

- 修改配置需要重启应用
- 无法动态调整日志级别、限流阈值等
- 运维不便

**建议**：

```typescript
// 添加配置热更新支持
@Injectable()
export class AppConfigService {
  private configCache = new Map<string, any>();

  async reloadConfig(key: string) {
    // 从配置中心或数据库重新加载
    const newValue = await this.fetchFromConfigCenter(key);
    this.configCache.set(key, newValue);
    this.eventEmitter.emit('config.changed', { key, value: newValue });
  }
}
```

---

### 🟡 中等缺陷

#### 4. 缺少配置版本管理（P2）

**问题**：无法追踪配置变更历史

**影响**：

- 配置回滚困难
- 无法审计配置变更
- 多环境配置同步困难

**建议**：

```typescript
// 添加配置版本号
export class Configuration {
  @IsString()
  version: string = '1.0.0';

  @IsDate()
  loadedAt: Date = new Date();
}

// 记录配置变更日志
this.logger.log(`Configuration loaded: version ${config.version}`);
```

---

#### 5. 环境变量命名不一致（P2）

**问题**：部分环境变量命名不符合规范

**示例**：

- `DATABASE_URL` vs `DB_HOST` - 混用完整 URL 和分离字段
- `WX_APPID` vs `WECHAT_APPID` - 缩写不一致

**建议**：

```typescript
// 统一命名规范
// ✅ 推荐
(DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE);

// ❌ 不推荐
DATABASE_URL(混用);

// ✅ 推荐
(WECHAT_APPID, WECHAT_SECRET);

// ❌ 不推荐
(WX_APPID, WX_SECRET(缩写));
```

---

#### 6. 缺少配置文档生成（P2）

**问题**：没有自动生成配置文档的机制

**影响**：

- 新成员不知道有哪些配置项
- 配置说明与代码不同步
- 文档维护成本高

**建议**：

```typescript
// 添加配置文档装饰器
export class AppConfig {
  @ConfigDoc({
    description: '应用运行端口',
    example: 8080,
    required: false,
    env: 'APP_PORT',
  })
  @IsNumber()
  port: number;
}

// 自动生成 Markdown 文档
npm run config:docs
```

---

#### 7. JSON 配置解析错误处理不足（P2）

**问题**：`json()` 辅助函数解析失败时仅打印警告

**风险代码**：

```typescript
// index.ts:30-37
const json = <T>(val: string | undefined, fallback: T): T => {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch (e) {
    logger.warn(`JSON parse failed for value: ${val}, using fallback`);
    return fallback; // ⚠️ 静默失败
  }
};
```

**影响**：

- 配置错误被隐藏
- 使用默认值可能导致意外行为

**建议**：

```typescript
const json = <T>(val: string | undefined, fallback: T, strict = false): T => {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch (e) {
    const message = `JSON parse failed for value: ${val}`;
    if (strict || env === 'production') {
      throw new Error(message);
    }
    logger.warn(message + ', using fallback');
    return fallback;
  }
};
```

---

### 🟢 轻微缺陷

#### 8. 配置类型导出混乱（P3）

**问题**：`types/index.ts` 同时导出类和接口，命名空间污染

**建议**：

```typescript
// 使用命名空间组织
export namespace Config {
  export class App { ... }
  export class Database { ... }
  export class Redis { ... }
}

// 使用
import { Config } from './types';
const app: Config.App = ...;
```

---

#### 9. 缺少配置校验规则文档（P3）

**问题**：验证装饰器的规则没有注释说明

**建议**：

```typescript
export class AppConfig {
  /**
   * 应用运行端口
   * @range 1-65535
   * @default 8080
   * @env APP_PORT
   */
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;
}
```

---

#### 10. 配置示例文件未使用（P3）

**问题**：`config-example.service.ts` 仅作为示例，未在实际代码中使用

**建议**：

- 移动到 `docs/examples/` 目录
- 或改为单元测试
- 或集成到 Swagger 文档

---

## 📊 缺陷统计

| 优先级   | 数量   | 缺陷类型                                 |
| -------- | ------ | ---------------------------------------- |
| P0       | 2      | 默认值不安全、验证逻辑重复               |
| P1       | 1      | 缺少热更新                               |
| P2       | 4      | 版本管理、命名不一致、文档生成、错误处理 |
| P3       | 3      | 类型导出、校验文档、示例文件             |
| **总计** | **10** |                                          |

---

## 🎯 改进建议优先级

### 立即修复（本周）

1. ✅ 修复生产环境默认值不安全问题
2. ✅ 统一配置验证逻辑
3. ✅ 改进 JSON 解析错误处理

### 短期改进（本月）

4. 统一环境变量命名规范
5. 添加配置版本管理
6. 实现配置文档自动生成

### 长期优化（本季度）

7. 实现配置热更新机制
8. 优化配置类型导出
9. 补充配置校验规则文档
10. 整理配置示例文件

---

## 📚 最佳实践

### 1. 配置访问

```typescript
// ✅ 推荐：类型安全
const port = this.config.app.port;

// ❌ 不推荐：字符串路径
const port = this.config.getValue('app.port');
```

### 2. 环境判断

```typescript
// ✅ 推荐：使用方法
if (this.config.isProduction) { ... }

// ❌ 不推荐：直接比较
if (this.config.app.env === 'production') { ... }
```

### 3. 敏感信息

```typescript
// ✅ 推荐：使用环境变量
JWT_SECRET = your - secret - key - here;

// ❌ 不推荐：硬编码
const secret = 'hardcoded-secret';
```

### 4. 配置验证

```typescript
// ✅ 推荐：使用装饰器
export class JwtConfig {
  @IsString()
  @MinLength(32)
  secretkey: string;
}

// ❌ 不推荐：运行时检查
if (config.jwt.secretkey.length < 32) {
  throw new Error('JWT secret too short');
}
```

### 5. 默认值

```typescript
// ✅ 推荐：环境相关默认值
const logLevel = env === 'production' ? 'info' : 'debug';

// ❌ 不推荐：固定默认值
const logLevel = 'debug';
```

---

## 🔗 相关文档

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [class-validator](https://github.com/typestack/class-validator)
- [class-transformer](https://github.com/typestack/class-transformer)
- [环境变量最佳实践](https://12factor.net/config)

---

## 📝 配置清单

### 开发环境必需配置

```bash
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

### 生产环境必需配置

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-32-char-secret-key-here
REDIS_PASSWORD=your-redis-password
DB_SSL=true
```

### 可选配置

```bash
APP_PORT=8080
APP_PREFIX=/api
LOG_LEVEL=info
TENANT_ENABLED=true
FILE_IS_LOCAL=false
```

---

## 🚀 快速开始

### 1. 创建环境变量文件

```bash
cp .env.example .env.development
```

### 2. 配置必需项

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb
```

### 3. 启动应用

```bash
npm run start:dev
```

### 4. 验证配置

```bash
# 查看日志输出
Configuration loaded and validated successfully
Config: { app: { env: 'development', port: 8080, ... } }
```

---

**维护者**：Backend Team  
**最后更新**：2026-02-22
