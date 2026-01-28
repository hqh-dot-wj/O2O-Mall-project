# Finance 模块测试脚本配置

## 推荐的 package.json 脚本配置

在项目根目录的 `package.json` 中添加以下测试脚本:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    
    "test:finance": "jest --testPathPattern=finance",
    "test:finance:watch": "jest --testPathPattern=finance --watch",
    "test:finance:cov": "jest --testPathPattern=finance --coverage",
    
    "test:commission": "jest commission.service.spec",
    "test:wallet": "jest wallet.service.spec",
    "test:withdrawal": "jest withdrawal.service.spec",
    "test:settlement": "jest settlement.scheduler.spec",
    
    "test:integration": "jest --testPathPattern=integration.spec",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

## Jest 配置

在项目根目录创建或更新 `jest.config.js`:

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.vo.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## 使用示例

### 1. 运行所有 Finance 模块测试

```bash
npm run test:finance
```

### 2. 监听模式运行 Finance 测试

```bash
npm run test:finance:watch
```

### 3. 生成覆盖率报告

```bash
npm run test:finance:cov
```

覆盖率报告会生成在 `coverage/` 目录下,可以打开 `coverage/lcov-report/index.html` 查看详细报告。

### 4. 运行特定服务的测试

```bash
# 佣金服务
npm run test:commission

# 钱包服务
npm run test:wallet

# 提现服务
npm run test:withdrawal

# 结算调度器
npm run test:settlement
```

### 5. 调试模式运行测试

```bash
npm run test:debug
```

然后在 Chrome 浏览器中打开 `chrome://inspect` 进行调试。

### 6. 运行集成测试

```bash
npm run test:integration
```

## CI/CD 集成

### GitHub Actions 示例

在 `.github/workflows/test.yml` 中添加:

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:finance:cov
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: finance
          name: finance-coverage
```

## VSCode 配置

在 `.vscode/launch.json` 中添加调试配置:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug Finance",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--testPathPattern=finance",
        "--no-cache"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "windows": {
        "program": "${workspaceFolder}/node_modules/jest/bin/jest"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasenameNoExtension}",
        "--runInBand",
        "--no-cache"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "windows": {
        "program": "${workspaceFolder}/node_modules/jest/bin/jest"
      }
    }
  ]
}
```

## 测试覆盖率目标

| 模块 | 目标覆盖率 | 当前状态 |
|------|-----------|---------|
| CommissionService | 90% | ✅ 已达标 |
| WalletService | 90% | ✅ 已达标 |
| WithdrawalService | 90% | ✅ 已达标 |
| WithdrawalAuditService | 90% | ✅ 已达标 |
| SettlementScheduler | 85% | ✅ 已达标 |
| CommissionProcessor | 90% | ✅ 已达标 |

## 常见问题

### 1. 测试运行缓慢

**解决方案**:
- 使用 `--maxWorkers=4` 限制并发数
- 清除 Jest 缓存: `jest --clearCache`
- 只运行修改的测试: `jest --onlyChanged`

### 2. Mock 数据库连接失败

**解决方案**:
- 确保使用 Mock 对象而非真实数据库
- 检查 `PrismaService` 是否正确 Mock

### 3. 异步测试超时

**解决方案**:
- 增加超时时间: `jest.setTimeout(10000)`
- 使用 `async/await` 而非回调
- 确保所有 Promise 都被正确处理

### 4. 覆盖率不准确

**解决方案**:
- 清除缓存: `jest --clearCache`
- 重新生成覆盖率: `npm run test:finance:cov -- --no-cache`
- 检查 `collectCoverageFrom` 配置

## 最佳实践

1. **测试隔离**: 每个测试用例独立运行,不依赖其他测试
2. **Mock 策略**: 外部依赖全部 Mock,保证测试稳定性
3. **命名规范**: 使用清晰的中文描述测试场景
4. **边界测试**: 覆盖正常和异常场景
5. **持续维护**: 代码变更时同步更新测试用例

## 参考资料

- [Jest 官方文档](https://jestjs.io/)
- [NestJS Testing 文档](https://docs.nestjs.com/fundamentals/testing)
- [测试驱动开发 (TDD)](https://en.wikipedia.org/wiki/Test-driven_development)
