# Client User 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
user/
├── vo/
│   └── user.vo.ts          # 输出渲染：用户基本信息及等级 Vo
├── user.controller.ts      # 路由控制：提供个人信息获取接口
├── user.module.ts          # 模块配置：Prisma 服务注入
└── user.service.ts         # 业务逻辑：用户信息查询与补全
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **UmsMember (会员表)**：存储 C 端用户核心档案。

**逻辑关联**：
- 该模块是 `UmsMember` 表的高频查询入口，支撑小程序个人中心的数据渲染。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 接口方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `info` | `findUnique`, `memberId` | 个人中心。基于 JWT 解析出的 `memberId` 获取用户档案，并执行层级默认值补全。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **精准越权防护**：通过 `AuthGuard('member-jwt')` 强制拦截，确保请求必须携带有效 Token，且 `info` 接口仅能查询当前登录者自己的数据。
- **数据存在性校验**：内置 `BusinessException.throwIfNull` 卫语句，防止无效 ID 或已注销账号导致的后续空指针错误。
- **逻辑严谨性分析**：
    - *灵活性*：目前的 `info` 实现较为轻量，直接返回 `UmsMember` 模型数据（包含层级补全逻辑），易于扩展。
    - *风险点*：直接扩展全量模型数据时，需注意对敏感字段（如删除标记、注册 IP 等）在 VO 层进行过滤。
