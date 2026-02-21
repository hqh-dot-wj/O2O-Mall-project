# E2E 测试文档

本目录包含端到端测试相关的所有文档。

## 📁 文档结构

### 快速开始

- **E2E_TEST_QUICK_REFERENCE.md** - 快速参考卡，一页纸总结

### 详细文档

- **E2E_TEST_GUIDE.md** - 完整的测试指南（位于 `apps/backend/docs/`）
- **E2E_TEST_RESULTS_SUMMARY.md** - 测试结果详细总结
- **E2E_TEST_IMPLEMENTATION.md** - 实现记录

## 🚀 快速执行

### Windows

```bash
cd apps/backend
scripts\test-e2e.bat
```

### Linux/Mac

```bash
cd apps/backend
./scripts/test-e2e.sh
```

## 📊 测试覆盖

- ✅ 拼团成功（达到最低人数）
- ✅ 拼团失败（人数不足）
- ✅ 多团并行
- ✅ 团长优惠计算
- ✅ 一级分佣（直推）
- ✅ 二级分佣（间推）
- ✅ 无推荐人场景
- ✅ 分佣冻结与结算
- ✅ 统计数据查询
- ❌ 平台抽成（未实现）

## 💰 关键数据

```
订单总收入：¥4,030
├─ 分佣支出：¥442
└─ 门店净利润：¥3,588

注意：平台抽成功能未实现，门店获得100%订单收入
```

## 📝 相关文件

### 测试脚本

- `apps/backend/test/e2e-marketing-flow.test.ts` - 主测试脚本

### 执行脚本

- `apps/backend/scripts/test-e2e.bat` - Windows 执行脚本
- `apps/backend/scripts/test-e2e.sh` - Linux/Mac 执行脚本

### 开发文档

- `apps/backend/docs/PLATFORM_COMMISSION_GUIDE.md` - 平台抽成设计指南
- `apps/backend/docs/PLATFORM_COMMISSION_REALITY_CHECK.md` - 平台抽成实际情况
- `apps/backend/docs/COMPLETE_BUSINESS_FLOW.md` - 完整业务流程

## 🔗 快速链接

- [测试指南](../E2E_TEST_GUIDE.md)
- [快速参考](./E2E_TEST_QUICK_REFERENCE.md)
- [测试结果](./E2E_TEST_RESULTS_SUMMARY.md)
- [平台抽成说明](../PLATFORM_COMMISSION_REALITY_CHECK.md)
