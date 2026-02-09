# 优惠券和积分系统 - 部署指南

## 环境要求

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x
- NestJS >= 10.x
- Prisma >= 5.x

## 数据库迁移

### 1. 生成迁移
```bash
npx prisma migrate dev --name add_coupon_and_points_system
```

### 2. 应用迁移（生产环境）
```bash
npx prisma migrate deploy
```

### 3. 验证表结构
```sql
-- 检查优惠券表
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'mkt_coupon%' OR table_name LIKE 'mkt_points%';

-- 检查索引
SELECT indexname FROM pg_indexes 
WHERE tablename LIKE 'mkt_coupon%' OR tablename LIKE 'mkt_points%';
```

## 配置项

### 环境变量
```env
# Redis配置（分布式锁）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# 定时任务配置（可选）
ENABLE_SCHEDULER=true
```

## 启动服务

### 开发环境
```bash
npm run start:dev
```

### 生产环境
```bash
npm run build
npm run start:prod
```

## 验证部署

### 1. 健康检查
```bash
curl http://localhost:3000/health
```

### 2. API文档
访问 Swagger 文档：
```
http://localhost:3000/api-docs
```

### 3. 测试接口

**创建优惠券模板**：
```bash
curl -X POST http://localhost:3000/admin/marketing/coupon/templates \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "新用户优惠券",
    "type": "FULL_REDUCTION",
    "discountAmount": 10,
    "minOrderAmount": 100,
    "totalStock": 1000
  }'
```

**查询积分规则**：
```bash
curl http://localhost:3000/admin/marketing/points/rules
```

## 监控和日志

### 日志位置
```bash
# 应用日志
tail -f logs/app.log

# 错误日志
tail -f logs/error.log
```

### 关键指标监控
- 优惠券发放成功率
- 积分扣减并发冲突率
- 定时任务执行状态
- Redis连接状态

## 故障排查

### 问题1: 优惠券库存超发
**原因**: Redis分布式锁失效  
**解决**: 检查Redis连接，确保锁超时时间合理

### 问题2: 积分扣减失败
**原因**: 乐观锁冲突过多  
**解决**: 检查并发量，考虑增加重试次数

### 问题3: 定时任务未执行
**原因**: 定时任务未启用  
**解决**: 确认 `ENABLE_SCHEDULER=true`

## 回滚方案

### 数据库回滚
```bash
# 回滚最后一次迁移
npx prisma migrate resolve --rolled-back <migration_name>
```

### 应用回滚
```bash
# 切换到上一个版本
git checkout <previous_version>
npm run build
npm run start:prod
```

## 性能优化建议

1. **数据库索引**: 已创建25个索引，定期检查索引使用情况
2. **Redis缓存**: 可对优惠券模板、积分规则添加缓存
3. **连接池**: 调整数据库连接池大小
4. **定时任务**: 避开业务高峰期执行

## 安全建议

1. **租户隔离**: 已实现，确保中间件正确注入 tenantId
2. **权限控制**: 管理端接口需要管理员权限
3. **数据加密**: 敏感数据建议加密存储
4. **审计日志**: 已实现完整日志记录

## 联系支持

如遇到问题，请查看：
- 实现文档: `COUPON_AND_POINTS_IMPLEMENTATION.md`
- 快速指南: `COUPON_AND_POINTS_QUICK_START.md`
- 日志实践: `LOGGING_BEST_PRACTICES.md`
