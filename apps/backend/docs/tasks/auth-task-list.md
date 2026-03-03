# 认证模块 (Auth) 任务清单

> 来源：`apps/backend/docs/requirements/admin/auth/auth-requirements.md`
> 架构审查：⚠️ 补充（5 点已标注，不阻塞短期任务）
> 模块相态：运营态（功能补齐阶段）

## 架构审查补充点

1. **社交登录 SDK 选型**：JustAuth 是 Java 生态，Node.js 需替代方案（直接 OAuth API 或 Passport.js）
2. **Controller 职责过重**：验证码生成、租户查询逻辑应下沉到 Service 层
3. **UserAuthService 位置**：核心认证逻辑在 user 模块内，新增 TokenService 等应放在 auth 模块
4. **密码过期/历史**：确认为中期任务
5. **前端 API 契约**：refresh_token 前端已预留，需保持接口格式一致

---

## 短期任务（P0，1-2 周）

- [x] T-1: 创建 TokenService — 封装 Token 生成/验证/刷新逻辑，独立于 UserAuthService (1d) ✅ 2026-03-03
- [x] T-2: 实现 refresh_token 独立生成 — access_token 和 refresh_token 使用不同 JWT payload（type 字段区分），不同有效期 (0.5d) ✅ 2026-03-03
- [x] T-3: 实现 POST /auth/refresh 接口 — 验证 refresh_token、检查黑名单、生成新 Token 对、旧 token 加入黑名单 (1d) ✅ 2026-03-03
- [x] T-4: 修改登录接口返回独立的 refresh_token — 替换当前 `refresh_token = access_token` 的临时方案 (0.5d) ✅ 2026-03-03
- [x] T-5: 实现登录失败计数 — Redis INCR `login_fail:{tenantId}:{username}`，TTL 30 分钟 (0.5d) ✅ 2026-03-03
- [x] T-6: 实现账号锁定机制 — 连续失败 5 次设置锁定标记，登录前检查锁定状态，登录成功清除计数 (0.5d) ✅ 2026-03-03
- [x] T-7: 为 T-1 ~ T-6 编写 Process Spec 和单元测试 (2d) ✅ 2026-03-03

## 中期任务（P1，1-2 月）

- [x] T-8: 创建 SessionService — 封装会话管理逻辑 (0.5d) ✅ 2026-03-03
- [x] T-9: 实现在线用户查询接口 GET /system/online/list — 扫描 Redis 活跃会话 (1d) ✅ 2026-03-03
- [x] T-10: 实现强制下线接口 DELETE /system/online/:token — 删除 Redis 会话 (0.5d) ✅ 2026-03-03
- [x] T-11: Controller 职责下沉 — 将验证码生成、租户查询逻辑从 AuthController 移至 AuthService (1d) ✅ 2026-03-03
- [x] T-12: 社交登录 SDK 选型与 PoC — 直接 OAuth API（GitHub），策略模式支持扩展 (2d) ✅ 2026-03-03
- [x] T-13: 实现社交登录回调 POST /auth/social/callback — 策略模式，支持 GitHub OAuth (3d) ✅ 2026-03-03
- [x] T-14: 为 T-8 ~ T-13 编写 Process Spec 和单元测试 (2d) ✅ 2026-03-03

## 长期任务（P2-P3，3-6 月）

- [ ] T-15: 实现异地登录检测 — 记录常用 IP，异地登录发送通知 (3d)
- [ ] T-16: 实现密码过期策略 — 90 天强制修改，记录最近 3 次密码历史 (3d)
- [ ] T-17: 实现记住我功能 — 延长 Token 有效期 (1d)
- [ ] T-18: 实现多设备登录管理 — 限制同一账号登录设备数 (2d)
- [ ] T-19: SSO / OAuth2.0 预研与设计 (5d)
