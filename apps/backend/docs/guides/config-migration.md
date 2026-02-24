# 配置管理迁移指南

## 🎯 迁移目标

将项目从使用 `ConfigService` 字符串访问配置，迁移到使用 `AppConfigService` 的类型安全方式。

## 📋 迁移步骤

### 步骤 1: 识别需要迁移的文件

```bash
# 查找所有使用 ConfigService 的文件
cd /Users/mac/Documents/project/nest-admin/server
grep -r "ConfigService" src/module --include="*.ts" -l
```

### 步骤 2: 逐个文件迁移

#### 2.1 更新导入语句

**Before:**

```typescript
import { ConfigService } from '@nestjs/config';
```

**After:**

```typescript
import { AppConfigService } from 'src/config/app-config.service';
// 如果需要向后兼容，也可以保留 ConfigService
import { ConfigService } from '@nestjs/config';
```

#### 2.2 更新依赖注入

**Before:**

```typescript
constructor(private readonly configService: ConfigService) {}
```

**After:**

```typescript
constructor(private readonly config: AppConfigService) {}
```

#### 2.3 更新配置访问方式

**Before:**

```typescript
const port = this.configService.get<number>('app.port');
const dbHost = this.configService.get('db.postgresql.host');
const isProduction = this.configService.get('app.env') === 'production';
```

**After:**

```typescript
const port = this.config.app.port; // 自动类型推断
const dbHost = this.config.db.postgresql.host; // IDE 自动补全
const isProduction = this.config.isProduction; // 便捷方法
```

### 步骤 3: 常见迁移场景

#### 场景 1: PrismaService

**Before:**

```typescript
constructor(private readonly configService: ConfigService) {
  const pgConfig = configService.get<PostgresConfig>('db.postgresql');
  const host = pgConfig.host;
  const port = pgConfig.port;
}
```

**After:**

```typescript
constructor(private readonly config: AppConfigService) {
  const pgConfig = config.db.postgresql;  // 类型安全
  const host = pgConfig.host;             // 自动推断为 string
  const port = pgConfig.port;             // 自动推断为 number
}
```

#### 场景 2: RedisModule

**Before:**

```typescript
RedisModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    config: {
      host: configService.get('redis.host'),
      port: configService.get<number>('redis.port'),
      password: configService.get('redis.password'),
      db: configService.get<number>('redis.db'),
    },
  }),
});
```

**After:**

```typescript
RedisModule.forRootAsync({
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => ({
    config: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
    },
  }),
});
```

#### 场景 3: JWT 配置

**Before:**

```typescript
JwtModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get('jwt.secretkey'),
    signOptions: {
      expiresIn: config.get('jwt.expiresin'),
    },
  }),
});
```

**After:**

```typescript
JwtModule.registerAsync({
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => ({
    secret: config.jwt.secretkey,
    signOptions: {
      expiresIn: config.jwt.expiresin,
    },
  }),
});
```

#### 场景 4: 环境判断

**Before:**

```typescript
const isProd = this.configService.get('app.env') === 'production';
const isDev = this.configService.get('app.env') === 'development';
```

**After:**

```typescript
const isProd = this.config.isProduction;
const isDev = this.config.isDevelopment;
```

#### 场景 5: 租户配置

**Before:**

```typescript
const tenantEnabled = this.configService.get<boolean>('tenant.enabled');
const superTenantId = this.configService.get('tenant.superTenantId');
```

**After:**

```typescript
const tenantEnabled = this.config.tenant.enabled;
const superTenantId = this.config.tenant.superTenantId;
```

## 🔧 自动化迁移脚本

创建一个脚本辅助迁移：

```bash
#!/bin/bash
# migrate-config.sh

# 查找所有需要迁移的文件
files=$(grep -r "ConfigService" src/module --include="*.ts" -l)

for file in $files; do
  echo "正在处理: $file"

  # 备份原文件
  cp "$file" "$file.backup"

  # 替换导入语句（需要手动确认）
  # sed -i '' 's/import { ConfigService }/import { AppConfigService }/g' "$file"

  # 替换变量名（需要手动确认）
  # sed -i '' 's/configService: ConfigService/config: AppConfigService/g' "$file"

  echo "  已备份到: $file.backup"
  echo "  请手动检查并完成迁移"
done
```

## ⚠️ 注意事项

### 1. 向后兼容

如果暂时无法完全迁移，可以同时使用两种方式：

```typescript
constructor(
  private readonly config: AppConfigService,
  private readonly configService: ConfigService,  // 旧代码使用
) {}
```

### 2. 模块工厂函数

在模块工厂函数中，必须使用 `inject` 数组：

```typescript
// ✅ 正确
{
  inject: [AppConfigService],
  useFactory: (config: AppConfigService) => ({ ... }),
}

// ❌ 错误
{
  useFactory: () => {
    const config = new AppConfigService();  // 无法获取实例
    return { ... };
  },
}
```

### 3. 测试代码

在测试中提供 Mock：

```typescript
const mockConfig = {
  app: {
    port: 3000,
    env: 'test',
  },
  // ...
} as AppConfigService;

TestingModule.createTestingModule({
  providers: [
    {
      provide: AppConfigService,
      useValue: mockConfig,
    },
  ],
});
```

## ✅ 迁移检查清单

- [ ] 更新所有服务的 ConfigService 注入
- [ ] 更新所有模块工厂函数
- [ ] 更新测试文件的 Mock
- [ ] 删除未使用的 ConfigService 导入
- [ ] 运行所有测试确保功能正常
- [ ] 删除备份文件 `*.backup`

## 📊 迁移优先级

### 高优先级（核心模块）

1. PrismaService
2. RedisService
3. JwtModule 配置
4. LoggerModule 配置
5. TenantModule 配置

### 中优先级（业务模块）

1. UserService
2. AuthService
3. UploadService
4. ConfigService（系统配置服务，注意命名冲突）

### 低优先级（辅助模块）

1. 工具类
2. 测试文件
3. 文档示例

## 🎓 最佳实践

### 1. 统一命名

```typescript
// ✅ 推荐
constructor(private readonly config: AppConfigService) {}

// ❌ 不推荐
constructor(private readonly appConfig: AppConfigService) {}
```

### 2. 避免重复解构

```typescript
// ✅ 推荐
const redis = this.config.redis;
return {
  host: redis.host,
  port: redis.port,
  db: redis.db,
};

// ❌ 不推荐
return {
  host: this.config.redis.host,
  port: this.config.redis.port,
  db: this.config.redis.db,
};
```

### 3. 使用环境判断方法

```typescript
// ✅ 推荐
if (this.config.isProduction) { ... }

// ❌ 不推荐
if (this.config.app.env === 'production') { ... }
```

## 📞 需要帮助？

如果迁移过程中遇到问题：

1. 查看 [CONFIG_REFACTORING.md](./CONFIG_REFACTORING.md)
2. 参考 [config-example.service.ts](../config/config-example.service.ts)
3. 检查类型定义 `src/config/types/*`
