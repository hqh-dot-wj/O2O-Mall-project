# RBAC 权限系统

Nest-Admin-Soybean 实现了完善的 RBAC (Role-Based Access Control) 权限控制系统，支持菜单、按钮级别的细粒度权限管理。

## 什么是 RBAC

RBAC 是一种基于角色的访问控制模型，通过角色来间接授予用户权限，而不是直接为用户分配权限。

### 核心概念

```
用户 (User) → 角色 (Role) → 权限 (Permission) → 资源 (Resource)
```

- **用户 (User)**: 系统的使用者
- **角色 (Role)**: 权限的集合，如管理员、普通用户
- **权限 (Permission)**: 对资源的操作权限，如 `system:user:add`
- **菜单 (Menu)**: 可访问的页面和功能

## 权限模型

### 1. 数据模型

```prisma
// 用户表
model SysUser {
  id       String    @id @default(uuid())
  username String    @db.VarChar(50)
  roles    SysRole[] @relation("UserRoles")
  dept     SysDept?  @relation(fields: [deptId], references: [id])
  deptId   String?
  // ...
}

// 角色表
model SysRole {
  id          String    @id @default(uuid())
  roleName    String    @db.VarChar(30)
  roleKey     String    @db.VarChar(100)
  dataScope   String    @default("1") // 数据权限范围
  users       SysUser[] @relation("UserRoles")
  menus       SysMenu[] @relation("RoleMenus")
  depts       SysDept[] @relation("RoleDepts")
  // ...
}

// 菜单表（包含权限）
model SysMenu {
  id         String    @id @default(uuid())
  menuName   String    @db.VarChar(50)
  permission String?   @db.VarChar(100) // 权限标识
  menuType   String    @db.VarChar(1)   // M=目录 C=菜单 F=按钮
  path       String?   @db.VarChar(200)
  component  String?   @db.VarChar(255)
  roles      SysRole[] @relation("RoleMenus")
  // ...
}
```

### 2. 数据权限范围

系统支持多种数据权限范围：

| 范围代码 | 说明 | 数据范围 |
|---------|------|---------|
| 1 | 全部数据权限 | 可以查看所有数据 |
| 2 | 自定义数据权限 | 只能查看指定部门的数据 |
| 3 | 本部门数据权限 | 只能查看本部门的数据 |
| 4 | 本部门及以下数据权限 | 可以查看本部门及子部门的数据 |
| 5 | 仅本人数据权限 | 只能查看自己创建的数据 |

## 权限验证

### 1. 守卫链

系统使用守卫链实现权限验证，执行顺序很重要：

```typescript
// app.module.ts
const app = await NestFactory.create(AppModule)

// 守卫执行顺序
app.useGlobalGuards(
  new TenantGuard(),      // 1. 设置租户上下文
  new JwtAuthGuard(),     // 2. 验证 JWT 令牌
  new RolesGuard(),       // 3. 验证角色
  new PermissionGuard()   // 4. 验证权限
)
```

### 2. 权限守卫

位置：`server/src/common/guards/permission.guard.ts`

```typescript
@Injectable()
export class PermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler()
    
    // 检查是否跳过权限验证
    const notRequireAuth = this.reflector.get<boolean>(
      'notRequireAuth',
      handler
    )
    if (notRequireAuth) return true
    
    // 获取所需权限
    const requiredPermission = this.reflector.get<string>(
      'permission',
      handler
    )
    if (!requiredPermission) return true
    
    // 获取用户权限
    const request = context.switchToHttp().getRequest()
    const user = request.user
    const userPermissions = await this.getUserPermissions(user.id)
    
    // 验证权限
    return userPermissions.includes(requiredPermission)
  }
}
```

### 3. 权限装饰器

位置：`server/src/common/decorators/permission.decorator.ts`

```typescript
// 要求特定权限
export const RequirePermission = (permission: string) =>
  SetMetadata('permission', permission)

// 要求特定角色
export const RequireRole = (role: string) =>
  SetMetadata('role', role)

// 跳过权限验证
export const NotRequireAuth = () =>
  SetMetadata('notRequireAuth', true)
```

## 使用方法

### 1. 控制器级别权限

```typescript
@Controller('system/user')
@RequirePermission('system:user')
export class UserController {
  
  // 查询用户列表 - 需要 system:user:list 权限
  @Get('list')
  @RequirePermission('system:user:list')
  async list() {
    return this.userService.findAll()
  }
  
  // 添加用户 - 需要 system:user:add 权限
  @Post()
  @RequirePermission('system:user:add')
  async create(@Body() data: CreateUserDto) {
    return this.userService.create(data)
  }
  
  // 修改用户 - 需要 system:user:edit 权限
  @Put()
  @RequirePermission('system:user:edit')
  async update(@Body() data: UpdateUserDto) {
    return this.userService.update(data)
  }
  
  // 删除用户 - 需要 system:user:remove 权限
  @Delete(':id')
  @RequirePermission('system:user:remove')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id)
  }
  
  // 公开接口 - 不需要权限
  @Get('public')
  @NotRequireAuth()
  async publicInfo() {
    return { message: 'Public information' }
  }
}
```

### 2. 数据权限过滤

在服务层根据用户的数据权限范围过滤数据：

```typescript
@Injectable()
export class UserService {
  
  async findAll(user: UserInfo) {
    // 获取用户的数据权限范围
    const dataScope = await this.getDataScope(user)
    
    let where = {}
    
    switch (dataScope) {
      case '1': // 全部数据权限
        where = {}
        break
        
      case '2': // 自定义数据权限
        const deptIds = await this.getCustomDeptIds(user)
        where = { deptId: { in: deptIds } }
        break
        
      case '3': // 本部门数据权限
        where = { deptId: user.deptId }
        break
        
      case '4': // 本部门及以下数据权限
        const allDeptIds = await this.getDeptAndChildren(user.deptId)
        where = { deptId: { in: allDeptIds } }
        break
        
      case '5': // 仅本人数据权限
        where = { createBy: user.username }
        break
    }
    
    return this.prisma.sysUser.findMany({ where })
  }
  
  // 获取用户的数据权限范围
  private async getDataScope(user: UserInfo): Promise<string> {
    const roles = await this.prisma.sysRole.findMany({
      where: {
        users: { some: { id: user.id } }
      },
      select: { dataScope: true }
    })
    
    // 取最宽的权限范围
    return roles.reduce((min, role) => 
      role.dataScope < min ? role.dataScope : min
    , '5')
  }
}
```

### 3. 获取当前用户

使用 `@User()` 装饰器注入当前用户信息：

```typescript
@Controller('system/user')
export class UserController {
  
  @Get('profile')
  async getProfile(@User() user: UserInfo) {
    return this.userService.getProfile(user.id)
  }
  
  @Put('profile')
  async updateProfile(
    @User() user: UserInfo,
    @Body() data: UpdateProfileDto
  ) {
    // 用户只能修改自己的资料
    return this.userService.updateProfile(user.id, data)
  }
}
```

## 权限标识规范

权限标识采用冒号分隔的命名规范：

```
模块:子模块:操作
```

### 常用权限标识

| 模块 | 权限标识 | 说明 |
|------|---------|------|
| 用户管理 | system:user:list | 查询用户列表 |
| | system:user:query | 查询用户详情 |
| | system:user:add | 添加用户 |
| | system:user:edit | 修改用户 |
| | system:user:remove | 删除用户 |
| | system:user:export | 导出用户 |
| | system:user:import | 导入用户 |
| | system:user:resetPwd | 重置密码 |
| 角色管理 | system:role:list | 查询角色列表 |
| | system:role:query | 查询角色详情 |
| | system:role:add | 添加角色 |
| | system:role:edit | 修改角色 |
| | system:role:remove | 删除角色 |
| 菜单管理 | system:menu:list | 查询菜单列表 |
| | system:menu:query | 查询菜单详情 |
| | system:menu:add | 添加菜单 |
| | system:menu:edit | 修改菜单 |
| | system:menu:remove | 删除菜单 |

## 前端权限控制

### 1. 路由权限

前端路由根据用户权限动态生成：

```typescript
// router/index.ts
export const useRouteStore = defineStore('route', () => {
  const routes = ref<RouteRecordRaw[]>([])
  
  async function initAuthRoute() {
    // 获取用户权限菜单
    const { data } = await fetchUserMenus()
    
    // 根据权限生成路由
    routes.value = transformMenusToRoutes(data)
    
    // 动态添加路由
    routes.value.forEach(route => {
      router.addRoute(route)
    })
  }
  
  return { routes, initAuthRoute }
})
```

### 2. 按钮权限

使用自定义指令控制按钮显示：

```vue
<template>
  <!-- 有权限时显示 -->
  <n-button v-hasPermission="'system:user:add'">
    添加用户
  </n-button>
  
  <!-- 有多个权限之一时显示 -->
  <n-button v-hasPermission="['system:user:edit', 'system:user:remove']">
    操作
  </n-button>
</template>

<script setup lang="ts">
// 权限指令
const hasPermission = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const { value } = binding
    const permissions = useAuthStore().permissions
    
    const hasAuth = Array.isArray(value)
      ? value.some(p => permissions.includes(p))
      : permissions.includes(value)
    
    if (!hasAuth) {
      el.remove()
    }
  }
}
</script>
```

### 3. 菜单权限

菜单组件根据权限过滤：

```typescript
// 过滤有权限的菜单
function filterMenusByPermission(menus: Menu[], permissions: string[]) {
  return menus.filter(menu => {
    // 检查是否有权限
    if (menu.permission && !permissions.includes(menu.permission)) {
      return false
    }
    
    // 递归过滤子菜单
    if (menu.children) {
      menu.children = filterMenusByPermission(menu.children, permissions)
    }
    
    return true
  })
}
```

## 白名单配置

某些路由不需要权限验证，可以配置白名单：

```typescript
// config/index.ts
export default {
  perm: {
    router: {
      whitelist: [
        '/login',
        '/captcha',
        '/register',
        '/api/health',
        '/api-docs',
      ]
    }
  }
}
```

## 演示账户特殊处理

演示账户使用特殊的权限验证逻辑：

```typescript
// 演示账户的权限列表
const DEMO_PERMISSIONS = [
  'system:user:list',
  'system:user:query',
  'system:user:export',
  // ... 52 个只读权限
]

// 拦截写操作
@Injectable()
export class DemoAccountGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user
    
    // 检查是否为演示账户
    if (user.username === 'demo') {
      const method = request.method
      
      // 拦截写操作
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        throw new ForbiddenException('演示账户不允许修改数据')
      }
    }
    
    return true
  }
}
```

## 常见问题

### Q: 如何添加新的权限？

1. 在菜单管理中添加菜单/按钮
2. 设置权限标识（如 `system:user:custom`）
3. 在角色管理中分配权限
4. 在控制器中使用 `@RequirePermission()` 装饰器

### Q: 如何实现更细粒度的权限控制？

```typescript
// 使用装饰器组合
@RequirePermission('system:user:edit')
@RequireDataScope('本部门及以下')
async updateUser() {
  // ...
}
```

### Q: 超级管理员如何跳过权限验证？

```typescript
// 在守卫中检查超级管理员
if (user.isSuperAdmin) {
  return true
}
```

## 下一步

- [请求加密](/guide/encryption) - 了解数据加密
- [日志监控](/guide/logging) - 了解日志系统
- [权限开发](/development/permissions) - 学习权限开发
