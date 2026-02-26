# 商品级分佣配置设计文档

> 版本：1.0  
> 日期：2026-02-26  
> 任务：T-6 商品级分佣规则配置

## 1. 需求概述

支持按商品或品类设置差异化的分佣比例，覆盖租户默认配置。

### 1.1 业务场景

- 高利润商品设置更高的分佣比例，激励推广
- 低利润商品设置较低的分佣比例，保护利润
- 特定品类统一设置分佣规则
- 促销商品临时调整分佣策略

### 1.2 优先级规则

```
商品级配置 > 品类级配置 > 租户默认配置
```

## 2. 数据模型

### 2.1 表结构

```prisma
model SysDistProductConfig {
  id       Int    @id @default(autoincrement())
  tenantId String @map("tenant_id") @db.VarChar(20)

  // 商品或品类标识 (二选一)
  productId  String? @map("product_id") @db.VarChar(50)
  categoryId String? @map("category_id") @db.VarChar(50)

  // 分佣比例 (null表示使用租户默认值)
  level1Rate Decimal? @map("level1_rate") @db.Decimal(5, 2)
  level2Rate Decimal? @map("level2_rate") @db.Decimal(5, 2)

  // 佣金计算策略
  commissionBaseType CommissionBaseType? @map("commission_base_type")

  // 是否启用
  isActive Boolean @default(true) @map("is_active")

  createBy   String   @map("create_by") @db.VarChar(64)
  createTime DateTime @default(now()) @map("create_time")
  updateBy   String   @map("update_by") @db.VarChar(64)
  updateTime DateTime @updatedAt @map("update_time")

  @@unique([tenantId, productId], name: "uk_tenant_product")
  @@unique([tenantId, categoryId], name: "uk_tenant_category")
  @@index([tenantId, isActive])
  @@map("sys_dist_product_config")
}
```

### 2.2 字段说明

| 字段                 | 类型    | 说明                                 |
| -------------------- | ------- | ------------------------------------ |
| `productId`          | String? | 商品ID，与categoryId二选一           |
| `categoryId`         | String? | 品类ID，与productId二选一            |
| `level1Rate`         | Decimal | 一级分佣比例，null表示使用租户默认值 |
| `level2Rate`         | Decimal | 二级分佣比例，null表示使用租户默认值 |
| `commissionBaseType` | Enum    | 佣金基数类型，null表示使用租户默认值 |
| `isActive`           | Boolean | 是否启用，false表示软删除            |

### 2.3 约束

- `productId` 和 `categoryId` 必须有且仅有一个非空
- 同一租户下，同一商品或品类只能有一条有效配置
- `level1Rate + level2Rate ≤ 100%`

## 3. 接口设计

### 3.1 接口列表

| 接口               | 方法   | 路径                                       | 说明                         |
| ------------------ | ------ | ------------------------------------------ | ---------------------------- |
| 创建商品级配置     | POST   | `/store/distribution/product-config`       | 创建商品或品类配置           |
| 更新商品级配置     | PUT    | `/store/distribution/product-config/:id`   | 更新指定配置                 |
| 删除商品级配置     | DELETE | `/store/distribution/product-config/:id`   | 软删除（设置isActive=false） |
| 查询商品级配置列表 | GET    | `/store/distribution/product-config/list`  | 分页查询配置列表             |
| 查询单个商品配置   | GET    | `/store/distribution/product-config/:id`   | 查询指定配置详情             |
| 批量导入配置       | POST   | `/store/distribution/product-config/batch` | 批量创建或更新配置           |

### 3.2 DTO 定义

#### CreateProductConfigDto

```typescript
export class CreateProductConfigDto {
  @ApiProperty({ description: '商品ID (与categoryId二选一)', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: '品类ID (与productId二选一)', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: '一级分佣比例 (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  level1Rate?: number;

  @ApiProperty({ description: '二级分佣比例 (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  level2Rate?: number;

  @ApiProperty({ description: '佣金基数类型', enum: CommissionBaseType, required: false })
  @IsOptional()
  @IsEnum(CommissionBaseType)
  commissionBaseType?: CommissionBaseType;
}
```

#### ListProductConfigDto

```typescript
export class ListProductConfigDto extends PageQueryDto {
  @ApiProperty({ description: '商品ID', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: '品类ID', required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
```

### 3.3 VO 定义

```typescript
export class ProductConfigVo {
  @ApiProperty({ description: '配置ID' })
  id: number;

  @ApiProperty({ description: '商品ID', required: false })
  productId?: string;

  @ApiProperty({ description: '品类ID', required: false })
  categoryId?: string;

  @ApiProperty({ description: '一级分佣比例 (0-100)', required: false })
  level1Rate?: number;

  @ApiProperty({ description: '二级分佣比例 (0-100)', required: false })
  level2Rate?: number;

  @ApiProperty({ description: '佣金基数类型', required: false })
  commissionBaseType?: string;

  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  createTime: string;

  @ApiProperty({ description: '更新时间' })
  updateTime: string;
}
```

## 4. 业务逻辑

### 4.1 配置查询逻辑

```typescript
/**
 * 获取商品的有效分佣配置
 * 优先级：商品级 > 品类级 > 租户默认
 */
async getEffectiveConfig(tenantId: string, productId: string, categoryId: string) {
  // 1. 查询商品级配置
  const productConfig = await this.prisma.sysDistProductConfig.findFirst({
    where: { tenantId, productId, isActive: true },
  });
  if (productConfig) return this.mergeConfig(tenantConfig, productConfig);

  // 2. 查询品类级配置
  const categoryConfig = await this.prisma.sysDistProductConfig.findFirst({
    where: { tenantId, categoryId, isActive: true },
  });
  if (categoryConfig) return this.mergeConfig(tenantConfig, categoryConfig);

  // 3. 返回租户默认配置
  return tenantConfig;
}

/**
 * 合并配置（商品/品类配置覆盖租户默认值）
 */
private mergeConfig(tenantConfig, productConfig) {
  return {
    level1Rate: productConfig.level1Rate ?? tenantConfig.level1Rate,
    level2Rate: productConfig.level2Rate ?? tenantConfig.level2Rate,
    commissionBaseType: productConfig.commissionBaseType ?? tenantConfig.commissionBaseType,
    // 其他字段使用租户配置
    enableLV0: tenantConfig.enableLV0,
    enableCrossTenant: tenantConfig.enableCrossTenant,
    crossTenantRate: tenantConfig.crossTenantRate,
    crossMaxDaily: tenantConfig.crossMaxDaily,
    maxCommissionRate: tenantConfig.maxCommissionRate,
  };
}
```

### 4.2 校验规则

1. **互斥性校验**：`productId` 和 `categoryId` 必须有且仅有一个非空
2. **比例校验**：`level1Rate + level2Rate ≤ 100%`
3. **唯一性校验**：同一租户下，同一商品或品类只能有一条有效配置
4. **权限校验**：只能操作本租户的配置

### 4.3 软删除

- 删除操作不物理删除记录，而是设置 `isActive = false`
- 查询时默认只返回 `isActive = true` 的记录
- 支持通过参数查询已删除的配置（审计需要）

## 5. 影响范围

### 5.1 需要修改的模块

1. **佣金计算模块** (`finance/commission`)
   - 计算佣金时需要查询商品级配置
   - 使用 `getEffectiveConfig` 获取最终配置

2. **佣金预估接口** (`distribution.service.ts`)
   - 预估佣金时需要考虑商品级配置

### 5.2 向后兼容性

- 现有租户级配置继续有效
- 未配置商品级规则的商品使用租户默认配置
- 不影响现有佣金计算逻辑

## 6. 测试用例

### 6.1 单元测试

- 创建商品级配置（正常/异常）
- 创建品类级配置（正常/异常）
- 更新配置
- 软删除配置
- 查询配置列表（分页/筛选）
- 配置优先级测试（商品 > 品类 > 租户）
- 配置合并测试

### 6.2 集成测试

- 佣金计算使用商品级配置
- 佣金预估使用商品级配置
- 跨模块配置查询

## 7. 实施计划

### 7.1 第一阶段：基础CRUD（1天）

- [x] Prisma schema 定义
- [ ] DTO/VO 定义
- [ ] Controller 实现
- [ ] Service 基础CRUD
- [ ] 单元测试

### 7.2 第二阶段：配置查询逻辑（0.5天）

- [ ] `getEffectiveConfig` 实现
- [ ] 配置合并逻辑
- [ ] 优先级测试

### 7.3 第三阶段：集成改造（0.5天）

- [ ] 佣金计算模块集成
- [ ] 佣金预估接口集成
- [ ] 集成测试

### 7.4 第四阶段：批量导入（可选，0.5天）

- [ ] 批量导入接口
- [ ] Excel 模板
- [ ] 导入校验

## 8. 风险与注意事项

### 8.1 性能风险

- 每次计算佣金都需要查询商品级配置，可能影响性能
- **缓解方案**：使用 Redis 缓存商品级配置，TTL 5分钟

### 8.2 数据一致性

- 商品或品类删除后，对应的分佣配置如何处理
- **建议**：保留配置但标记为无效，避免历史数据问题

### 8.3 配置冲突

- 商品同时属于多个品类时，如何选择品类配置
- **建议**：只支持单品类配置，或明确品类优先级规则

## 9. 后续优化

- 支持配置生效时间（延迟生效）
- 支持配置版本管理
- 支持配置模板（快速应用到多个商品）
- 支持配置审批流程
