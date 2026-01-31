# Client Common 模块文档

模型名称：Gemini 2.0 Flash、模型大小：未知、模型类型：对话模型及其修订版本：2026-05-14

### **1. 文件树与作用简述 (File Tree & Architecture)**

```text
common/
├── decorators/
│   └── member.decorator.ts    # 装饰器：便捷注入用户信息 @Member('memberId')
├── guards/
│   └── member-auth.guard.ts   # 守卫：C 端专属 JWT 认证校验
├── service/
│   └── wechat.service.ts      # 基础服务：微信 API 深度集成（Auth、手机号、小程序码）
└── client-common.module.ts    # 模块通配：导出公用服务供所有 C 端模块引用
```

---

### **2. 数据库表与逻辑关联 (Database & Relationships)**

- **本模块不直接持有物理表**：作为基础设施层，它通过 `PrismaService` 为上层模块（如 Auth、Address、Cart）提供数据支撑。
- **逻辑关联**：
    - **Redis**：`WechatService` 深度依赖 Redis 进行 `access_token` 的分布式锁定与缓存。
    - **Config**：从系统配置调取微信 `appId` 和 `secret`，支撑所有微信端到端调用。

---

### **3. 核心接口与业务闭环 (API & Business Closure)**

| 类/方法 | 技术关键词 | 业务闭环作用 |
| :--- | :--- | :--- |
| `WechatService.code2Session` | `jscode2session`, `Mock Mode` | 认证底座。将前端小程序 `code` 换取 `openid`，内置 **Mock 模式** 支撑前后端解耦开发。 |
| `WechatService.getAccessToken` | `Cache Lock`, `Auto-Refresh` | 指令塔。管理微信全局调用凭证，具备**自动续期**与提前 200 秒刷新的防失效保护。 |
| `WechatService.getPhoneNumber` | `wxa.business` | 数据补全。封装新版微信手机号获取流程，支撑“一键绑定”业务。 |
| `MemberAuthGuard` | `Passport`, `member-jwt` | 安全围栏。统一拦截未登录的 C 端请求，并将其解析至 `req.user`。 |
| `@Member` Decorator | `createParamDecorator` | 逻辑简化。提供平滑的代码书写体验，一行注解获取用户 ID。 |

---

### **4. 安全审计与逻辑严谨性 (Security & Logic Audit)**

- **缓存击穿防护**：`getAccessToken` 在高并发场景下通过 Redis 集中管理过期时间，虽然此处未实现显式的 Redis 分布式互斥锁，但通过缓存提前过期机制大大降低了击穿概率。
- **容错与后路**：微信 API 调用失败时（如 `errcode` 非 0），系统采取静默失败并打印 Error Log，防止因三方服务波动导致整个认证链路彻底瘫痪。
- **配置隔离校验**：在任何微信调用前执行 `AppID/Secret` 的非空校验，避免因部署配置缺失导致的“运行时谜之崩溃”。
- **攻击防护**：
    - *模拟攻击*：攻击者若通过 `mock-` 前缀尝试绕过微信验证。
    - *风险控制*：Mock 逻辑必须在生产环境通过环境变量禁用（当前代码中应注意此类测试逻辑的条件编译/配置隔离）。
    - *数据完整性*：小程序码生成接口（`getWxaCodeUnlimited`）强制限制 `scene` 长度为 32 字节，符合微信官方规范，防止因超长输入导致的 API 报错。
