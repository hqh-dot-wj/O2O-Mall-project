# 定时任务管理模块任务清单

> 来源：apps/backend/docs/requirements/admin/monitor/job-requirements.md
> 创建时间：2026-03-03
> 架构审查：✅ 通过
> 模块相态：成长态

## 架构审查结论

### 相态判断：成长态

- 模块功能已稳定运行，但涉及状态机（任务启用/停用/执行中）、分布式锁（Redis）、Cron 调度等复杂机制
- 需求确定性 ~70%，可能扩展任务依赖关系、执行统计等功能
- Process Spec 级别：**Full**（涉及状态转换 + 分布式锁 + 并发控制）

### 四棱镜快速扫描

1. **业务价值**：系统自动化运维基础设施，支撑存储配额预警、文件版本清理等核心定时任务 → 高价值
2. **时间**：模块已上线运行，本次补充测试和规约，无新功能开发 → 低风险
3. **能力**：NestJS Schedule + CronJob + Redis 分布式锁，团队已掌握 → 无能力缺口
4. **复杂性**：状态机转换（启用↔停用↔执行中）、分布式锁、@Task 装饰器动态注册 → 中等复杂度，需 Full 级别 Spec

### 需求补全检查

- ✅ 模块边界清晰：JobService（调度管理）、TaskService（任务执行）、JobLogService（日志记录）
- ✅ 跨模块连接：NoticeModule（存储配额预警）、VersionService（文件版本清理）、BackupService（数据库备份）
- ✅ 抽象层：@Task 装饰器 + TaskRegistry 全局注册表
- ⚠️ JobService 直接使用 PrismaService 而非 JobRepository（已有 Repository 但未在 Service 中使用）→ 技术债，不阻塞本次测试

## 短期任务（1-2周）

- [x] T-1: 编写 Process Spec（Full 级别）(2h) ✅ 2026-03-03
- [x] T-2: 编写 JobService 单元测试 (3h) ✅ 2026-03-03
- [x] T-3: 编写 TaskService 单元测试 (2h) ✅ 2026-03-03
- [x] T-4: 编写 JobLogService 单元测试 (1h) ✅ 2026-03-03
- [x] T-5: 编写 JobController 单元测试 (1.5h) ✅ 2026-03-03
- [x] T-6: 编写 JobLogController 单元测试 (0.5h) ✅ 2026-03-03
