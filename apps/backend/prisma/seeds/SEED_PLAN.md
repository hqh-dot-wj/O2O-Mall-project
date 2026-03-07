# 种子数据填充计划

> 按业务流程设计：总部准备 → 开通租户 → 分配权限 → 选品 → C 端使用

---

## 一、业务流程总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. 总部准备                                                              │
│     商品分类(10+ 百货+素质教育) → 品牌 → 属性模板 → 总部商品(属性丰富)     │
│     营销模板(GROUP_BUY/COURSE_GROUP_BUY/FLASH_SALE/FULL_REDUCTION/       │
│             MEMBER_UPGRADE)                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  2. 系统配置                                                              │
│     字典、系统配置、分佣规则(一级4% 二级6%)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  3. 开通租户                                                              │
│     创建租户 → 分配套餐 → 创建管理员(部门/角色/用户) → 不同套餐不同权限   │
├─────────────────────────────────────────────────────────────────────────┤
│  4. 租户选品与配置                                                        │
│     门店从选品中心导入商品 → 设置价格库存 → 配置积分规则/优惠券/营销活动   │
├─────────────────────────────────────────────────────────────────────────┤
│  5. C 端数据                                                              │
│     会员(随机+上下级推荐关系) → 地址/钱包/积分 → 领券 → 下单(可选)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据明细

### 2.1 商品分类（≥10，偏百货 + 素质教育）

| 一级     | 二级     | bindType |
| -------- | -------- | -------- |
| 百货零售 | 家居用品 | REAL     |
| 百货零售 | 美妆个护 | REAL     |
| 百货零售 | 母婴用品 | REAL     |
| 百货零售 | 数码配件 | REAL     |
| 百货零售 | 食品饮料 | REAL     |
| 素质教育 | 艺术培训 | SERVICE  |
| 素质教育 | 体育培训 | SERVICE  |
| 素质教育 | 语言培训 | SERVICE  |
| 素质教育 | 科创培训 | SERVICE  |
| 素质教育 | 思维培训 | SERVICE  |

### 2.2 总部商品（属性丰富）

- 百货类：每类 1–2 个商品，多规格（颜色/尺寸/容量），属性模板完整
- 素质教育类：每类 1–2 个课程，规格含课时包/班型，含服务时长、服务半径等

**商品属性值（PmsProductAttrValue）**：按 attr-templates 定义的属性为每个商品填充：

| 模板             | 属性 (attrId) | 百货示例                    | 课程示例            |
| ---------------- | ------------- | --------------------------- | ------------------- |
| 百货商品参数     | 1 材质        | 塑料、棉质无纺布、塑料+金属 | -                   |
|                  | 2 规格        | 500ml/1000ml、50g/100g      | -                   |
|                  | 3 颜色        | 透明、蓝色/粉色、白色       | -                   |
|                  | 4 产地        | 中国、新疆                  | -                   |
| 素质教育课程参数 | 101 班型      | -                           | 小班(6-8人)/一对一  |
|                  | 102 级别      | -                           | 启蒙、启蒙班/初级班 |
|                  | 103 课时包    | -                           | 10节/20节、按学期   |
|                  | 104 适用年龄  | -                           | 4-12岁、6-12岁      |

### 2.3 营销模板（项目已有 5 种全部补齐）

| code             | name     | ruleSchema 字段                              |
| ---------------- | -------- | -------------------------------------------- |
| GROUP_BUY        | 普通拼团 | targetCount, price, duration                 |
| COURSE_GROUP_BUY | 拼班课程 | minCount, maxCount, price, ...               |
| FLASH_SALE       | 限时秒杀 | flashPrice, totalStock, startTime, endTime   |
| FULL_REDUCTION   | 满减活动 | tiers[], applicableScope, startTime, endTime |
| MEMBER_UPGRADE   | 会员升级 | targetLevel, price, autoApprove              |

### 2.4 优惠券

- 满减券 2 张、折扣券 1 张、兑换券 1 张（租户 000000 + 1–2 个普通租户）

### 2.5 积分规则

- 消费积分、签到积分、抵扣规则均启用，参数适中

### 2.6 分佣

- 一级 4%、二级 6%
- **商品级**：租户 SKU 的 `distRate=1`（100% 参与分佣基数），`distMode=RATIO`
- **汇总公式**：实际总佣金占商品价 = `distRate × (level1Rate + level2Rate)` = 1 × 10% = 10%

### 2.7 会员

- 每租户 10–15 个，随机昵称/手机，**必须含 referrerId 上下级**

---

## 三、脚本目录结构

```
prisma/seeds/
├── SEED_PLAN.md
├── index.ts                 # 主入口，按序调用各阶段
├── 01-hq-foundation/        # 总部基础
│   ├── categories.ts
│   ├── brands.ts
│   ├── attr-templates.ts
│   ├── products.ts
│   └── play-templates.ts
├── 02-system-config/       # 系统配置
│   ├── dict-config.ts
│   └── dist-config.ts
├── 03-tenants/             # 租户开通
│   ├── packages-clients.ts
│   ├── tenants.ts
│   └── tenant-admins.ts
├── 04-tenant-selection/    # 租户选品与配置
│   ├── tenant-products.ts
│   └── tenant-marketing.ts
├── 05-c-end/               # C 端数据
│   ├── members.ts
│   ├── member-extras.ts
│   └── coupons-issued.ts
└── reset/
    └── clear-business-data.ts  # 保留
```

---

## 四、删除的旧脚本

| 文件                                             | 说明                                           |
| ------------------------------------------------ | ---------------------------------------------- |
| prisma/seed.ts                                   | 替换为调用 seeds/index.ts 的新逻辑             |
| prisma/seeds/data/seed-templates.ts              | 合并到 01-hq-foundation/play-templates.ts      |
| prisma/seeds/data/seed-coupon-templates.ts       | 合并到 04-tenant-selection/tenant-marketing.ts |
| prisma/seeds/data/seed-points-rules.ts           | 同上                                           |
| prisma/seeds/data/seed-course.ts                 | 课程逻辑并入 products 或单独保留精简版         |
| prisma/seeds/data/seed-course-products.ts        | 并入 01-hq-foundation/products.ts              |
| prisma/seeds/data/file-management-config.seed.ts | 视需要并入 02-system-config                    |
| scripts/seed-demo-tenants.ts                     | 逻辑拆入 03/04/05 各阶段                       |

---

## 五、执行顺序

```
1. 01-hq-foundation/* （无依赖）
2. 02-system-config/* （依赖 000000 租户）
3. 03-tenants/* （依赖 package、client）
4. 04-tenant-selection/* （依赖 租户、商品、PlayTemplate）
5. 05-c-end/* （依赖 租户、会员、优惠券模板）
```
