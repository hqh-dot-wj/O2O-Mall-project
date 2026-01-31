# Client Auth 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
auth/
├── dto/
│   └── auth.dto.ts         # 输入校验：登录、注册、手机号绑定等 Dto
├── strategies/
│   └── member.strategy.ts  # 认证策略：基于 JWT 的 C 端用户身份解析
├── vo/
│   └── auth.vo.ts          # 输出渲染：登录结果等 Vo
├── auth.controller.ts      # 路由控制：对外提供小程序认证相关的 REST 接口
├── auth.module.ts          # 模块配置：集成 JWT、Passport 及微信服务
└── auth.service.ts         # 业务逻辑：微信登录/注册逻辑及推荐关系绑定
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **SysSocialUser (社交用户表)**：存储微信 `openid`、`unionid` 及小程序 `sessionKey`。
- **UmsMember (会员表)**：C 端用户核心表，存储手机号、昵称、等级、上级推荐关系等。
- **SysTenant (租户表)**：校验用户所属门店。
- **SysDistConfig (分销配置表)**：校验是否开启跨店分销。

**逻辑关联**：
- `SysSocialUser.memberId` ➔ `UmsMember.memberId`：建立微信身份与业务用户的 1:1 映射。
- `UmsMember.parentId` ➔ `UmsMember.memberId`：建立一二级分销推荐树。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `checkLogin` | `code2Session`, `Silent Login` | 静默登录。通过微信 `code` 校验是否已注册，实现**无感登录**。 |
| `register` | `Transactional`, `Referrer Link` | 快捷注册。创建用户并**原子性**写入社交关系。核心逻辑包含**跨店/同店推荐人自动绑定**。 |
| `bindPhone` | `getPhoneNumber` | 会员升值。通过微信开放接口获取手机号并绑定，补全用户核心资料。 |
| `registerMobile` | `One-Click Login` | 一键登录/注册方案。兼容直接获取手机号并完成注册的闭环。 |
| `genToken` | `Redis`, `UUID`, `JWT` | 令牌分发。生成 JWT 并将用户信息缓存至 Redis，实现**有状态的令牌管理**。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **推荐关系保护**：在 `register` 时，严格校验推荐人 `levelId >= 1`（确保是分销商）及 `enableCrossTenant` 配置，防止非法层级关联或绕过门店限制。
- **令牌安全性**：通过 `Redis` 存储生成的 UUID，支持 `logout` 时的**精准令牌作废**。
- **事务一致性**：注册流程使用 `prisma.$transaction`，确保 `UmsMember` 和 `SysSocialUser` 的创建要么同时成功，要么同时失败。
- **手机号防冒用**：在 `bindPhone` 时校验手机号唯一性，防止不同账号绑定同一手机号。
- **数据完整性**：
    - *针对攻击者*：如伪造 `referrerId`，系统会通过数据库查询校验该 ID 的合法性及等级，非分销商无法建立上级关系。
    - *逻辑缺陷*：目前的微信 `session_key` 更新逻辑依赖于显式的登录行为，若长期未登录可能导致某些依赖微信加密数据的操作失效。
