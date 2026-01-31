# Client Upgrade 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
upgrade/
├── dto/
│   └── upgrade.dto.ts      # 输入校验：申请升级所需的 Dto (涵盖推荐码、目标等级等参数)
├── vo/
│   └── upgrade.vo.ts       # 输出渲染：推荐码信息、团队统计及申请状态 Vo
├── upgrade.controller.ts   # 路由控制：对外提供升级申请、推荐码获取及团队管理接口
├── upgrade.module.ts       # 模块配置：关联微信服务及图片上传模块以生成/保存码文件
└── upgrade.service.ts      # 业务逻辑：核心升级引擎、推荐关系重绑、小程序码自动生成及团队业绩统计
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **UmsMember (会员表)**：存储核心层级（`levelId`）及推荐关系（`parentId`, `indirectParentId`）。
- **UmsReferralCode (推荐码表)**：记录会员生成的推荐码、使用场景及使用次数，支撑“代理裂变”逻辑。
- **UmsUpgradeApply (升级申请表)**：记录升级的全过程，包括申请类型（扫码、购券、系统发放）及审核状态。
- **OmsOrder (订单表 - 逻辑引用)**：支撑团队总业绩（Total Sales）的穿透式统计。

**逻辑关联**：
- `UmsUpgradeApply` ➔ `UmsMember`：记录具体哪个会员在进行什么等级的提升。
- `UmsReferralCode` ➔ `UmsMember`：标记推荐码的持有者（必须是高阶会员 C2）。
- `UmsMember` ➔ `UmsMember`：通过 `parentId` 形成无限深度的推荐链路，但在财务层面仅核算两级（分销）。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `applyUpgrade` | `Transactional`, `Referrer Linkage` | 扫码入会。校验推荐码合法性后，**原子性**更新会员等级并重置其归属门店。 |
| `upgradeByOrder` | `Order Trigger`, `Auto-Leveling` | 购券升级。由订单支付成功事件触发，达成 C1/C2 升级包购买后的自动**权益分放**。 |
| `generateReferralCode` | `WechatWxaCode`, `Upload Service` | 码力生成。自动调用微信接口生成带 Scene 参数的小程序码，并持久化至云存储，作为**裂变触点**。 |
| `getTeamStats` | `Aggregation`, `Prisma.Decimal` | 团队罗盘。实时透视一二级团队人数及**团队总业绩**，支撑会员等级成就感。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **等级逆向保护**：严格限制 `levelId >= targetLevel` 时无法再次申请，防止业务逻辑产生重复扣款或关系混乱。
- **推荐人合法性校验**：扫码时强制校验推荐人是否为有效的 C2（股东）等级且账号启用，防止低级别用户或被禁用用户进行非法拉新。
- **分布式码生成安全**：生成小程序码时采取 `try-catch` 降级策略，即使微信接口异常，推荐码文字记录依然有效，保证了业务的**最终可用性**。
- **逻辑严谨性分析**：
    - *推荐人重绑定风险*：在 `applyUpgrade` 中，扫码行为会更新 `parentId`。如果用户已存在上级，此操作相当于“强制迁移”。需结合业务场景判定是否允许中途更换推荐人。
    - *业绩统计性能*：`getTeamStats` 在团队规模巨大时可能产生性能负担。建议后续对团队业绩采用**异步定时汇总**或 Redis 计数器方案。
    - *并发更新保护*：使用 `@Transactional` 包裹了关系更新、等级提升及申请表写入，确保了层级变更的强一致性，防止“只升级不改关系”的多头管理坏账。
