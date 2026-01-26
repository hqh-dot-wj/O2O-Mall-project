# HQ vs Tenant 架构方案评审与优化报告

## 1. 现有方案审查 (Review)

根据项目规范 `backed.md` 及现有数据库 Schema (`schema.prisma`)，原方案存在以下不合理之处：

| 维度 | 原方案 (HQvsTantant.md) | 问题分析 (Why) | 解决方案 (Refined) |
| :--- | :--- | :--- | :--- |
| **异常处理** | `throw new Error("商品已下架")` | 违反异常处理规范，会导致返回 500 而非友好提示。 | 使用 `BusinessException.throwIf(...)`。 |
| **API 响应** | 返回特定错误码 `PRODUCT_NOT_FOUND` | 违反统一响应 `Result<T>` 规范。 | 使用 `Result.fail(ResponseCode.PRODUCT_NOT_FOUND)` 或抛出业务异常。 |
| **数据库字段** | `isDeleted Boolean` | 与现有 Schema 风格不符。现有表使用 `delFlag String @map("del_flag")` 配合枚举 `DelFlag`。 | 改用 `DelFlag` 枚举 ('0', '1')。 |
| **软删除实现** | 建议 Prisma Middleware | 虽然可行，但项目推荐使用 `SoftDeleteRepository` 模式，且 `delFlag` 是字符型而非布尔型。 | 遵循 `SoftDeleteRepository` 模式，或确保 Middleware 兼容字符型 flag。 |
| **性能 (DB)** | 购物车逻辑：遍历购物车列表逐个查库 | 典型 **N+1 查询** 问题 (Bad Smell)。高并发下会拖垮数据库。 | 使用 `where: { id: { in:ids } }` 批量查询，内存匹配。 |
| **并发控制** | 下单仅做 `if` 状态检查 | 存在 **并发竞态条件 (Race Condition)**。检查和扣减之间有时间差，可能超卖。 | 引入 **Redis Lua 脚本** 或 **乐观锁** (`version` 字段) 确保原子性。 |
| **硬编码** | 状态字符串 `ON_SHELF` | 存在 **魔法值 (Magic String)**。 | 使用 TypeScript `enum` 或 Prisma `enum`。 |
| **事务管理** | 未明确提及事务边界 | 扣库存、创建订单、快照必须在同一事务中。 | 明确使用 `@Transactional()` 装饰器。 |

---

## 2. 优化后的架构方案 (Refined Scheme)

### 🏛️ 第一部分：修正后的核心逻辑

#### 1. 购物车“失效”检测 (解决 N+1 问题)

*   **逻辑优化**：
    1.  前端调用 `cart/list` 接口。
    2.  后端 **一次性** 提取所有 `productId` 列表：`const pIds = carts.map(c => c.productId)`.
    3.  **批量查询** 最新状态：`prisma.pmsProduct.findMany({ where: { productId: { in: pIds } } })`.
    4.  内存中通过 Map 比对状态，标记 `isValid`.

#### 2. 下单并发风控 (解决超卖与一致性)

*   **场景**：总部下架/改价瞬间，用户正在提交订单。
*   **实现**：
    *   **Level 1 (应用层)**: 在 `OrderService` 中使用 `@Transactional()` 包裹。
    *   **Level 2 (原子性)**: 扣减库存/状态校验建议使用 Redis Lua 脚本，或者数据库乐观锁 `UPDATE ... SET stock = stock - 1 WHERE id = ? AND stock > 0 AND status = 'ON_SHELF'`. **利用数据库行锁的原子性**来做最终防线，而不是简单的 `if` 判断。

---

### 🛡️ 第三部分：系统设计建议 (修正版)

#### 1. 数据库规范：适配现有 Schema (Soft Delete)

遵循 `schema.prisma` 中的 `DelFlag` 枚举规范，而非 Boolean。

```prisma
// 引用自 schema.prisma
enum DelFlag {
  NORMAL @map("0")
  DELETE @map("1")
}

enum PublishStatus {
  OFF_SHELF // 下架
  ON_SHELF  // 上架
}

model PmsProduct {
  // ...
  // ✅ 修正：遵循项目规范的软删除字段
  delFlag    DelFlag  @default(NORMAL) @map("del_flag") 
  
  // ✅ 修正：遵循项目规范的审计字段
  createBy   String   @default("") @map("create_by") @db.VarChar(64)
  createTime DateTime @default(now()) @map("create_time")
  updateBy   String   @default("") @map("update_by") @db.VarChar(64)
  updateTime DateTime @updatedAt @map("update_time")
}
```

#### 2. 代码实现规范 (Code Snippets)

**A. 异常处理与断言 (Service Layer)**

```typescript
import { BusinessException } from 'src/common/exceptions';
import { ResponseCode } from 'src/common/code';

// ❌ 错误做法：throw new Error("商品已下架");

// ✅ 正确做法：使用断言工具类
async checkProductStatus(skuId: string) {
  const sku = await this.skuRepo.findById(skuId);
  
  // 校验是否存在 (404)
  BusinessException.throwIfNull(sku, '商品不存在'); 
  
  // 校验是否上架 (业务规则)
  BusinessException.throwIf(
    sku.status !== PublishStatus.ON_SHELF, 
    '商品已下架或暂停销售',
    ResponseCode.BUSINESS_ERROR
  );
  
  return sku;
}
```

**B. 统一响应 (Controller Layer)**

```typescript
@Get(':id')
async getProductDetail(@Param('id') id: string) {
  const product = await this.productService.findOne(id);
  // Service 层已处理 null 抛出异常，这里直接返回 OK
  return Result.ok(product);
}
```

**C. 批量查询优化 (Cart Service)**

```typescript
async checkCartItems(items: CartItem[]) {
  const ids = items.map(it => it.productId);
  
  // ✅ 最佳实践：使用 Where IN 避免循环查库
  const products = await this.productRepo.find({
    where: { 
      productId: { in: ids },
      delFlag: '0' // 显式过滤已删除
    }
  });
  
  const productMap = new Map(products.map(p => [p.productId, p]));
  
  return items.map(item => {
    const product = productMap.get(item.productId);
    // 判断逻辑...
    return { ...item, isValid: !!product && product.publishStatus === 'ON_SHELF' };
  });
}
```

---

### ⚠️ 风险与预防方案补全

除了原文档提到的风险，补充以下技术侧风险：

#### 11. 风险：数据库直接 Update 库存 (Last Write Wins)
*   **场景**：`product.stock = product.stock - 1; save(product);`
*   **问题**：并发时覆盖写入。
*   **预防**：
    *   **方案一**：`UPDATE pms_sku SET stock = stock - num WHERE id = ?` (推荐)
    *   **方案二**：Redis `DECR`命令预扣库存。

#### 12. 风险：大事务 (Long Transaction)
*   **场景**：在 `@Transactional` 方法里调用了第三方支付接口或发短信。
*   **问题**：数据库连接池耗尽。
*   **预防**：
    *   **原则**：**禁止在事务中进行 RPC/HTTP 请求**。
    *   **做法**：先在事务外准备数据/调第三方，拿到结果后再开启事务写库；或者事务提交后异步发送通知。
