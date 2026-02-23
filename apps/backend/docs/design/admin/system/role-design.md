# 角色管理模块 (System Role) — 设计文档

> 版本：1.0  
> 日期：2026-02-22  
> 状态：草案  
> 关联需求：[role-requirements.md](../../../requirements/admin/system/role-requirements.md)

---

## 1. 概述

### 1.1 设计目标

角色管理模块是后台管理系统 RBAC 权限体系的核心模块，本设计文档旨在：

1. 梳理现有角色管理功能的技术实现细节
2. 设计角色权限变更审计机制，增强可追溯性
3. 设计角色复制功能，提升管理效率
4. 设计权限缓存更新机制，确保权限变更立即生效
5. 为后续扩展（角色模板、角色继承）预留接口

### 1.2 设计约束

- 基于现有的 NestJS + Prisma + Redis 技术栈
- 兼容现有的 RBAC 权限模型
- 不引入新的中间件或存储系统
- 保持与前端（Soybean Admin）的 API 契约一致
- 支持多租户隔离

### 1.3 设计原则

- 单一职责：每个 Service 只负责一个领域的功能
- 开闭原则：对扩展开放，对修改关闭
- 依赖倒置：依赖抽象而非具体实现
- 性能优先：优化数据库查询，使用缓存减少重复查询
- 安全优先：敏感操作记录日志，权限变更可追溯

---

## 2. 架构与模块

### 2.1 模块划分

> 图 1：角色管理模块组件图

```mermaid
graph TB
    subgraph "Controller 层"
        RC[RoleController<br/>角色管理接口]
    end

    subgraph "Service 层"
        RS[RoleService<br/>角色管理核心]
        RPS[RolePermissionService<br/>权限管理 - 新增]
        RAS[RoleAuditService<br/>审计日志 - 新增]
        RCS[RoleCopyService<br/>角色复制 - 新增]
    end

    subgraph "Repository 层"
        RR[RoleRepository<br/>角色数据访问]
    end

    subgraph "External Services"
        MS[MenuService<br/>菜单服务]
        DS[DeptService<br/>部门服务]
        US[UserService<br/>用户服务]
        REDIS[RedisService<br/>缓存服务]
    end

    subgraph "Infrastructure"
        PRISMA[PrismaService<br/>数据库]
        DB[(MySQL)]
        CACHE[(Redis)]
    end

    RC --> RS
    RS --> RPS
    RS --> RAS
    RS --> RCS
    RS --> RR
    RS --> MS
    RS --> DS
    RS --> US
    RS --> REDIS
    RR --> PRISMA
    PRISMA --> DB
    REDIS --> CACHE
```

### 2.2 目录结构

```
src/module/admin/system/role/
├── dto/
│   ├── create-role.dto.ts          # 创建角色 DTO
│   ├── update-role.dto.ts          # 更新角色 DTO
│   ├── list-role.dto.ts            # 查询角色列表 DTO
│   ├── change-status.dto.ts        # 修改状态 DTO
│   ├── auth-user.dto.ts            # 用户授权 DTO
│   └── index.ts
├── vo/
│   ├── role.vo.ts                  # 角色响应 VO
│   └── index.ts
├── services/
│   ├── role-permission.service.ts  # 权限管理服务 (新增)
│   ├── role-audit.service.ts       # 审计日志服务 (新增)
│   ├── role-copy.service.ts        # 角色复制服务 (新增)
│   └── index.ts
├── role.controller.ts              # 角色控制器
├── role.service.ts                 # 角色服务
├── role.repository.ts              # 角色仓储
├── role.module.ts                  # 模块配置
└── README.md                       # 模块文档
```

### 2.3 依赖关系

```
RoleModule
├── imports
│   ├── SystemModule (MenuService, DeptService, UserService)
│   ├── CommonModule (RedisService)
│   └── PrismaModule (PrismaService)
├── controllers
│   └── RoleController
├── providers
│   ├── RoleService
│   ├── RolePermissionService (新增)
│   ├── RoleAuditService (新增)
│   ├── RoleCopyService (新增)
│   └── RoleRepository
└── exports
    ├── RoleService
    └── RoleRepository
```

---

## 3. 领域/数据模型

### 3.1 核心实体类图

> 图 2：角色管理模块类图

```mermaid
classDiagram
    class RoleController {
        -roleService: RoleService
        -userService: UserService
        +create(dto): Result
        +findAll(query): Result
        +findOne(roleId): Result
        +update(dto): Result
        +dataScope(dto): Result
        +changeStatus(dto): Result
        +remove(ids): Result
        +optionselect(roleIds): Result
        +deptTree(roleId): Result
        +authUserAllocatedList(query): Result
        +authUserUnAllocatedList(query): Result
        +authUserCancel(dto): Result
        +authUserCancelAll(dto): Result
        +authUserSelectAll(dto): Result
        +export(res, body): void
    }

    class RoleService {
        -prisma: PrismaService
        -roleRepo: RoleRepository
        -menuService: MenuService
        -rolePermissionService: RolePermissionService
        -roleAuditService: RoleAuditService
        -roleCopyService: RoleCopyService
        +create(dto): Result
        +findAll(query): Result
        +findOne(roleId): Result
        +update(dto): Result
        +dataScope(dto): Result
        +changeStatus(dto): Result
        +remove(roleIds): Result
        +deptTree(roleId): Result
        +findRoles(args): SysRole[]
        +getPermissionsByRoleIds(roleIds): Permission[]
        +optionselect(roleIds): Result
        +findRoleWithDeptIds(roleId): number[]
        +export(res, body): void
    }

    class RoleRepository {
        -prisma: PrismaService
        -cls: ClsService
        +findByRoleKey(roleKey): SysRole
        +findByRoleName(roleName): SysRole
        +existsByRoleKey(roleKey, excludeRoleId): boolean
        +existsByRoleName(roleName, excludeRoleId): boolean
        +findUserRoles(userId): SysRole[]
        +findPageWithMenuCount(where, skip, take, orderBy): PageResult
        +softDeleteBatch(roleIds): number
        +findRoleMenuIds(roleId): number[]
    }

    class RolePermissionService {
        -prisma: PrismaService
        -redisService: RedisService
        +updateRoleMenus(roleId, menuIds): void
        +updateRoleDepts(roleId, deptIds): void
        +clearUserPermissionCache(roleId): void
        +getRolePermissions(roleId): Permission[]
    }

    class RoleAuditService {
        -prisma: PrismaService
        +recordMenuChange(roleId, oldMenuIds, newMenuIds, operator): void
        +recordDataScopeChange(roleId, oldDataScope, newDataScope, operator): void
        +getAuditHistory(roleId): AuditLog[]
    }

    class RoleCopyService {
        -roleService: RoleService
        -roleRepo: RoleRepository
        +copyRole(sourceRoleId, newRoleName, newRoleKey): Result
    }

    RoleController --> RoleService
    RoleController --> UserService
    RoleService --> RoleRepository
    RoleService --> RolePermissionService
    RoleService --> RoleAuditService
    RoleService --> RoleCopyService
    RoleService --> MenuService
```

### 3.2 数据库表结构

#### 3.2.1 现有表

```sql
-- 角色表
CREATE TABLE sys_role (
  role_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     VARCHAR(20) NOT NULL DEFAULT '000000',
  role_name     VARCHAR(30) NOT NULL COMMENT '角色名称',
  role_key      VARCHAR(100) NOT NULL COMMENT '角色权限字符串',
  role_sort     INT NOT NULL DEFAULT 0 COMMENT '显示顺序',
  data_scope    CHAR(1) DEFAULT '1' COMMENT '数据范围（1全部 2自定义 3本部门 4本部门及下级 5仅本人）',
  menu_check_strictly TINYINT(1) DEFAULT 1 COMMENT '菜单树选择项是否关联显示',
  dept_check_strictly TINYINT(1) DEFAULT 1 COMMENT '部门树选择项是否关联显示',
  status        CHAR(1) DEFAULT '0' COMMENT '状态（0正常 1停用）',
  del_flag      CHAR(1) DEFAULT '0' COMMENT '删除标志（0正常 2删除）',
  create_by     VARCHAR(64) COMMENT '创建者',
  create_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_by     VARCHAR(64) COMMENT '更新者',
  update_time   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  remark        VARCHAR(500) COMMENT '备注',
  UNIQUE KEY uk_tenant_role_name (tenant_id, role_name),
  UNIQUE KEY uk_tenant_role_key (tenant_id, role_key),
  INDEX idx_tenant_status (tenant_id, status, del_flag),
  INDEX idx_create_time (create_time)
);

-- 角色菜单关联表
CREATE TABLE sys_role_menu (
  role_id       BIGINT NOT NULL COMMENT '角色ID',
  menu_id       BIGINT NOT NULL COMMENT '菜单ID',
  PRIMARY KEY (role_id, menu_id),
  INDEX idx_menu_id (menu_id)
);

-- 角色部门关联表
CREATE TABLE sys_role_dept (
  role_id       BIGINT NOT NULL COMMENT '角色ID',
  dept_id       BIGINT NOT NULL COMMENT '部门ID',
  PRIMARY KEY (role_id, dept_id),
  INDEX idx_dept_id (dept_id)
);

-- 用户角色关联表
CREATE TABLE sys_user_role (
  user_id       BIGINT NOT NULL COMMENT '用户ID',
  role_id       BIGINT NOT NULL COMMENT '角色ID',
  PRIMARY KEY (user_id, role_id),
  INDEX idx_role_id (role_id)
);
```

#### 3.2.2 新增表（建议）

```sql
-- 角色菜单权限变更历史表 (新增)
CREATE TABLE sys_role_menu_history (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id       BIGINT NOT NULL COMMENT '角色ID',
  old_menu_ids  TEXT COMMENT '旧菜单ID列表（JSON格式）',
  new_menu_ids  TEXT NOT NULL COMMENT '新菜单ID列表（JSON格式）',
  change_type   VARCHAR(20) NOT NULL COMMENT '变更类型（CREATE/UPDATE）',
  change_by     VARCHAR(64) COMMENT '操作人',
  change_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role_id (role_id),
  INDEX idx_change_time (change_time)
);

-- 角色数据权限变更历史表 (新增)
CREATE TABLE sys_role_data_scope_history (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id       BIGINT NOT NULL COMMENT '角色ID',
  old_data_scope CHAR(1) COMMENT '旧数据权限范围',
  new_data_scope CHAR(1) NOT NULL COMMENT '新数据权限范围',
  old_dept_ids  TEXT COMMENT '旧部门ID列表（JSON格式）',
  new_dept_ids  TEXT COMMENT '新部门ID列表（JSON格式）',
  change_by     VARCHAR(64) COMMENT '操作人',
  change_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role_id (role_id),
  INDEX idx_change_time (change_time)
);

-- 角色使用统计表 (新增)
CREATE TABLE sys_role_usage_stats (
  role_id       BIGINT PRIMARY KEY,
  user_count    INT NOT NULL DEFAULT 0 COMMENT '分配的用户数量',
  last_assigned_time DATETIME COMMENT '最后分配时间',
  update_time   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_count (user_count),
  INDEX idx_last_assigned_time (last_assigned_time)
);
```

### 3.3 Redis 数据结构

#### 3.3.1 用户权限缓存

```typescript
// Key: sys_user:permissions:{userId}
// TTL: 24 小时
// Value: string[] (权限标识列表)
```

#### 3.3.2 角色权限缓存

```typescript
// Key: sys_role:permissions:{roleId}
// TTL: 24 小时
// Value: string[] (权限标识列表)
```

#### 3.3.3 角色信息缓存

```typescript
// Key: sys_role:{roleId}
// TTL: 24 小时
// Value: 角色基本信息（不含关联数据）
```

---

## 4. 核心流程时序

### 4.1 创建角色流程时序图

> 图 3：创建角色时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant RC as RoleController
    participant RS as RoleService
    participant RR as RoleRepository
    participant RAS as RoleAuditService
    participant DB as 数据库

    C->>RC: POST /system/role
    RC->>RS: create(dto)
    RS->>RR: existsByRoleName(roleName)
    RR->>DB: SELECT * FROM sys_role WHERE role_name=?
    DB-->>RR: 角色信息
    RR-->>RS: 是否存在

    alt 角色名称已存在
        RS-->>RC: 返回错误
        RC-->>C: 400 角色名称已存在
    else 角色名称不存在
        RS->>RR: existsByRoleKey(roleKey)
        RR->>DB: SELECT * FROM sys_role WHERE role_key=?
        DB-->>RR: 角色信息
        RR-->>RS: 是否存在

        alt 角色权限字符已存在
            RS-->>RC: 返回错误
            RC-->>C: 400 角色权限字符已存在
        else 角色权限字符不存在
            RS->>DB: INSERT INTO sys_role
            DB-->>RS: 新角色ID

            alt 分配了菜单权限
                RS->>DB: INSERT INTO sys_role_menu
            end

            alt 配置了自定义数据权限
                RS->>DB: INSERT INTO sys_role_dept
            end

            RS->>RAS: recordMenuChange(roleId, [], menuIds)
            RAS->>DB: INSERT INTO sys_role_menu_history

            RS-->>RC: 创建成功
            RC-->>C: 200 创建成功
        end
    end
```

### 4.2 修改角色权限流程时序图

> 图 4：修改角色权限时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant RC as RoleController
    participant RS as RoleService
    participant RPS as RolePermissionService
    participant RAS as RoleAuditService
    participant REDIS as RedisService
    participant DB as 数据库

    C->>RC: PUT /system/role
    RC->>RS: update(dto)
    RS->>DB: 查询旧的菜单ID列表
    DB-->>RS: 旧菜单ID列表

    RS->>DB: DELETE FROM sys_role_menu WHERE role_id=?
    RS->>DB: INSERT INTO sys_role_menu (批量)
    RS->>DB: UPDATE sys_role SET ...

    RS->>RAS: recordMenuChange(roleId, oldMenuIds, newMenuIds)
    RAS->>DB: INSERT INTO sys_role_menu_history

    RS->>RPS: clearUserPermissionCache(roleId)
    RPS->>DB: 查询拥有该角色的用户ID列表
    DB-->>RPS: 用户ID列表

    loop 遍历每个用户
        RPS->>REDIS: DEL sys_user:permissions:{userId}
    end

    RS-->>RC: 更新成功
    RC-->>C: 200 更新成功
```

### 4.3 配置数据权限流程时序图

> 图 5：配置数据权限时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant RC as RoleController
    participant RS as RoleService
    participant RPS as RolePermissionService
    participant RAS as RoleAuditService
    participant REDIS as RedisService
    participant DB as 数据库

    C->>RC: PUT /system/role/dataScope
    RC->>RS: dataScope(dto)
    RS->>DB: 查询旧的数据权限和部门ID列表
    DB-->>RS: 旧数据权限信息

    RS->>DB: DELETE FROM sys_role_dept WHERE role_id=?

    alt 自定义数据权限
        RS->>DB: INSERT INTO sys_role_dept (批量)
    end

    RS->>DB: UPDATE sys_role SET data_scope=?

    RS->>RAS: recordDataScopeChange(roleId, oldDataScope, newDataScope)
    RAS->>DB: INSERT INTO sys_role_data_scope_history

    RS->>RPS: clearUserPermissionCache(roleId)
    RPS->>DB: 查询拥有该角色的用户ID列表
    DB-->>RPS: 用户ID列表

    loop 遍历每个用户
        RPS->>REDIS: DEL sys_user:permissions:{userId}
    end

    RS-->>RC: 更新成功
    RC-->>C: 200 更新成功
```

### 4.4 角色复制流程时序图

> 图 6：角色复制时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant RC as RoleController
    participant RCS as RoleCopyService
    participant RS as RoleService
    participant DB as 数据库

    C->>RC: POST /system/role/copy
    RC->>RCS: copyRole(sourceRoleId, newRoleName, newRoleKey)
    RCS->>RS: findOne(sourceRoleId)
    RS->>DB: SELECT * FROM sys_role WHERE role_id=?
    DB-->>RS: 源角色信息
    RS-->>RCS: 源角色信息

    RCS->>DB: 查询源角色的菜单ID列表
    DB-->>RCS: 菜单ID列表

    RCS->>DB: 查询源角色的部门ID列表
    DB-->>RCS: 部门ID列表

    RCS->>RS: create(newRoleDto)
    RS->>DB: INSERT INTO sys_role
    DB-->>RS: 新角色ID
    RS->>DB: INSERT INTO sys_role_menu (批量)
    RS->>DB: INSERT INTO sys_role_dept (批量)
    RS-->>RCS: 创建成功

    RCS-->>RC: 复制成功
    RC-->>C: 200 复制成功
```

---

## 5. 状态与流程

### 5.1 角色状态机

已在需求文档图 5 中定义，此处补充技术实现要点：

**状态转换规则**：

- `NORMAL → STOP`：管理员调用 `changeStatus` 接口，设置 `status=1`
- `STOP → NORMAL`：管理员调用 `changeStatus` 接口，设置 `status=0`
- `NORMAL/STOP → DELETED`：管理员调用 `remove` 接口，设置 `del_flag=2`

**技术实现**：

- 状态存储：`sys_role.status` 字段（`0`=正常，`1`=停用）
- 删除标记：`sys_role.del_flag` 字段（`0`=正常，`2`=删除）
- 停用角色时，清除相关用户的权限缓存
- 删除角色前，检查是否已分配给用户（建议）

**并发控制**：

- 使用数据库事务保证状态变更的原子性
- 使用乐观锁（version 字段）防止并发修改冲突（建议）

### 5.2 数据权限配置状态机

已在需求文档图 6 中定义，技术实现要点：

**数据权限类型**：

1. 全部数据权限（`DATA_SCOPE_ALL = '1'`）：无额外条件
2. 自定义数据权限（`DATA_SCOPE_CUSTOM = '2'`）：`deptId IN (role.deptIds)`
3. 本部门数据权限（`DATA_SCOPE_DEPT = '3'`）：`deptId = user.deptId`
4. 本部门及下级数据权限（`DATA_SCOPE_DEPT_AND_CHILD = '4'`）：`deptId IN (deptIds)`
5. 仅本人数据权限（`DATA_SCOPE_SELF = '5'`）：`userId = user.userId`

**技术实现**：

- 数据权限存储：`sys_role.data_scope` 字段
- 自定义部门存储：`sys_role_dept` 表
- 配置数据权限后，清除相关用户的权限缓存
- 记录数据权限变更历史

### 5.3 权限缓存更新流程

**权限缓存更新时机**：

1. 创建角色：无需更新缓存（角色尚未分配给用户）
2. 修改角色菜单权限：清除所有拥有该角色的用户的权限缓存
3. 修改角色数据权限：清除所有拥有该角色的用户的权限缓存
4. 停用角色：清除所有拥有该角色的用户的权限缓存
5. 删除角色：清除所有拥有该角色的用户的权限缓存
6. 授权用户到角色：清除该用户的权限缓存
7. 取消用户授权：清除该用户的权限缓存

**权限缓存更新实现**：

```typescript
async clearUserPermissionCache(roleId: number): Promise<void> {
  // 1. 查询拥有该角色的用户ID列表
  const userRoles = await this.prisma.sysUserRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  const userIds = userRoles.map(ur => ur.userId);

  // 2. 批量删除用户权限缓存
  const keys = userIds.map(userId => `sys_user:permissions:${userId}`);
  if (keys.length > 0) {
    await this.redisService.del(...keys);
  }

  // 3. 删除角色权限缓存
  await this.redisService.del(`sys_role:permissions:${roleId}`);
}
```

---

## 6. 接口/数据约定

### 6.1 RoleService 接口

```typescript
interface RoleService {
  /**
   * 创建角色
   * @param dto 创建角色 DTO
   * @returns 创建结果
   */
  create(dto: CreateRoleDto): Promise<Result>;

  /**
   * 查询角色列表
   * @param query 查询条件
   * @returns 角色列表
   */
  findAll(query: ListRoleDto): Promise<Result>;

  /**
   * 查询角色详情
   * @param roleId 角色ID
   * @returns 角色详情
   */
  findOne(roleId: number): Promise<Result>;

  /**
   * 更新角色信息
   * @param dto 更新角色 DTO
   * @returns 更新结果
   */
  update(dto: UpdateRoleDto): Promise<Result>;

  /**
   * 配置数据权限
   * @param dto 更新角色 DTO
   * @returns 更新结果
   */
  dataScope(dto: UpdateRoleDto): Promise<Result>;

  /**
   * 修改角色状态
   * @param dto 修改状态 DTO
   * @returns 修改结果
   */
  changeStatus(dto: ChangeRoleStatusDto): Promise<Result>;

  /**
   * 删除角色（批量）
   * @param roleIds 角色ID列表
   * @returns 删除结果
   */
  remove(roleIds: number[]): Promise<Result>;

  /**
   * 获取角色部门树
   * @param roleId 角色ID
   * @returns 部门树和已选中的部门ID列表
   */
  deptTree(roleId: number): Promise<Result>;

  /**
   * 获取角色权限列表
   * @param roleIds 角色ID列表
   * @returns 权限列表
   */
  getPermissionsByRoleIds(roleIds: number[]): Promise<Permission[]>;

  /**
   * 获取角色选择框列表
   * @param roleIds 角色ID列表（可选）
   * @returns 角色列表
   */
  optionselect(roleIds?: number[]): Promise<Result>;

  /**
   * 导出角色数据
   * @param res 响应对象
   * @param body 查询条件
   */
  export(res: Response, body: ListRoleDto): Promise<void>;
}
```

### 6.2 RolePermissionService 接口（新增）

```typescript
interface RolePermissionService {
  /**
   * 更新角色菜单权限
   * @param roleId 角色ID
   * @param menuIds 菜单ID列表
   */
  updateRoleMenus(roleId: number, menuIds: number[]): Promise<void>;

  /**
   * 更新角色部门权限
   * @param roleId 角色ID
   * @param deptIds 部门ID列表
   */
  updateRoleDepts(roleId: number, deptIds: number[]): Promise<void>;

  /**
   * 清除用户权限缓存
   * @param roleId 角色ID
   */
  clearUserPermissionCache(roleId: number): Promise<void>;

  /**
   * 获取角色权限列表
   * @param roleId 角色ID
   * @returns 权限列表
   */
  getRolePermissions(roleId: number): Promise<string[]>;
}
```

### 6.3 RoleAuditService 接口（新增）

```typescript
interface RoleAuditService {
  /**
   * 记录菜单权限变更
   * @param roleId 角色ID
   * @param oldMenuIds 旧菜单ID列表
   * @param newMenuIds 新菜单ID列表
   * @param operator 操作人
   */
  recordMenuChange(roleId: number, oldMenuIds: number[], newMenuIds: number[], operator: string): Promise<void>;

  /**
   * 记录数据权限变更
   * @param roleId 角色ID
   * @param oldDataScope 旧数据权限范围
   * @param newDataScope 新数据权限范围
   * @param oldDeptIds 旧部门ID列表
   * @param newDeptIds 新部门ID列表
   * @param operator 操作人
   */
  recordDataScopeChange(
    roleId: number,
    oldDataScope: string,
    newDataScope: string,
    oldDeptIds: number[],
    newDeptIds: number[],
    operator: string,
  ): Promise<void>;

  /**
   * 获取审计历史
   * @param roleId 角色ID
   * @returns 审计日志列表
   */
  getAuditHistory(roleId: number): Promise<AuditLog[]>;
}
```

### 6.4 RoleCopyService 接口（新增）

```typescript
interface RoleCopyService {
  /**
   * 复制角色
   * @param sourceRoleId 源角色ID
   * @param newRoleName 新角色名称
   * @param newRoleKey 新角色权限字符
   * @returns 复制结果
   */
  copyRole(sourceRoleId: number, newRoleName: string, newRoleKey: string): Promise<Result>;
}
```

---

## 7. 安全设计

### 7.1 权限控制

| 机制           | 实现方式                           |
| -------------- | ---------------------------------- |
| 角色管理权限   | 需要 `system:role:*` 权限          |
| 超级管理员保护 | 不能删除、不能修改关键字段（建议） |
| 角色分配权限   | 需要 `system:role:edit` 权限       |
| 权限变更审计   | 记录所有权限变更历史               |

### 7.2 数据安全

| 机制               | 实现方式                          |
| ------------------ | --------------------------------- |
| 角色名称唯一性     | 数据库唯一约束 + Service 层校验   |
| 角色权限字符唯一性 | 数据库唯一约束 + Service 层校验   |
| 软删除             | 设置 `del_flag=2`，数据不物理删除 |
| 多租户隔离         | 所有查询自动添加 `tenant_id` 条件 |

### 7.3 操作安全

| 机制         | 实现方式                               |
| ------------ | -------------------------------------- |
| 敏感操作鉴权 | 删除、停用、修改权限需要相应权限       |
| 操作日志     | 使用 `@Operlog` 装饰器记录所有操作     |
| 权限变更历史 | 记录菜单权限和数据权限的变更历史       |
| 防止误删除   | 删除前检查角色是否已分配给用户（建议） |

### 7.4 缓存安全

| 机制         | 实现方式                               |
| ------------ | -------------------------------------- |
| 权限缓存更新 | 修改角色权限后，清除相关用户的权限缓存 |
| 缓存一致性   | 使用 Redis 事务保证缓存更新的原子性    |
| 缓存过期     | 设置 TTL 24 小时，防止缓存永久存在     |

---

## 8. 性能优化

### 8.1 缓存策略

#### 8.1.1 角色信息缓存

| 缓存项       | Key 格式                        | TTL     | 更新时机                   |
| ------------ | ------------------------------- | ------- | -------------------------- |
| 角色基本信息 | `sys_role:{roleId}`             | 24 小时 | 修改角色信息、删除角色     |
| 角色权限列表 | `sys_role:permissions:{roleId}` | 24 小时 | 修改角色权限               |
| 用户权限列表 | `sys_user:permissions:{userId}` | 24 小时 | 修改用户角色、修改角色权限 |

#### 8.1.2 缓存更新策略

```typescript
// 修改角色权限后更新缓存
async updateRolePermissionCache(roleId: number): Promise<void> {
  // 1. 删除角色权限缓存
  await this.redisService.del(`sys_role:permissions:${roleId}`);

  // 2. 清除所有拥有该角色的用户的权限缓存
  await this.clearUserPermissionCache(roleId);
}
```

### 8.2 数据库优化

#### 8.2.1 索引优化

```sql
-- 现有索引
CREATE UNIQUE INDEX uk_tenant_role_name ON sys_role (tenant_id, role_name);
CREATE UNIQUE INDEX uk_tenant_role_key ON sys_role (tenant_id, role_key);
CREATE INDEX idx_tenant_status ON sys_role (tenant_id, status, del_flag);
CREATE INDEX idx_create_time ON sys_role (create_time);

-- 建议新增索引
CREATE INDEX idx_role_sort ON sys_role (role_sort);
CREATE INDEX idx_data_scope ON sys_role (data_scope);
```

#### 8.2.2 查询优化

| 优化项           | 优化前                 | 优化后                 | 效果                        |
| ---------------- | ---------------------- | ---------------------- | --------------------------- |
| 角色列表查询     | 分别查询角色和菜单数量 | 使用 GROUP BY 一次查询 | 减少查询次数，性能提升 50%  |
| 角色权限查询     | 循环查询每个角色的权限 | 使用 IN 批量查询       | 减少 N+1 查询，性能提升 80% |
| 用户权限缓存清除 | 循环查询每个用户       | 使用 IN 批量查询       | 减少查询次数，性能提升 60%  |

### 8.3 性能指标

| 接口         | P50   | P95   | P99   | 目标 QPS |
| ------------ | ----- | ----- | ----- | -------- |
| 查询角色列表 | 100ms | 300ms | 500ms | 1000     |
| 查询角色详情 | 50ms  | 150ms | 200ms | 2000     |
| 创建角色     | 100ms | 200ms | 300ms | 100      |
| 修改角色信息 | 100ms | 200ms | 300ms | 200      |
| 删除角色     | 50ms  | 100ms | 150ms | 100      |
| 修改角色状态 | 50ms  | 100ms | 150ms | 200      |

---

## 9. 实施计划

### 9.1 阶段一：修复现有问题（1 周）

| 任务                 | 工作量 | 负责人 | 状态   |
| -------------------- | ------ | ------ | ------ |
| 修复权限缓存更新问题 | 1 天   | 后端   | 待开发 |
| 添加唯一性校验       | 0.5 天 | 后端   | 待开发 |
| 删除前检查使用情况   | 1 天   | 后端   | 待开发 |
| 增强超管角色保护     | 0.5 天 | 后端   | 待开发 |
| 补充单元测试         | 2 天   | 后端   | 待开发 |

### 9.2 阶段二：新增审计功能（2 周）

| 任务                  | 工作量 | 负责人 | 状态   |
| --------------------- | ------ | ------ | ------ |
| 设计审计表结构        | 0.5 天 | 后端   | 待开发 |
| 实现 RoleAuditService | 2 天   | 后端   | 待开发 |
| 记录菜单权限变更历史  | 1 天   | 后端   | 待开发 |
| 记录数据权限变更历史  | 1 天   | 后端   | 待开发 |
| 前端展示审计历史      | 2 天   | 前端   | 待开发 |
| 集成测试              | 1 天   | 测试   | 待开发 |

### 9.3 阶段三：新增角色复制功能（1 周）

| 任务                 | 工作量 | 负责人 | 状态   |
| -------------------- | ------ | ------ | ------ |
| 实现 RoleCopyService | 2 天   | 后端   | 待开发 |
| 前端角色复制界面     | 2 天   | 前端   | 待开发 |
| 集成测试             | 1 天   | 测试   | 待开发 |

### 9.4 阶段四：扩展功能（长期）

| 任务                 | 工作量 | 负责人 | 状态   |
| -------------------- | ------ | ------ | ------ |
| 实现角色使用情况统计 | 2 天   | 后端   | 待规划 |
| 实现角色权限预览     | 3 天   | 后端   | 待规划 |
| 实现角色模板管理     | 5 天   | 后端   | 待规划 |
| 实现角色有效期管理   | 3 天   | 后端   | 待规划 |

---

## 10. 测试策略

### 10.1 单元测试

#### 10.1.1 RoleService 测试

```typescript
describe('RoleService', () => {
  describe('create', () => {
    it('应该成功创建角色', async () => {
      // 测试正常创建角色
    });

    it('角色名称重复时应该抛出异常', async () => {
      // 测试角色名称唯一性校验
    });

    it('角色权限字符重复时应该抛出异常', async () => {
      // 测试角色权限字符唯一性校验
    });

    it('应该正确创建角色菜单关联', async () => {
      // 测试菜单权限分配
    });

    it('应该正确创建角色部门关联', async () => {
      // 测试自定义数据权限配置
    });
  });

  describe('update', () => {
    it('应该成功更新角色信息', async () => {
      // 测试更新角色
    });

    it('修改后应该清除相关用户权限缓存', async () => {
      // 测试缓存更新
    });

    it('应该记录菜单权限变更历史', async () => {
      // 测试审计日志
    });
  });

  describe('remove', () => {
    it('应该软删除角色', async () => {
      // 测试软删除
    });

    it('不应该允许删除超级管理员角色', async () => {
      // 测试超管保护
    });

    it('删除前应该检查角色是否已分配', async () => {
      // 测试删除前检查
    });
  });
});
```

#### 10.1.2 RolePermissionService 测试

```typescript
describe('RolePermissionService', () => {
  describe('clearUserPermissionCache', () => {
    it('应该清除所有拥有该角色的用户的权限缓存', async () => {
      // 测试批量清除缓存
    });

    it('应该清除角色权限缓存', async () => {
      // 测试角色缓存清除
    });
  });
});
```

### 10.2 集成测试

#### 10.2.1 角色管理接口测试

```typescript
describe('RoleController (e2e)', () => {
  it('POST /system/role - 创建角色', () => {
    return request(app.getHttpServer())
      .post('/system/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roleName: '测试角色',
        roleKey: 'test_role',
        roleSort: 1,
        status: '0',
        dataScope: '5',
        menuIds: [1, 2, 3],
      })
      .expect(200);
  });

  it('GET /system/role/list - 查询角色列表', () => {
    return request(app.getHttpServer())
      .get('/system/role/list')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ pageNum: 1, pageSize: 10 })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.rows).toBeInstanceOf(Array);
        expect(res.body.data.total).toBeGreaterThan(0);
      });
  });

  it('PUT /system/role - 修改角色信息', () => {
    return request(app.getHttpServer())
      .put('/system/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roleId: 2,
        roleName: '修改后的角色名称',
        menuIds: [1, 2, 3, 4],
      })
      .expect(200);
  });

  it('DELETE /system/role/:id - 删除角色', () => {
    return request(app.getHttpServer())
      .delete('/system/role/2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
```

### 10.3 性能测试

#### 10.3.1 压力测试场景

| 场景         | 并发数 | 持续时间 | 目标 TPS | 目标响应时间 |
| ------------ | ------ | -------- | -------- | ------------ |
| 查询角色列表 | 100    | 5 分钟   | 1000     | P95 < 500ms  |
| 查询角色详情 | 200    | 5 分钟   | 2000     | P95 < 200ms  |
| 创建角色     | 10     | 5 分钟   | 100      | P95 < 300ms  |
| 修改角色信息 | 20     | 5 分钟   | 200      | P95 < 300ms  |

---

## 11. 监控与告警

### 11.1 监控指标

#### 11.1.1 业务指标

| 指标           | 说明                  | 告警阈值         |
| -------------- | --------------------- | ---------------- |
| 角色创建成功率 | 创建成功数 / 创建总数 | < 95%            |
| 角色查询失败率 | 查询失败数 / 查询总数 | > 5%             |
| 角色修改失败率 | 修改失败数 / 修改总数 | > 5%             |
| 停用角色数量   | 当前停用的角色数量    | > 总角色数的 20% |
| 删除角色数量   | 当前删除的角色数量    | > 总角色数的 10% |

#### 11.1.2 性能指标

| 指标                 | 说明                      | 告警阈值 |
| -------------------- | ------------------------- | -------- |
| 角色列表查询响应时间 | P95 响应时间              | > 500ms  |
| 角色详情查询响应时间 | P95 响应时间              | > 200ms  |
| 角色创建响应时间     | P95 响应时间              | > 300ms  |
| 角色修改响应时间     | P95 响应时间              | > 300ms  |
| Redis 缓存命中率     | 缓存命中数 / 缓存查询总数 | < 80%    |

### 11.2 告警规则

#### 11.2.1 P0 告警（立即处理）

- 角色管理接口可用性 < 99%
- 数据库连接池耗尽
- Redis 连接失败
- 角色创建成功率 < 80%

#### 11.2.2 P1 告警（1 小时内处理）

- 角色列表查询响应时间 P95 > 1s
- 角色创建失败率 > 10%
- Redis 缓存命中率 < 60%

### 11.3 日志记录

#### 11.3.1 操作日志

```typescript
// 使用 @Operlog 装饰器自动记录操作日志
@Operlog({
  title: '角色管理',
  businessType: BusinessType.INSERT,
})
async create(dto: CreateRoleDto): Promise<Result> {
  // 创建角色逻辑
}
```

#### 11.3.2 审计日志

```typescript
// 记录权限变更的详细日志
this.logger.log({
  action: 'UPDATE_ROLE_MENU',
  operator: currentUser.userName,
  operatorId: currentUser.userId,
  target: 'ROLE',
  targetId: roleId,
  details: {
    oldMenuIds: oldMenuIds,
    newMenuIds: newMenuIds,
  },
  timestamp: new Date(),
});
```

---

## 12. 扩展性设计

### 12.1 角色模板扩展

当前仅支持手动创建角色，未来可扩展角色模板功能：

```typescript
// 角色模板接口
interface RoleTemplate {
  templateId: number;
  templateName: string;
  templateKey: string;
  description: string;
  menuIds: number[];
  dataScope: string;
  deptIds?: number[];
}

// 角色模板服务
class RoleTemplateService {
  async createFromTemplate(templateId: number, roleName: string, roleKey: string): Promise<Result> {
    // 从模板创建角色
  }

  async saveAsTemplate(roleId: number, templateName: string): Promise<Result> {
    // 将角色保存为模板
  }
}
```

### 12.2 角色有效期扩展

当前角色永久有效，未来可扩展角色有效期功能：

```typescript
// 角色有效期字段（新增）
interface RoleWithExpiry {
  roleId: number;
  roleName: string;
  roleKey: string;
  validFrom?: Date; // 生效时间
  validTo?: Date; // 失效时间
  autoDisable: boolean; // 是否自动停用
}

// 角色有效期检查服务
class RoleExpiryService {
  async checkExpiry(roleId: number): Promise<boolean> {
    // 检查角色是否过期
  }

  async autoDisableExpiredRoles(): Promise<void> {
    // 自动停用过期角色（定时任务）
  }
}
```

### 12.3 角色继承扩展

当前角色独立，未来可扩展角色继承功能：

```typescript
// 角色继承关系表（新增）
CREATE TABLE sys_role_inherit (
  role_id       BIGINT NOT NULL COMMENT '角色ID',
  parent_role_id BIGINT NOT NULL COMMENT '父角色ID',
  PRIMARY KEY (role_id, parent_role_id),
  INDEX idx_parent_role_id (parent_role_id)
);

// 角色继承服务
class RoleInheritService {
  async setParentRole(roleId: number, parentRoleId: number): Promise<void> {
    // 设置父角色
  }

  async getInheritedPermissions(roleId: number): Promise<string[]> {
    // 获取继承的权限（递归）
  }
}
```

---

## 13. 风险与缓解

### 13.1 技术风险

| 风险                       | 影响 | 概率 | 缓解措施                       |
| -------------------------- | ---- | ---- | ------------------------------ |
| 权限缓存不一致             | 高   | 中   | 修改角色后立即清除相关用户缓存 |
| 数据库连接池耗尽           | 高   | 低   | 监控连接池使用率，及时告警     |
| 并发修改角色导致数据不一致 | 中   | 低   | 使用乐观锁（version 字段）     |
| 角色权限查询性能差         | 中   | 中   | 使用缓存，优化查询语句         |

### 13.2 安全风险

| 风险                 | 影响 | 概率 | 缓解措施                   |
| -------------------- | ---- | ---- | -------------------------- |
| 误删除超级管理员角色 | 高   | 低   | 禁止删除超级管理员角色     |
| 误修改超级管理员权限 | 高   | 低   | 禁止修改超级管理员关键字段 |
| 权限绕过             | 高   | 低   | 严格校验权限，记录操作日志 |
| 角色权限变更无法追溯 | 中   | 中   | 记录权限变更历史           |

### 13.3 业务风险

| 风险                 | 影响 | 概率 | 缓解措施                       |
| -------------------- | ---- | ---- | ------------------------------ |
| 误删除正在使用的角色 | 高   | 中   | 删除前检查角色是否已分配给用户 |
| 误停用正在使用的角色 | 中   | 中   | 停用前二次确认，记录操作日志   |
| 角色权限配置错误     | 高   | 中   | 提供权限预览，修改前二次确认   |

---

## 14. 附录

### 14.1 相关文档

- [角色管理模块需求文档](../../../requirements/admin/system/role-requirements.md)
- [用户管理模块设计文档](./user-design.md)
- [菜单管理模块设计文档](./menu-design.md)
- [部门管理模块设计文档](./dept-design.md)
- [后端开发规范](../../../../../.kiro/steering/backend-nestjs.md)
- [文档编写规范](../../../../../.kiro/steering/documentation.md)

### 14.2 技术栈

| 技术              | 版本   | 用途           |
| ----------------- | ------ | -------------- |
| NestJS            | 10.x   | 后端框架       |
| Prisma            | 5.x    | ORM 框架       |
| MySQL             | 8.0    | 关系型数据库   |
| Redis             | 7.x    | 缓存和会话存储 |
| class-validator   | 0.14.x | 参数校验       |
| class-transformer | 0.5.x  | 数据转换       |
| ExcelJS           | 4.x    | Excel 导入导出 |

### 14.3 配置说明

#### 14.3.1 环境变量

```env
# 数据库配置
DATABASE_URL="mysql://user:password@localhost:3306/database"

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 权限缓存配置
PERMISSION_CACHE_TTL=86400  # 24 小时
```

#### 14.3.2 Prisma 配置

```prisma
model SysRole {
  roleId      BigInt    @id @default(autoincrement()) @map("role_id")
  tenantId    String    @default("000000") @map("tenant_id") @db.VarChar(20)
  roleName    String    @map("role_name") @db.VarChar(30)
  roleKey     String    @map("role_key") @db.VarChar(100)
  roleSort    Int       @default(0) @map("role_sort")
  dataScope   String    @default("1") @map("data_scope") @db.Char(1)
  menuCheckStrictly Boolean @default(true) @map("menu_check_strictly")
  deptCheckStrictly Boolean @default(true) @map("dept_check_strictly")
  status      String    @default("0") @db.Char(1)
  delFlag     String    @default("0") @map("del_flag") @db.Char(1)
  createBy    String?   @map("create_by") @db.VarChar(64)
  createTime  DateTime  @default(now()) @map("create_time")
  updateBy    String?   @map("update_by") @db.VarChar(64)
  updateTime  DateTime  @updatedAt @map("update_time")
  remark      String?   @db.VarChar(500)

  roleMenus   SysRoleMenu[]
  roleDepts   SysRoleDept[]
  userRoles   SysUserRole[]

  @@unique([tenantId, roleName], name: "uk_tenant_role_name")
  @@unique([tenantId, roleKey], name: "uk_tenant_role_key")
  @@index([tenantId, status, delFlag], name: "idx_tenant_status")
  @@index([createTime], name: "idx_create_time")
  @@map("sys_role")
}
```

### 14.4 术语表

| 术语           | 说明                                          |
| -------------- | --------------------------------------------- |
| 角色           | 权限的集合，可以分配给用户                    |
| 菜单权限       | 控制用户可以访问哪些菜单和功能的权限          |
| 数据权限       | 控制用户可以查看哪些数据的权限                |
| 全部数据权限   | 可以查看所有数据                              |
| 本部门数据权限 | 只能查看本部门的数据                          |
| 本部门及下级   | 可以查看本部门及下级部门的数据                |
| 仅本人数据权限 | 只能查看自己的数据                            |
| 自定义数据权限 | 可以查看指定部门的数据                        |
| 软删除         | 标记为删除但不物理删除数据                    |
| RBAC           | Role-Based Access Control，基于角色的访问控制 |
| 超级管理员     | 拥有所有权限的特殊角色                        |
| 权限缓存       | 将用户权限缓存到 Redis，提升查询性能          |
| 审计日志       | 记录角色权限变更的历史记录                    |

### 14.5 代码示例

#### 14.5.1 创建角色并分配权限

```typescript
// role.service.ts
@Transactional()
async create(createRoleDto: CreateRoleDto): Promise<Result> {
  const { menuIds = [], deptIds = [], ...rolePayload } = createRoleDto;

  // 1. 检查角色名称是否重复
  const existsByName = await this.roleRepo.existsByRoleName(rolePayload.roleName);
  if (existsByName) {
    return Result.fail('角色名称已存在');
  }

  // 2. 检查角色权限字符是否重复
  const existsByKey = await this.roleRepo.existsByRoleKey(rolePayload.roleKey);
  if (existsByKey) {
    return Result.fail('角色权限字符已存在');
  }

  // 3. 创建角色
  const createdRole = await this.prisma.sysRole.create({
    data: {
      ...rolePayload,
      roleSort: rolePayload.roleSort ?? 0,
      status: rolePayload.status ?? StatusEnum.NORMAL,
      delFlag: DelFlagEnum.NORMAL,
    },
  });

  // 4. 创建角色菜单关联
  if (menuIds.length > 0) {
    await this.prisma.sysRoleMenu.createMany({
      data: menuIds.map((menuId) => ({ roleId: createdRole.roleId, menuId })),
      skipDuplicates: true,
    });
  }

  // 5. 创建角色部门关联（自定义数据权限）
  if (rolePayload.dataScope === '2' && deptIds.length > 0) {
    await this.prisma.sysRoleDept.createMany({
      data: deptIds.map((deptId) => ({ roleId: createdRole.roleId, deptId })),
      skipDuplicates: true,
    });
  }

  // 6. 记录审计日志
  await this.roleAuditService.recordMenuChange(
    createdRole.roleId,
    [],
    menuIds,
    this.cls.get('user')?.userName,
  );

  return Result.ok(createdRole);
}
```

#### 14.5.2 清除用户权限缓存

```typescript
// role-permission.service.ts
async clearUserPermissionCache(roleId: number): Promise<void> {
  // 1. 查询拥有该角色的用户ID列表
  const userRoles = await this.prisma.sysUserRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  const userIds = userRoles.map((ur) => ur.userId);

  // 2. 批量删除用户权限缓存
  if (userIds.length > 0) {
    const keys = userIds.map((userId) => `sys_user:permissions:${userId}`);
    await this.redisService.del(...keys);
  }

  // 3. 删除角色权限缓存
  await this.redisService.del(`sys_role:permissions:${roleId}`);
}
```

---

**文档结束**
