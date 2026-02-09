# 优惠券和积分系统 - 部署指南

## 📋 部署前检查清单

### 1. 环境要求
- ✅ Node.js >= 18.x
- ✅ PostgreSQL >= 14.x
- ✅ Redis >= 6.x
- ✅ NestJS >= 10.x
- ✅ Prisma >= 5.x

### 2. 依赖包检查
```bash
# 检查必要的依赖
npm list @nestjs/common
npm list @nestjs/schedule
npm list @prisma/client
npm list nestjs-cls
npm list ioredis
```

## 🗄️ 数据库迁移

### 步骤1: 检查 Prisma Schema

确认以下表已在 `prisma/schema.prisma` 中定义：

**优惠券相关表**：
- `mkt_coupon_template` - 优惠券模板
- `mkt_user_coupon` - 用户优惠券
- `mkt_coupon_usage` - 优惠券使用记录

**积分相关表**：
- `mkt_points_rule` - 积分规则
- `mkt_points_account` - 积分账户
- `mkt_points_transaction` - 积分交易记录
- `mkt_points_task` - 积分任务
- `mkt_user_task_completion` - 任务完成记录

**订单扩展字段**：
- `oms_order.userCouponId` - 使用的优惠券ID
- `oms_order.couponDiscount` - 优惠券抵扣金额
- `oms_order.pointsUsed` - 使用的积分数量
- `oms_order.pointsDiscount` - 积分抵扣金额

### 步骤2: 生成迁移文件

```bash
# 生成迁移文件
npx prisma migrate dev --name add_coupon_and_points_system

# 或者在生产环境
npx prisma migrate deploy
```