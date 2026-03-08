---
name: backend-third-party
description: >
  Integrate external APIs (payment, webhooks, third-party services).
  Trigger: user asks to integrate a payment gateway, webhook, or external API;
  connecting to WeChat/Alipay/OSS/SMS or similar third-party services.
---

# 第三方 API 对接规范

核心：**Adapter/Port 模式** + **韧性设计** + **HttpModule 统一**。

## Instructions

1. **评估官方 SDK**：查阅第三方官方文档，优先评估是否有官方 SDK；若无或不适配，采用 HttpModule。
2. **创建 Port**：在 `src/module/{domain}/ports/` 定义 abstract class，入参/出参用项目类型，不暴露第三方结构。
3. **创建 Adapter**：在 `src/module/{domain}/adapters/` 实现 Port，内部用 HttpService 或 Prisma 调用；转换时显式映射，避免透传第三方结构。
4. **注册依赖**：Module 中 `provide: Port, useClass: Adapter`。
5. **配置超时**：HttpModule.register({ timeout: 5000 })；高 QPS 接口可调低。
6. **配置重试**：仅幂等接口启用指数退避；非幂等禁止重试。
7. **熔断/降级**：下游异常比例高时熔断；降级用默认值、缓存或简化逻辑。
8. **单元测试**：mock HttpService 或 PrismaService，验证 Adapter 行为。

**强制**：禁止直接 axios/fetch；统一 HttpModule + HttpService。

## Example

**Port**（`finance/ports/member-query.port.ts`）：

```ts
export abstract class MemberQueryPort {
  abstract findMemberBrief(memberId: string): Promise<MemberBrief | null>;
}
```

**Adapter**（`finance/adapters/member-query.adapter.ts`）：

```ts
@Injectable()
export class MemberQueryAdapter extends MemberQueryPort {
  constructor(private readonly prisma: PrismaService) { super(); }
  async findMemberBrief(memberId: string) {
    const m = await this.prisma.umsMember.findUnique({ where: { memberId }, ... });
    return m ? { memberId, tenantId, levelId, ... } : null;
  }
}
```

**Module**：`provide: MemberQueryPort, useClass: MemberQueryAdapter`。

## Validation

- [ ] Port 出入参为项目类型，无第三方结构泄漏
- [ ] 业务 Service 仅注入 Port，不依赖 Adapter
- [ ] 超时/重试/熔断已配置
- [ ] Adapter 有单元测试
