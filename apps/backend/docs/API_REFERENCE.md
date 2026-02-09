# 优惠券和积分系统 - API 参考文档

## 📚 API 概览

本系统提供 40+ RESTful API 接口，分为管理端和客户端两类。

**访问 Swagger 文档**: `http://localhost:3000/api-docs`

## 🎫 优惠券 API

### 优惠券模板管理（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/admin/marketing/coupon/templates` | 创建优惠券模板 | 管理员 |
| PUT | `/admin/marketing/coupon/templates/:id` | 更新优惠券模板 | 管理员 |
| DELETE | `/admin/marketing/coupon/templates/:id` | 停用优惠券模板 | 管理员 |
| GET | `/admin/marketing/coupon/templates` | 查询模板列表（分页） | 管理员 |
| GET | `/admin/marketing/coupon/templates/:id` | 查询模板详情 | 管理员 |

### 优惠券发放（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/admin/marketing/coupon/distribute/manual` | 手动发放优惠券 | 管理员 |

### 优惠券领取和使用（客户端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/client/marketing/coupon/claim/:templateId` | 用户领取优惠券 | 用户 |
| GET | `/client/marketing/coupon/available` | 查询可领取的优惠券 | 用户 |
| GET | `/client/marketing/coupon/my-coupons` | 查询我的优惠券 | 用户 |

### 优惠券统计（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/admin/marketing/coupon/user-coupons` | 查询用户优惠券列表 | 管理员 |
| GET | `/admin/marketing/coupon/usage-records` | 查询使用记录 | 管理员 |
| GET | `/admin/marketing/coupon/statistics` | 查询统计数据 | 管理员 |
| GET | `/admin/marketing/coupon/export` | 导出使用记录 | 管理员 |

## 💰 积分 API

### 积分规则配置（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/admin/marketing/points/rules` | 获取积分规则 | 管理员 |
| PUT | `/admin/marketing/points/rules` | 更新积分规则 | 管理员 |

### 积分账户（客户端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/client/marketing/points/balance` | 查询积分余额 | 用户 |
| GET | `/client/marketing/points/transactions` | 查询积分明细 | 用户 |
| GET | `/client/marketing/points/expiring` | 查询即将过期积分 | 用户 |

### 积分账户管理（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/admin/marketing/points/adjust` | 调整用户积分 | 管理员 |
| GET | `/admin/marketing/points/accounts` | 查询账户列表 | 管理员 |
| GET | `/admin/marketing/points/transactions` | 查询交易记录 | 管理员 |

### 积分签到（客户端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/client/marketing/points/signin` | 每日签到 | 用户 |
| GET | `/client/marketing/points/signin/status` | 查询签到状态 | 用户 |

### 积分任务（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/admin/marketing/points/tasks` | 创建积分任务 | 管理员 |
| PUT | `/admin/marketing/points/tasks/:id` | 更新积分任务 | 管理员 |
| GET | `/admin/marketing/points/tasks` | 查询任务列表 | 管理员 |
| DELETE | `/admin/marketing/points/tasks/:id` | 删除积分任务 | 管理员 |

### 积分任务（客户端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/client/marketing/points/tasks` | 查询可用任务 | 用户 |
| POST | `/client/marketing/points/tasks/:taskKey/complete` | 完成任务 | 用户 |
| GET | `/client/marketing/points/tasks/my-completions` | 查询完成记录 | 用户 |

### 积分统计（管理端）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/admin/marketing/points/statistics/earn` | 积分发放统计 | 管理员 |
| GET | `/admin/marketing/points/statistics/use` | 积分使用统计 | 管理员 |
| GET | `/admin/marketing/points/statistics/balance` | 积分余额统计 | 管理员 |
| GET | `/admin/marketing/points/statistics/expire` | 积分过期统计 | 管理员 |
| GET | `/admin/marketing/points/ranking` | 积分排行榜 | 管理员 |
| GET | `/admin/marketing/points/export` | 导出积分明细 | 管理员 |

## 🛒 订单集成 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/client/order/calculate-discount` | 计算订单优惠 | 用户 |

## 📝 请求示例

### 创建优惠券模板
```http
POST /admin/marketing/coupon/templates
Content-Type: application/json

{
  "templateName": "新用户专享券",
  "type": "FULL_REDUCTION",
  "discountAmount": 10,
  "minOrderAmount": 100,
  "totalStock": 1000,
  "perUserLimit": 1,
  "validityType": "FIXED_DAYS",
  "validityDays": 30,
  "isEnabled": true
}
```

### 用户领取优惠券
```http
POST /client/marketing/coupon/claim/template-id-123
```

### 更新积分规则
```http
PUT /admin/marketing/points/rules
Content-Type: application/json

{
  "orderPointsEnabled": true,
  "orderPointsRatio": 1,
  "orderPointsBase": 1,
  "signinPointsEnabled": true,
  "signinPointsAmount": 10,
  "pointsRedemptionEnabled": true,
  "pointsRedemptionRatio": 100,
  "pointsRedemptionBase": 1,
  "maxDiscountPercentOrder": 50
}
```

### 用户签到
```http
POST /client/marketing/points/signin
```

### 计算订单优惠
```http
POST /client/order/calculate-discount
Content-Type: application/json

{
  "items": [
    {
      "productId": "prod-123",
      "price": 100,
      "quantity": 2
    }
  ],
  "userCouponId": "coupon-456",
  "pointsToUse": 1000
}
```

## 🔐 认证和授权

### 请求头
```http
Authorization: Bearer <access_token>
X-Tenant-Id: <tenant_id>
```

### 权限级别
- **管理员**: 可访问所有 `/admin/*` 接口
- **用户**: 可访问所有 `/client/*` 接口
- **租户隔离**: 自动根据 `X-Tenant-Id` 过滤数据

## 📊 响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

### 分页响应
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "rows": [ ... ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10
  }
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "优惠券库存不足",
  "errorCode": "COUPON_1103"
}
```

## 🔍 错误码参考

### 优惠券错误码（1000-1399）
- `COUPON_1000`: 优惠券模板不存在
- `COUPON_1103`: 优惠券库存不足
- `COUPON_1201`: 优惠券已过期
- `COUPON_1202`: 优惠券已使用

### 积分错误码（2000-2599）
- `POINTS_2000`: 积分规则不存在
- `POINTS_2101`: 积分余额不足
- `POINTS_2300`: 今日已签到
- `POINTS_2400`: 任务不存在

详细错误码定义请查看：
- `coupon/constants/error-codes.ts`
- `points/constants/error-codes.ts`

## 📖 更多文档

- **实现总结**: `COUPON_AND_POINTS_IMPLEMENTATION.md`
- **快速开发**: `COUPON_AND_POINTS_QUICK_START.md`
- **部署指南**: `DEPLOYMENT_GUIDE.md`
- **日志实践**: `LOGGING_BEST_PRACTICES.md`
