# Nest-Admin-Soybean — LLM 速览

## 技术栈

- **Backend**：NestJS + Prisma + Redis
- **Admin**：Vue3 + Naive UI + Pinia
- **Miniapp**：uniapp + wot-design-uni

## 目录

- `apps/backend/src/module/` — 按能力域
- `apps/admin-web/src/views/` — 按模块/实体
- `libs/common-types` — API 类型（OpenAPI 生成）

## 必遵

- API 类型来自 `@libs/common-types`
- Backend：`Result.ok` / `BusinessException.throwIf`
- 提交前：`pnpm verify-monorepo`；`pnpm lint`；`pnpm typecheck`；`pnpm test`

## 低代码/配置化参考

- `config-operate-drawer.vue` — RuleSchema 动态表单 + Iframe 预览
- `template-operate-drawer.vue` — Schema Builder
- `rule-validator.service.ts` — 规则校验

## 运行（从根目录）

| 场景     | 命令                                                               |
| -------- | ------------------------------------------------------------------ |
| 开发     | `pnpm dev` / `pnpm dev:backend` / `pnpm dev:admin` / `pnpm dev:mp` |
| 构建     | `pnpm build`                                                       |
| 生成类型 | `pnpm generate-types`（先构建 backend）                            |
