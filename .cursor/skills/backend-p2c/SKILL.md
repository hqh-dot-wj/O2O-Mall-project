---
name: backend-p2c
description: >
  Generate NestJS backend code (Controller, Service, Repository, DTO)
  from a structured PRD or requirements document.
  Trigger: user provides a PRD, requirement spec, or asks to implement
  a backend feature from requirements; creating new endpoints or modules.
---

# Backend P2C（需求到代码）

根据 PRD 生成后端代码时，先将需求结构化为接口规约，再按规约生成。**穷举每个分支，禁止模糊；每条规则有 Rule ID，每个 Rule ID 有测试**。

## Instructions

1. **结构化 PRD**：从需求提取或构建 `BackendStructuredPRD`，包含 `EndpointSpec[]`。每个 EndpointSpec 必须含：method、path、summary、tenantType、caller、sloCategory、request、response、scenarios、errorCases。
2. **穷举场景**：为每个 endpoint 写出所有 `ScenarioSpec`（given、when、then、ruleId）；错误场景显式穷举（参数非法、权限不足、状态不允许、资源不存在等）；状态转换单独列出。
3. **生成 DTO/VO**：在 `src/module/{domain}/{entity}/dto/`、`vo/` 创建请求/响应类型，与 EndpointSpec 对齐；优先复用 `@libs/common-types`。
4. **生成 Repository**：继承 `SoftDeleteRepository` 或 `BaseRepository`，路径 `xxx.repository.ts`。
5. **生成 Service**：主入口协调，子方法按 `validate*`、`check*`、`do*`、`apply*Rules`、`transition*State` 分解；每个 ruleId 对应可测逻辑。
6. **生成 Controller**：`@ApiTags`、`@Controller`、`@ApiBearerAuth`；统一 `Result.ok`/`Result.fail`；标明 `@tenantScope`。
7. **注册模块**：在 `xxx.module.ts` 注册 Controller、Service、Repository。
8. **补测试**：为每个 ruleId 编写至少 1 条测试，见 `process-testing` skill。

Rule ID 格式：`R-{CATEGORY}-{DOMAIN}-{SEQ}`（如 R-IN-ADDR-001）。字段详见 `references/endpoint-spec-template.md`。

## Example

**输入（EndpointSpec 片段）**：

```yaml
method: PUT
path: /client/address/:id/default
summary: 设为默认地址
tenantType: TenantScoped
caller: client
sloCategory: list-query
request: { id: string } # path param
response: AddressVo
scenarios:
  - given: 会员已登录，地址 id 存在且属于该会员
    when: 调用 PUT /client/address/:id/default
    then: 该地址设为默认，其他地址取消默认，返回更新后的地址
    ruleId: R-FLOW-ADDR-001
  - given: 地址 id 不存在或不属于该会员
    when: 调用 PUT
    then: 抛出「地址不存在」
    ruleId: R-PRE-ADDR-001
errorCases:
  - 地址不存在 -> BusinessException
  - 未登录/无权限 -> 401
```

**输出（生成产物）**：Controller 方法、Service 中 `setDefaultAddress` + `checkAddressOwnership`、Repository 中 `clearDefault`/`setDefault`、对应 `.spec.ts` 测试用例。

## Validation

- [ ] 每个 EndpointSpec 的 ruleId 至少对应 1 条测试
- [ ] DTO/VO 类型与 `@libs/common-types` 或模块内一致，无 `any`
- [ ] Controller 标明 `@tenantScope`（TenantScoped / PlatformOnly / TenantAgnostic）
- [ ] Service public 方法有 JSDoc：`@param`、`@returns`、`@throws`
- [ ] `pnpm --filter @apps/backend typecheck` 通过
- [ ] `pnpm --filter @apps/backend test -- {module}` 通过
