# 运行测试

按项目约定执行测试，支持全量或按模块运行。

## 全量测试（从根目录）

```bash
pnpm test
```

## 按应用运行

| 应用           | 命令                                                                             |
| -------------- | -------------------------------------------------------------------------------- |
| Backend        | `pnpm --filter @apps/backend test`                                               |
| Admin-Web      | `pnpm --filter @apps/admin-web test` 或 `pnpm --filter @apps/admin-web test:run` |
| Miniapp-Client | 当前无 test 脚本，跳过                                                           |

## Backend 按模块/路径运行

```bash
# 指定路径模式
pnpm --filter @apps/backend test -- src/module/finance

# 指定单个文件
pnpm --filter @apps/backend test -- commission.service.spec

# 已有快捷脚本
pnpm --filter @apps/backend test:finance
pnpm --filter @apps/backend test:commission
pnpm --filter @apps/backend test:wallet
```

## Admin-Web 按路径运行

```bash
pnpm --filter @apps/admin-web test -- src/service/api
pnpm --filter @apps/admin-web test:run -- src/xxx
```

## E2E 测试（Admin-Web）

**前置**：先启动 `pnpm dev` 与 backend。

```bash
pnpm --filter @apps/admin-web test:e2e
# 或指定用例
pnpm --filter @apps/admin-web test:e2e e2e/pms-routes.spec.ts
```

## 注意事项

- 对接完页面/接口后**必须**运行对应测试
- E2E 涉及路由/页面改动时**不得跳过**
- 测试失败需修复后再提交 PR
