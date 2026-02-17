# Backend Scripts

## 营销系统重置脚本

### 脚本列表（跨平台 .cjs，使用 node 运行）

| 脚本                       | 功能             |
| -------------------------- | ---------------- |
| `reset-templates-only.cjs` | 仅重置营销模板   |
| `reset-marketing-full.cjs` | 完整重置营销系统 |

### 使用方法

```bash
# 仅重置模板
node scripts/reset-templates-only.cjs

# 完整重置（危险，需输入 DELETE ALL 确认）
node scripts/reset-marketing-full.cjs
```

### 其他常用脚本

| 脚本                     | 功能             |
| ------------------------ | ---------------- |
| `clear-configs.cjs`      | 清理门店配置缓存 |
| `seed-courses.cjs`       | 课程商品种子数据 |
| `setup-tenant.cjs`       | 租户课程设置     |
| `test-e2e.cjs`           | 营销 E2E 测试    |
| `test-system-config.cjs` | 企业级配置测试   |

### 详细文档

- 快速参考：`../MARKETING_RESET_QUICK_REFERENCE.md`
- 完整指南：`../docs/MARKETING_RESET_GUIDE.md`

## 部署脚本

查看 `deploy.cjs` 和 `deploy-config-example.cjs`
