# Nest-Admin-Soybean AI Coding Agent Instructions

## Project Overview

Nest-Admin-Soybean is a full-stack enterprise admin system with:
- **Backend**: NestJS + Prisma + PostgreSQL (in `server/`)
- **Frontend**: Vue 3 + Naive UI + Vite + UnoCSS (in `admin-naive-ui/`)
- **Architecture**: Multi-tenant SaaS with RBAC, request encryption, comprehensive logging

## Critical Architecture Patterns

### Multi-Tenant Data Isolation

Every database query is automatically filtered by `tenantId` via Prisma extensions (`server/src/common/tenant/tenant.extension.ts`). The super admin tenant is `'000000'`.

**Key decorators:**
- `@IgnoreTenant()` - Skip tenant filtering (e.g., system-wide queries)
- Use `TenantContext.getTenantId()` to access current tenant in services

**Models with tenant isolation:** SysConfig, SysDept, SysDictData, SysDictType, SysJob, SysLogininfor, SysMenu, SysNotice, SysOperLog, SysPost, SysRole, SysUpload, SysUser

### Authentication & Authorization

**Guards applied globally** (order matters in `app.module.ts`):
1. `TenantGuard` - Sets tenant context from request headers
2. `JwtAuthGuard` - Validates JWT token
3. `RolesGuard` - Checks user roles
4. `PermissionGuard` - Validates API permissions

**Key decorators:**
- `@NotRequireAuth()` - Skip authentication (e.g., login, captcha)
- `@RequirePermission('system:user:add')` - Require specific permission
- `@RequireRole('admin')` - Require specific role
- `@User()` - Inject current user into controller parameter

**Whitelist routes** are configured in `config/index.ts` under `perm.router.whitelist`.

### Request/Response Encryption

Frontend encrypts sensitive requests (login, password changes) using AES + RSA hybrid encryption:
1. Frontend generates AES key, encrypts data with AES-CBC
2. RSA-encrypts the AES key with server's public key
3. Sends `{encryptedKey, encryptedData}` with `x-encrypted: 'true'` header

**Backend decryption** happens in `DecryptInterceptor` (applied globally). Use `@SkipDecrypt()` to bypass for specific endpoints.

**Encryption setup:** Run `pnpm generate:keys` to create RSA key pairs in `server/keys/`.

### Database & ORM (Prisma)

**Core service:** `PrismaService` builds connection from env config (not `DATABASE_URL`). Connection string built from `db.postgresql.*` config in `config/index.ts`.

**Key commands:**
- `pnpm prisma:generate` - Generate Prisma client after schema changes
- `pnpm prisma:migrate` - Create and apply migrations
- `pnpm prisma:seed` - Reset DB and seed with initial data (includes Redis flush)
- `pnpm prisma:reset` - Reset migrations + seed data

**Tenant extension:** All Prisma queries automatically use `tenantExtension` from `prisma.service.ts`, which injects tenant filters.

## Development Workflows

### Starting the Application

**Backend:**
```bash
cd server
pnpm start:dev  # Development with hot reload (PORT 8080)
# or use VS Code task: "Start NestJS Server"
```

**Frontend:**
```bash
cd admin-naive-ui
pnpm dev  # Development server (PORT 9527)
```

**Environment files:** `.env.development`, `.env.test`, `.env.production` - Environment is set via `NODE_ENV`.

### Frontend Build System

Uses **pnpm workspaces** with internal packages in `admin-naive-ui/packages/`:
- `@sa/axios`, `@sa/hooks`, `@sa/utils` - Core utilities
- `@sa/materials` - UI components
- `@sa/tinymce` - Rich text editor
- `@sa/scripts` - Build scripts

**Route generation:** Uses `@elegant-router/vue` plugin that auto-generates routes from `src/views/` folder structure. Config in `build/plugins/router.ts`.

### Code Generation

**Backend:** NestJS CLI for scaffolding modules:
```bash
nest g module feature
nest g controller feature
nest g service feature
```

**Frontend route generation:**
```bash
pnpm gen-route  # Regenerate route definitions from views
```

### Logging & Monitoring

**Structured logging** with Pino (configured in `common/logger/`):
- Auto-logs all HTTP requests with `requestId`, `tenantId`, `username`
- Sensitive fields (`password`, `token`, etc.) are auto-redacted
- Development: colorized console output
- Production: JSON logs to `/var/log/nest-admin-soybean/`

**Health checks:**
- `/api/health` - Full health (DB, Redis, memory, disk)
- `/api/health/liveness` - K8s liveness probe
- `/api/health/readiness` - K8s readiness probe

**Metrics:** `/api/metrics` - Prometheus metrics endpoint

**Request ID tracking:** Every request gets UUID via `nestjs-cls`. Access via `ClsService.get('requestId')`.

## Project-Specific Conventions

### Backend Code Patterns

**Controller decorators:**
```typescript
@Api({
  summary: 'User login',
  type: LoginVo,  // Response type for Swagger
  body: LoginDto,  // Request type
  security: false  // Disable auth requirement in docs
})
```

**User metadata injection:**
```typescript
@UserTool() userTool: UserToolType  // Auto-injects createBy/updateBy
userTool.injectCreate(data);
```

**Operation logging:**
```typescript
@Operlog({
  businessType: BusinessTypeEnum.DELETE,
  title: 'Delete User'
})
```

**File locations:**
- Controllers: `module/{domain}/{feature}/{feature}.controller.ts`
- Services: `module/{domain}/{feature}/{feature}.service.ts`
- DTOs: `module/{domain}/{feature}/dto/{feature}.dto.ts`
- VOs: `module/{domain}/{feature}/vo/{feature}.vo.ts`

### Frontend Code Patterns

**Pinia stores** use setup syntax:
```typescript
export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const token = ref(getToken());
  // ... store logic
  return { token, ... };
});
```

**API calls** use `@sa/axios` flat request wrapper:
```typescript
export function fetchLogin(data: LoginDto) {
  return request<LoginVo>({ url: '/login', method: 'POST', data });
}
```

**Route structure:** File-based routing via elegant-router. View files in `src/views/{module}/` auto-generate routes.

**Styling:** UnoCSS with custom preset in `packages/uno-preset/`. Use Tailwind-like utilities.

## Key Configuration Files

- `server/src/config/index.ts` - Single source of truth for all backend config (NOT .env directly)
- `server/prisma/schema.prisma` - Database schema
- `admin-naive-ui/.env.{environment}` - Frontend env vars (API URLs, feature flags)
- `admin-naive-ui/build/config/proxy.ts` - Dev proxy configuration

## Common Pitfalls

1. **Don't bypass tenant context** - Use `@IgnoreTenant()` only for truly global queries
2. **Generate Prisma client** after any schema change (`pnpm prisma:generate`)
3. **Environment config** - Backend reads from `config/index.ts`, not directly from env vars
4. **Global guards order** - Auth guard must run before permission guard
5. **Frontend routes** - Don't manually edit route files; modify views and run `pnpm gen-route`
6. **Redis cache keys** - Use constants from `common/enum/cache.enum.ts`
7. **Decorator stacking** - `@NotRequireAuth()` must be before HTTP method decorators

## Testing & Deployment

**Backend tests:**
```bash
pnpm test        # Unit tests
pnpm test:e2e    # E2E tests
```

**Deployment:**
```bash
# Backend
pnpm build:prod
pnpm deploy:prod  # Uses scripts/deploy.cjs

# Frontend
pnpm build
pnpm deploy:prod
```

**PM2 config:** `server/scripts/ecosystem.config.cjs` for production process management.

## Documentation References

- `server/IMPLEMENTATION_SUMMARY.md` - Logging/monitoring implementation details
- `server/LOGGING_MONITORING.md` - Full logging configuration guide
- `server/docs/MULTI_TENANT_MIGRATION.md` - Multi-tenant migration guide
- `admin-naive-ui/docs/README.md` - Code generation templates
