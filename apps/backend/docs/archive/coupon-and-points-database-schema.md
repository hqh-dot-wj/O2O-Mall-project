# 优惠券和积分系统 - 数据库模型文档

## 概述

本文档描述了优惠券和积分系统的数据库模型设计。该系统包含8个核心表和10个枚举类型，支持完整的优惠券生命周期管理和积分体系运营。

## 实施日期

- **创建时间**: 2025-01-28
- **实施方式**: Prisma Schema + db push
- **数据库**: PostgreSQL

## 枚举类型

### 优惠券相关枚举

#### CouponType - 优惠券类型

- `DISCOUNT`: 满减券
- `PERCENTAGE`: 折扣券
- `EXCHANGE`: 兑换券

#### CouponStatus - 优惠券模板状态

- `ACTIVE`: 启用中
- `INACTIVE`: 已停用
- `EXPIRED`: 已过期

#### UserCouponStatus - 用户优惠券状态

- `UNUSED`: 未使用
- `LOCKED`: 已锁定（订单创建时）
- `USED`: 已使用
- `EXPIRED`: 已过期
- `CANCELLED`: 已取消

#### CouponValidityType - 优惠券有效期类型

- `FIXED`: 固定时间段
- `RELATIVE`: 相对时间（领取后N天）

#### CouponDistributionType - 优惠券发放方式

- `MANUAL`: 手动发放
- `AUTO`: 自动发放
- `ACTIVITY`: 活动发放
- `ORDER`: 订单赠送

### 积分相关枚举

#### PointsTransactionType - 积分交易类型

- `EARN_ORDER`: 消费获得
- `EARN_SIGNIN`: 签到获得
- `EARN_TASK`: 任务获得
- `EARN_ADMIN`: 管理员调整（增加）
- `USE_ORDER`: 订单抵扣
- `USE_COUPON`: 兑换优惠券
- `USE_PRODUCT`: 兑换商品
- `FREEZE`: 冻结
- `UNFREEZE`: 解冻
- `EXPIRE`: 过期扣减
- `REFUND`: 退款返还
- `DEDUCT_ADMIN`: 管理员调整（扣减）

#### PointsTransactionStatus - 积分交易状态

- `PENDING`: 待处理
- `COMPLETED`: 已完成
- `CANCELLED`: 已取消

## 数据表

### 1. mkt_coupon_template - 优惠券模板表

**用途**: 存储优惠券模板配置，定义优惠券的类型、金额、使用条件等。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID（支持多租户隔离）
- `name`: 优惠券名称
- `description`: 优惠券描述
- `type`: 优惠券类型（满减/折扣/兑换）
- `discount_amount`: 满减金额
- `discount_percent`: 折扣百分比(1-99)
- `max_discount_amount`: 最高优惠金额
- `min_order_amount`: 最低消费金额
- `applicable_products`: 适用商品ID列表
- `applicable_categories`: 适用分类ID列表
- `member_levels`: 适用会员等级
- `exchange_product_id`: 可兑换的商品ID
- `exchange_sku_id`: 可兑换的SKU ID
- `validity_type`: 有效期类型
- `start_time`: 固定时间段-开始时间
- `end_time`: 固定时间段-结束时间
- `valid_days`: 相对时间-有效天数
- `total_stock`: 发放总量
- `remaining_stock`: 剩余库存
- `limit_per_user`: 每人限领数量
- `status`: 状态
- `create_by`: 创建人
- `create_time`: 创建时间
- `update_by`: 更新人
- `update_time`: 更新时间

**索引**:

- `(tenant_id, status)`: 租户+状态查询
- `(tenant_id, type)`: 租户+类型查询

### 2. mkt_user_coupon - 用户优惠券表

**用途**: 存储用户领取的优惠券实例，包含优惠券信息快照。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID
- `member_id`: 用户ID
- `template_id`: 模板ID
- `coupon_name`: 优惠券名称（快照）
- `coupon_type`: 优惠券类型（快照）
- `discount_amount`: 满减金额（快照）
- `discount_percent`: 折扣百分比（快照）
- `max_discount_amount`: 最高优惠金额（快照）
- `min_order_amount`: 最低消费金额（快照）
- `start_time`: 有效期开始时间
- `end_time`: 有效期结束时间
- `status`: 状态
- `distribution_type`: 发放方式
- `distribution_source`: 发放来源描述
- `used_time`: 使用时间
- `order_id`: 关联订单ID
- `receive_time`: 领取时间

**索引**:

- `(tenant_id, member_id, status)`: 用户优惠券查询
- `(template_id)`: 模板关联查询
- `(order_id)`: 订单关联查询

### 3. mkt_coupon_usage - 优惠券使用记录表

**用途**: 记录优惠券的核销信息，用于统计和审计。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID
- `user_coupon_id`: 用户优惠券ID
- `member_id`: 用户ID
- `order_id`: 订单ID
- `discount_amount`: 优惠金额
- `order_amount`: 订单金额
- `used_time`: 使用时间

**索引**:

- `(tenant_id, member_id)`: 用户使用记录查询
- `(order_id)`: 订单关联查询

### 4. mkt_points_rule - 积分规则配置表

**用途**: 存储租户的积分规则配置，包括获取规则和使用规则。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID（唯一）
- `order_points_enabled`: 消费积分是否启用
- `order_points_ratio`: 消费积分比例
- `order_points_base`: 消费积分基数
- `signin_points_enabled`: 签到积分是否启用
- `signin_points_amount`: 签到积分数量
- `points_validity_enabled`: 积分有效期是否启用
- `points_validity_days`: 积分有效天数
- `points_redemption_enabled`: 积分抵扣是否启用
- `points_redemption_ratio`: 积分抵扣比例
- `points_redemption_base`: 积分抵扣基数
- `max_points_per_order`: 单笔订单最多可使用积分数量
- `max_discount_percent_order`: 单笔订单最多可抵扣百分比
- `system_enabled`: 系统开关
- `create_by`: 创建人
- `create_time`: 创建时间
- `update_by`: 更新人
- `update_time`: 更新时间

**索引**:

- `(tenant_id)`: 唯一索引

### 5. mkt_points_account - 积分账户表

**用途**: 存储用户的积分账户信息和余额。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID
- `member_id`: 用户ID
- `total_points`: 总积分（累计获得）
- `available_points`: 可用积分
- `frozen_points`: 冻结积分
- `used_points`: 已使用积分
- `expired_points`: 已过期积分
- `version`: 乐观锁版本号
- `create_time`: 创建时间
- `update_time`: 更新时间

**索引**:

- `(tenant_id, member_id)`: 唯一索引
- `(tenant_id, available_points)`: 积分排行查询

### 6. mkt_points_transaction - 积分交易记录表

**用途**: 记录所有积分变动的交易记录，不可篡改。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID
- `account_id`: 账户ID
- `member_id`: 用户ID
- `type`: 交易类型
- `amount`: 积分变动数量（正数为增加，负数为减少）
- `balance_before`: 交易前余额
- `balance_after`: 交易后余额
- `related_id`: 关联业务ID
- `related_type`: 关联业务类型
- `expire_time`: 有效期（用于过期扣减）
- `status`: 状态
- `remark`: 备注
- `create_time`: 创建时间

**索引**:

- `(tenant_id, member_id, create_time)`: 用户交易记录查询
- `(account_id, type)`: 账户交易类型查询
- `(related_id)`: 关联业务查询
- `(expire_time)`: 过期积分查询

### 7. mkt_points_task - 积分任务配置表

**用途**: 存储积分任务配置，定义任务的完成条件和奖励。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID
- `task_key`: 任务唯一标识
- `task_name`: 任务名称
- `task_description`: 任务描述
- `points_reward`: 积分奖励
- `completion_condition`: 完成条件配置（JSON格式）
- `is_repeatable`: 是否可重复完成
- `max_completions`: 最多完成次数
- `is_enabled`: 是否启用
- `create_by`: 创建人
- `create_time`: 创建时间
- `update_by`: 更新人
- `update_time`: 更新时间

**索引**:

- `(tenant_id, task_key)`: 唯一索引
- `(tenant_id, is_enabled)`: 启用任务查询

### 8. mkt_user_task_completion - 用户任务完成记录表

**用途**: 记录用户完成任务的历史记录。

**字段说明**:

- `id`: UUID主键
- `tenant_id`: 租户ID
- `member_id`: 用户ID
- `task_id`: 任务ID
- `completion_time`: 完成时间
- `points_awarded`: 获得积分
- `transaction_id`: 关联的积分交易记录ID

**索引**:

- `(tenant_id, member_id, task_id)`: 用户任务完成查询

## 订单表扩展

### oms_order 表新增字段

为支持优惠券和积分功能，在现有的 `oms_order` 表中新增以下字段：

**优惠券相关**:

- `user_coupon_id`: 使用的优惠券ID
- `coupon_discount`: 优惠券优惠金额

**积分相关**:

- `points_used`: 使用的积分数量
- `points_discount`: 积分抵扣金额
- `points_earned`: 本次订单获得的积分

## 数据一致性保证

### 1. 租户隔离

- 所有表都包含 `tenant_id` 字段
- 所有查询都必须带上租户过滤条件
- 超级管理员（tenantId='000000'）可跨租户查询

### 2. 并发安全

- **优惠券库存扣减**: 使用数据库事务 + 原子操作（updateMany with condition）
- **积分扣减**: 使用乐观锁（version字段）防止并发冲突
- **优惠券状态变更**: 使用数据库行锁防止重复使用

### 3. 数据完整性

- **优惠券快照**: 用户优惠券表存储模板信息快照，防止模板修改影响已发放的券
- **积分余额一致性**: 可用积分 + 冻结积分 + 已使用积分 + 已过期积分 = 总积分
- **交易记录不可篡改**: 积分交易记录一旦创建不可修改

## 性能优化

### 索引策略

- **复合索引**: 所有涉及分页查询的表都添加了复合索引（过滤字段 + 排序字段）
- **唯一索引**: 防止重复数据（如：租户+用户的积分账户）
- **外键索引**: 所有外键字段都有索引，提升关联查询性能

### 查询优化建议

1. 优惠券列表查询使用 `(tenant_id, status)` 索引
2. 用户优惠券查询使用 `(tenant_id, member_id, status)` 索引
3. 积分交易记录查询使用 `(tenant_id, member_id, create_time)` 索引
4. 过期积分查询使用 `(expire_time)` 索引

## 数据迁移说明

### 实施步骤

1. ✅ 在 Prisma Schema 中定义所有模型和枚举
2. ✅ 使用 `prisma db push` 将模型同步到数据库
3. ✅ 使用 `prisma generate` 生成 Prisma Client
4. ✅ 验证所有表和索引已正确创建

### 验证结果

- **表数量**: 8个新表 + 1个扩展表
- **索引数量**: 25个索引
- **枚举类型**: 10个枚举
- **数据库状态**: ✅ 所有表和索引已成功创建

## 后续开发建议

### 1. Repository 层

- 继承 `BaseRepository` 或 `SoftDeleteRepository`
- 自动处理租户隔离
- 实现乐观锁重试机制

### 2. Service 层

- 使用 `@Transactional()` 装饰器管理事务
- 使用 `BusinessException` 处理业务异常
- 使用 `Result` 统一返回格式

### 3. 缓存策略

- 优惠券模板查询添加缓存
- 积分规则查询添加缓存
- 使用 `@Cacheable` 和 `@CachePut` 装饰器

### 4. 定时任务

- 每天凌晨清理过期优惠券
- 每天凌晨处理过期积分
- 使用 `@Cron` 装饰器配置定时任务

## 相关文档

- [需求文档](.kiro/specs/coupon-and-points-system/requirements.md)
- [设计文档](.kiro/specs/coupon-and-points-system/design.md)
- [任务列表](.kiro/specs/coupon-and-points-system/tasks.md)
- [Prisma Schema](prisma/schema.prisma)

## 更新日志

### 2025-01-28

- ✅ 创建所有数据库模型和枚举
- ✅ 扩展 OmsOrder 表支持优惠券和积分
- ✅ 创建所有必要的索引
- ✅ 验证数据库结构正确性
