# Backend 后端指引

## 技术栈

NestJS + Prisma + 多租户（BaseRepository/SoftDeleteRepository）

## 响应与异常

```typescript
return Result.ok(data);
BusinessException.throwIf(condition, '错误信息');
BusinessException.throwIfNull(user, '用户不存在');
```

catch 中安全获取错误：使用 `getErrorMessage`、`getErrorInfo`（`src/common/utils/error`）

## 模块结构

```
xxx/
  dto/  vo/  services/  xxx.repository.ts  xxx.service.ts  xxx.controller.ts  xxx.module.ts
```

## 接口分类

| 类型           | 说明                            |
| -------------- | ------------------------------- |
| TenantScoped   | 按租户隔离，Repository 自动过滤 |
| PlatformOnly   | 平台专用，需权限校验            |
| TenantAgnostic | 不依赖当前租户                  |

新增接口时在 Controller 标明 `@tenantScope`。

## 路径约定

- **system/**、**admin/**：后台管理
- **client/**：小程序 C 端（`module/client/` 下）

## 参考实现

`src/module/admin/system/user` 为标准实现。
