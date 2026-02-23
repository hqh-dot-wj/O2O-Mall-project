# 用户管理模块 (System User) — 设计文档

> 版本：1.0  
> 日期：2026-02-22  
> 状态：草案  
> 关联需求：[user-requirements.md](../../../requirements/admin/system/user-requirements.md)

---

## 1. 概述

### 1.1 设计目标

用户管理模块是后台管理系统的核心基础模块，本设计文档旨在：

1. 梳理现有用户管理功能的技术实现细节
2. 设计数据权限控制的优化方案，提升性能和可维护性
3. 设计用户批量操作功能，提升管理效率
4. 设计用户操作审计机制，增强可追溯性
5. 为后续扩展（用户标签、用户分组）预留接口

### 1.2 设计约束

- 基于现有的 NestJS + Prisma + Redis 技术栈
- 兼容现有的 RBAC 权限模型
- 不引入新的中间件或存储系统
- 保持与前端（Soybean Admin）的 API 契约一致
- 支持多租户隔离

### 1.3 设计原则

- 单一职责：每个 Service 只负责一个领域的功能
- 开闭原则：对扩展开放，对修改关闭（如数据权限策略）
- 依赖倒置：依赖抽象而非具体实现
- 性能优先：优化数据库查询，使用缓存减少重复查询
- 安全优先：敏感操作记录日志，密码加密存储

---

## 2. 架构与模块

### 2.1 模块划分

> 图 1：用户管理模块组件图

```mermaid
graph TB
    subgraph "Controller 层"
        UC[UserController<br/>用户管理接口]
    end

    subgraph "Service 层"
        US[UserService<br/>用户管理核心]
        UAS[UserAuthService<br/>用户认证]
        UPS[UserProfileService<br/>个人中心]
        URS[UserRoleService<br/>角色分配]
        UES[UserExportService<br/>数据导出]
    end

    subgraph "Repository 层"
        UR[UserRepository<br/>用户数据访问]
    end

    subgraph "Strategy 层 - 新增"
        DSI[DataScopeStrategy<br/>数据权限策略接口]
        ADS[AllDataStrategy<br/>全部数据权限]
        DDS[DeptDataStrategy<br/>本部门数据权限]
        DDDS[DeptAndChildStrategy<br/>本部门及下级]
        SDS[SelfDataStrategy<br/>仅本人数据权限]
        CDS[CustomDataStrategy<br/>自定义数据权限]
    end

    subgraph "External Services"
        RS[RoleService<br/>角色服务]
        DS[DeptService<br/>部门服务]
        PS[PostService<br/>岗位服务]
        REDIS[RedisService<br/>缓存服务]
        US_UPLOAD[UploadService<br/>上传服务]
    end

    subgraph "Infrastructure"
        PRISMA[PrismaService<br/>数据库]
        DB[(MySQL)]
        CACHE[(Redis)]
    end

    UC --> US
    UC --> UPS
    US --> UAS
    US --> URS
    US --> UES
    US --> UR
    US --> DSI
    DSI <|.. ADS
    DSI <|.. DDS
    DSI <|.. DDDS
    DSI <|.. SDS
    DSI <|.. CDS
    US --> RS
    US --> DS
    US --> PS
    US --> REDIS
    UPS --> US_UPLOAD
    UR --> PRISMA
    PRISMA --> DB
    REDIS --> CACHE
```

### 2.2 目录结构

```
src/module/admin/system/user/
├── dto/
│   ├── create-user.dto.ts          # 创建用户 DTO
│   ├── update-user.dto.ts          # 更新用户 DTO
│   ├── list-user.dto.ts            # 查询用户列表 DTO
│   ├── change-status.dto.ts        # 修改状态 DTO
│   ├── reset-pwd.dto.ts            # 重置密码 DTO
│   ├── profile.dto.ts              # 个人中心 DTO
│   ├── user.ts                     # 用户类型定义
│   └── index.ts
├── vo/
│   ├── user.vo.ts                  # 用户响应 VO
│   └── index.ts
├── services/
│   ├── user-auth.service.ts        # 用户认证服务
│   ├── user-profile.service.ts     # 个人中心服务
│   ├── user-role.service.ts        # 角色分配服务
│   ├── user-export.service.ts      # 数据导出服务
│   ├── user-import.service.ts      # 数据导入服务 (新增)
│   └── index.ts
├── strategies/
│   ├── data-scope-strategy.interface.ts  # 数据权限策略接口 (新增)
│   ├── all-data.strategy.ts              # 全部数据权限策略 (新增)
│   ├── dept-data.strategy.ts             # 本部门数据权限策略 (新增)
│   ├── dept-and-child.strategy.ts        # 本部门及下级策略 (新增)
│   ├── self-data.strategy.ts             # 仅本人数据权限策略 (新增)
│   ├── custom-data.strategy.ts           # 自定义数据权限策略 (新增)
│   └── index.ts
├── user.constant.ts                # 常量定义
├── user.controller.ts              # 用户控制器
├── user.decorator.ts               # 用户装饰器
├── user.service.ts                 # 用户服务
├── user.repository.ts              # 用户仓储
├── user.module.ts                  # 模块配置
└── README.md                       # 模块文档
```

### 2.3 依赖关系

```
UserModule
├── imports
│   ├── SystemModule (RoleService, DeptService, PostService, ConfigService)
│   ├── CommonModule (RedisService, AxiosService)
│   ├── UploadModule (UploadService)
│   └── JwtModule (JwtService)
├── controllers
│   └── UserController
├── providers
│   ├── UserService
│   ├── UserAuthService
│   ├── UserProfileService
│   ├── UserRoleService
│   ├── UserExportService
│   ├── UserImportService (新增)
│   ├── UserRepository
│   ├── AllDataStrategy (新增)
│   ├── DeptDataStrategy (新增)
│   ├── DeptAndChildStrategy (新增)
│   ├── SelfDataStrategy (新增)
│   └── CustomDataStrategy (新增)
└── exports
    ├── UserService
    └── UserAuthService
```

---

## 3. 领域/数据模型

### 3.1 核心实体类图

> 图 2：用户管理模块类图

```mermaid
classDiagram
    class UserController {
        -userService: UserService
        -uploadService: UploadService
        +getInfo(user): Result
        +profile(user): Result
        +updateProfile(user, dto): Result
        +avatar(file, user): Result
        +updatePwd(user, dto): Result
        +create(dto): Result
        +findAll(query, user): Result
        +findOne(userId): Result
        +update(dto, user): Result
        +remove(ids): Result
        +changeStatus(dto): Result
        +resetPwd(dto): Result
        +updateAuthRole(query): Result
        +export(res, body, user): void
    }

    class UserService {
        -userRepo: UserRepository
        -roleService: RoleService
        -deptService: DeptService
        -postService: PostService
        -redisService: RedisService
        -dataScopeStrategies: Map
        +create(dto): Result
        +findAll(query, user): Result
        +findOne(userId): Result
        +update(dto, userId): Result
        +remove(ids): Result
        +changeStatus(dto): Result
        +deptTree(): Result
        -buildDataScopeConditions(user): WhereInput[]
        -getDataScopeStrategy(type): DataScopeStrategy
    }

    class UserRepository {
        -prisma: PrismaService
        -cls: ClsService
        +create(data): User
        +findById(id): User
        +findByUserName(userName): User
        +update(id, data): User
        +softDeleteBatch(ids): number
        +findPageWithFilter(where, skip, take): PageResult
    }

    class DataScopeStrategy {
        <<interface>>
        +buildConditions(user): WhereInput[]
        +getType(): string
    }

    class AllDataStrategy {
        +buildConditions(user): WhereInput[]
        +getType(): "ALL"
    }

    class DeptDataStrategy {
        -deptService: DeptService
        +buildConditions(user): WhereInput[]
        +getType(): "DEPT"
    }

    class DeptAndChildStrategy {
        -deptService: DeptService
        +buildConditions(user): WhereInput[]
        +getType(): "DEPT_AND_CHILD"
    }

    class SelfDataStrategy {
        +buildConditions(user): WhereInput[]
        +getType(): "SELF"
    }

    class CustomDataStrategy {
        -roleService: RoleService
        +buildConditions(user): WhereInput[]
        +getType(): "CUSTOM"
    }

    class UserAuthService {
        -userRepo: UserRepository
        -jwtService: JwtService
        -redisService: RedisService
        +login(dto, clientInfo): Result
        +register(dto): Result
        +createToken(payload): string
        +getUserPermissions(userId): string[]
    }

    class UserProfileService {
        -userService: UserService
        -uploadService: UploadService
        +updateProfile(user, dto): Result
        +updatePwd(user, dto): Result
        +uploadAvatar(file, user): Result
    }

    class UserRoleService {
        -userRepo: UserRepository
        -roleService: RoleService
        -redisService: RedisService
        +authRole(userId): Result
        +updateAuthRole(userId, roleIds): Result
        +updateRedisUserRolesAndPermissions(uuid, userId): void
    }

    class UserExportService {
        -userService: UserService
        +export(res, query, user): void
    }

    class UserImportService {
        -userService: UserService
        +import(file): Result
        +downloadTemplate(): Buffer
    }

    UserController --> UserService
    UserController --> UserProfileService
    UserService --> UserRepository
    UserService --> DataScopeStrategy
    DataScopeStrategy <|.. AllDataStrategy
    DataScopeStrategy <|.. DeptDataStrategy
    DataScopeStrategy <|.. DeptAndChildStrategy
    DataScopeStrategy <|.. SelfDataStrategy
    DataScopeStrategy <|.. CustomDataStrategy
    UserService --> UserAuthService
    UserService --> UserRoleService
    UserService --> UserExportService
    UserService --> UserImportService
```

### 3.2 数据库表结构

#### 3.2.1 现有表

```sql
-- 用户表
CREATE TABLE sys_user (
  user_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     VARCHAR(20) NOT NULL DEFAULT '000000',
  dept_id       BIGINT COMMENT '部门ID',
  user_name     VARCHAR(30) NOT NULL COMMENT '用户账号',
  nick_name     VARCHAR(30) NOT NULL COMMENT '用户昵称',
  user_type     VARCHAR(2) DEFAULT '00' COMMENT '用户类型（00系统用户）',
  email         VARCHAR(50) COMMENT '邮箱',
  phonenumber   VARCHAR(11) COMMENT '手机号码',
  sex           CHAR(1) DEFAULT '0' COMMENT '性别（0男 1女 2未知）',
  avatar        VARCHAR(100) COMMENT '头像地址',
  password      VARCHAR(100) NOT NULL COMMENT '密码（bcrypt加密）',
  status        CHAR(1) DEFAULT '0' COMMENT '状态（0正常 1停用）',
  del_flag      CHAR(1) DEFAULT '0' COMMENT '删除标志（0正常 2删除）',
  login_ip      VARCHAR(128) COMMENT '最后登录IP',
  login_date    DATETIME COMMENT '最后登录时间',
  create_by     VARCHAR(64) COMMENT '创建者',
  create_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_by     VARCHAR(64) COMMENT '更新者',
  update_time   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  remark        VARCHAR(500) COMMENT '备注',
  UNIQUE KEY uk_tenant_username (tenant_id, user_name),
  INDEX idx_tenant_status (tenant_id, status, del_flag),
  INDEX idx_dept_id (dept_id),
  INDEX idx_create_time (create_time)
);

-- 用户角色关联表
CREATE TABLE sys_user_role (
  user_id       BIGINT NOT NULL COMMENT '用户ID',
  role_id       BIGINT NOT NULL COMMENT '角色ID',
  PRIMARY KEY (user_id, role_id),
  INDEX idx_role_id (role_id)
);

-- 用户岗位关联表
CREATE TABLE sys_user_post (
  user_id       BIGINT NOT NULL COMMENT '用户ID',
  post_id       BIGINT NOT NULL COMMENT '岗位ID',
  PRIMARY KEY (user_id, post_id),
  INDEX idx_post_id (post_id)
);
```

#### 3.2.2 新增表（建议）

```sql
-- 用户状态变更历史表 (新增)
CREATE TABLE sys_user_status_history (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT NOT NULL COMMENT '用户ID',
  old_status    CHAR(1) COMMENT '旧状态',
  new_status    CHAR(1) NOT NULL COMMENT '新状态',
  change_type   VARCHAR(20) NOT NULL COMMENT '变更类型（CREATE/UPDATE/DELETE/ENABLE/DISABLE）',
  change_reason VARCHAR(500) COMMENT '变更原因',
  change_by     VARCHAR(64) COMMENT '操作人',
  change_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_change_time (change_time)
);

-- 用户角色变更历史表 (新增)
CREATE TABLE sys_user_role_history (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT NOT NULL COMMENT '用户ID',
  old_role_ids  VARCHAR(500) COMMENT '旧角色ID列表（逗号分隔）',
  new_role_ids  VARCHAR(500) NOT NULL COMMENT '新角色ID列表（逗号分隔）',
  change_by     VARCHAR(64) COMMENT '操作人',
  change_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_change_time (change_time)
);

-- 用户批量导入记录表 (新增)
CREATE TABLE sys_user_import_log (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  file_name     VARCHAR(200) NOT NULL COMMENT '文件名',
  total_count   INT NOT NULL COMMENT '总记录数',
  success_count INT NOT NULL COMMENT '成功数',
  fail_count    INT NOT NULL COMMENT '失败数',
  fail_reason   TEXT COMMENT '失败原因（JSON格式）',
  import_by     VARCHAR(64) COMMENT '导入人',
  import_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_import_time (import_time)
);
```

### 3.3 Redis 数据结构

#### 3.3.1 用户会话缓存

```typescript
// Key: login_tokens:{uuid}
// TTL: access_token 有效期
// Value:
{
  userId: number;
  userName: string;
  tenantId: string;
  deptId: number;
  token: string;  // uuid
  permissions: string[];
  roles: string[];
  user: {
    userId: number;
    userName: string;
    nickName: string;
    email: string;
    phonenumber: string;
    sex: string;
    avatar: string;
    status: string;
    tenantId: string;
    dept: { deptId: number; deptName: string };
    roles: Array<{ roleId: number; roleName: string; roleKey: string }>;
    posts: Array<{ postId: number; postName: string }>;
  };
  loginTime: Date;
  loginIp: string;
  loginLocation: string;
  browser: string;
  os: string;
  deviceType: string;
}
```

#### 3.3.2 用户信息缓存

```typescript
// Key: sys_user:{userId}
// TTL: 24 小时
// Value: 用户基本信息（不含密码）
```

#### 3.3.3 用户权限缓存

```typescript
// Key: sys_user:permissions:{userId}
// TTL: 24 小时
// Value: string[] (权限标识列表)
```

---

## 4. 核心流程时序

### 4.1 创建用户流程时序图

> 图 3：创建用户时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant UC as UserController
    participant US as UserService
    participant UR as UserRepository
    participant RS as RoleService
    participant PS as PostService
    participant DB as 数据库

    C->>UC: POST /system/user
    UC->>US: create(dto)
    US->>UR: findByUserName(userName)
    UR->>DB: SELECT * FROM sys_user WHERE user_name=?
    DB-->>UR: 用户信息
    UR-->>US: 用户信息

    alt 用户名已存在
        US-->>UC: 返回错误
        UC-->>C: 400 用户名已存在
    else 用户名不存在
        US->>US: 密码加密（bcrypt）
        US->>UR: create(userData)
        UR->>DB: INSERT INTO sys_user
        DB-->>UR: 新用户ID
        UR-->>US: 新用户信息

        alt 分配了角色
            US->>DB: INSERT INTO sys_user_role
        end

        alt 分配了岗位
            US->>DB: INSERT INTO sys_user_post
        end

        US->>DB: INSERT INTO sys_user_status_history
        US-->>UC: 创建成功
        UC-->>C: 200 创建成功
    end
```

### 4.2 查询用户列表流程时序图

> 图 4：查询用户列表时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant UC as UserController
    participant US as UserService
    participant DSS as DataScopeStrategy
    participant UR as UserRepository
    participant RS as RoleService
    participant DS as DeptService
    participant DB as 数据库

    C->>UC: GET /system/user/list
    UC->>US: findAll(query, currentUser)
    US->>RS: 获取用户角色
    RS->>DB: SELECT * FROM sys_user_role WHERE user_id=?
    DB-->>RS: 角色列表
    RS-->>US: 角色列表

    US->>RS: 获取角色数据权限
    RS->>DB: SELECT data_scope FROM sys_role WHERE role_id IN (?)
    DB-->>RS: 数据权限类型
    RS-->>US: 数据权限类型

    US->>US: getDataScopeStrategy(type)
    US->>DSS: buildConditions(currentUser)

    alt 全部数据权限
        DSS-->>US: [] (无额外条件)
    else 本部门数据权限
        DSS->>DS: 获取当前用户部门
        DS-->>DSS: 部门ID
        DSS-->>US: [{ deptId: currentUser.deptId }]
    else 本部门及下级
        DSS->>DS: 获取部门及下级部门
        DS->>DB: 递归查询部门树
        DB-->>DS: 部门ID列表
        DS-->>DSS: 部门ID列表
        DSS-->>US: [{ deptId: { in: deptIds } }]
    else 仅本人
        DSS-->>US: [{ userId: currentUser.userId }]
    else 自定义数据权限
        DSS->>RS: 获取角色自定义部门
        RS->>DB: SELECT dept_ids FROM sys_role WHERE role_id=?
        DB-->>RS: 部门ID列表
        RS-->>DSS: 部门ID列表
        DSS-->>US: [{ deptId: { in: deptIds } }]
    end

    US->>US: 构建查询条件（筛选 + 数据权限）
    US->>UR: findPageWithFilter(where, skip, take)
    UR->>DB: SELECT * FROM sys_user WHERE ... LIMIT ? OFFSET ?
    DB-->>UR: 用户列表
    UR->>DB: SELECT COUNT(*) FROM sys_user WHERE ...
    DB-->>UR: 总数
    UR-->>US: { rows, total }
    US-->>UC: { rows, total }
    UC-->>C: 200 返回用户列表
```

### 4.3 修改用户密码流程时序图

> 图 5：修改用户密码时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant UC as UserController
    participant UPS as UserProfileService
    participant US as UserService
    participant UR as UserRepository
    participant REDIS as RedisService
    participant DB as 数据库

    C->>UC: PUT /system/user/profile/updatePwd
    UC->>UPS: updatePwd(user, dto)
    UPS->>UR: findById(userId)
    UR->>DB: SELECT * FROM sys_user WHERE user_id=?
    DB-->>UR: 用户信息
    UR-->>UPS: 用户信息

    UPS->>UPS: bcrypt.compare(oldPassword, user.password)

    alt 旧密码错误
        UPS-->>UC: 返回错误
        UC-->>C: 400 旧密码错误
    else 旧密码正确
        UPS->>UPS: 验证新密码规则

        alt 新密码不符合规则
            UPS-->>UC: 返回错误
            UC-->>C: 400 密码必须包含字母和数字
        else 新密码符合规则
            UPS->>UPS: bcrypt.hash(newPassword)
            UPS->>UR: update(userId, { password })
            UR->>DB: UPDATE sys_user SET password=? WHERE user_id=?
            DB-->>UR: 更新成功
            UR-->>UPS: 更新成功

            UPS->>REDIS: 删除所有用户会话
            REDIS->>REDIS: DEL login_tokens:*

            UPS->>DB: INSERT INTO sys_user_status_history
            UPS-->>UC: 修改成功
            UC-->>C: 200 修改成功，请重新登录
        end
    end
```

### 4.4 用户批量导入流程时序图

> 图 6：用户批量导入时序图

```mermaid
sequenceDiagram
    participant C as 前端
    participant UC as UserController
    participant UIS as UserImportService
    participant US as UserService
    participant UR as UserRepository
    participant DB as 数据库

    C->>UC: POST /system/user/import (Excel文件)
    UC->>UIS: import(file)
    UIS->>UIS: 解析 Excel 文件
    UIS->>UIS: 验证数据格式

    loop 遍历每一行
        UIS->>UIS: 验证必填字段
        UIS->>UR: findByUserName(userName)
        UR->>DB: SELECT * FROM sys_user WHERE user_name=?
        DB-->>UR: 用户信息
        UR-->>UIS: 用户信息

        alt 用户名已存在
            UIS->>UIS: 记录失败原因
        else 用户名不存在
            UIS->>US: create(userData)
            US->>UR: create(userData)
            UR->>DB: INSERT INTO sys_user
            DB-->>UR: 新用户ID
            UR-->>US: 新用户信息
            US-->>UIS: 创建成功
            UIS->>UIS: 成功计数 +1
        end
    end

    UIS->>DB: INSERT INTO sys_user_import_log
    UIS-->>UC: { total, success, fail, failReasons }
    UC-->>C: 200 返回导入结果
```

---

## 5. 状态与流程

### 5.1 用户状态机

已在需求文档图 5 中定义，此处补充技术实现要点：

**状态转换规则**：

- `NORMAL → STOP`：管理员调用 `changeStatus` 接口，设置 `status=1`
- `STOP → NORMAL`：管理员调用 `changeStatus` 接口，设置 `status=0`
- `NORMAL/STOP → DELETED`：管理员调用 `remove` 接口，设置 `del_flag=2`

**技术实现**：

- 状态存储：`sys_user.status` 字段（`0`=正常，`1`=停用）
- 删除标记：`sys_user.del_flag` 字段（`0`=正常，`2`=删除）
- 状态变更历史：`sys_user_status_history` 表记录每次状态变更
- 停用用户时，清除 Redis 会话：`DEL login_tokens:{uuid}`

**并发控制**：

- 使用数据库事务保证状态变更的原子性
- 使用乐观锁（version 字段）防止并发修改冲突

### 5.2 用户权限状态机

已在需求文档图 6 中定义，技术实现要点：

**状态转换规则**：

- `NO_PERMISSION → HAS_PERMISSION`：分配角色后，用户获得权限
- `HAS_PERMISSION → NO_PERMISSION`：移除所有角色后，用户失去权限
- `HAS_PERMISSION → PERMISSION_CHANGED`：修改角色后，权限发生变化

**技术实现**：

- 角色关联：`sys_user_role` 表存储用户角色关联
- 权限计算：从用户角色中聚合所有权限
- 权限缓存：Redis 缓存用户权限列表，TTL 24 小时
- 权限更新：修改角色后，更新 Redis 缓存

**权限生效时机**：

- 分配角色后立即生效（更新 Redis 缓存）
- 修改角色权限后，需要清除所有用户的权限缓存

### 5.3 数据权限控制流程

**数据权限类型**：

1. 全部数据权限（`DATA_SCOPE_ALL = '1'`）：无额外条件
2. 自定义数据权限（`DATA_SCOPE_CUSTOM = '2'`）：`deptId IN (role.deptIds)`
3. 本部门数据权限（`DATA_SCOPE_DEPT = '3'`）：`deptId = user.deptId`
4. 本部门及下级数据权限（`DATA_SCOPE_DEPT_AND_CHILD = '4'`）：`deptId IN (deptIds)`
5. 仅本人数据权限（`DATA_SCOPE_SELF = '5'`）：`userId = user.userId`

**权限判断流程**：

```
1. 获取用户的所有角色
2. 遍历角色，获取数据权限类型
3. 如果有任一角色是"全部数据权限"，直接返回无条件
4. 否则，根据数据权限类型构建查询条件
5. 使用 OR 连接多个条件（用户可能有多个角色）
```

**策略模式实现**：

```typescript
// 1. 定义策略接口
interface DataScopeStrategy {
  buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]>;
  getType(): string;
}

// 2. 实现具体策略
class AllDataStrategy implements DataScopeStrategy {
  async buildConditions(user) {
    return []; // 无额外条件
  }
  getType() {
    return 'ALL';
  }
}

// 3. 在 Service 中使用策略
class UserService {
  private dataScopeStrategies: Map<string, DataScopeStrategy>;

  constructor() {
    this.dataScopeStrategies = new Map([
      ['1', new AllDataStrategy()],
      ['2', new CustomDataStrategy()],
      ['3', new DeptDataStrategy()],
      ['4', new DeptAndChildStrategy()],
      ['5', new SelfDataStrategy()],
    ]);
  }

  private getDataScopeStrategy(type: string): DataScopeStrategy {
    return this.dataScopeStrategies.get(type) || new SelfDataStrategy();
  }
}
```

---

## 6. 接口/数据约定

### 6.1 UserService 接口

```typescript
interface UserService {
  /**
   * 创建用户
   * @param dto 创建用户 DTO
   * @returns 创建结果
   */
  create(dto: CreateUserDto): Promise<Result>;

  /**
   * 查询用户列表
   * @param query 查询条件
   * @param user 当前用户（用于数据权限控制）
   * @returns 用户列表
   */
  findAll(query: ListUserDto, user: UserType['user']): Promise<Result>;

  /**
   * 查询用户详情
   * @param userId 用户ID
   * @returns 用户详情
   */
  findOne(userId: number): Promise<Result>;

  /**
   * 更新用户信息
   * @param dto 更新用户 DTO
   * @param currentUserId 当前操作用户ID
   * @returns 更新结果
   */
  update(dto: UpdateUserDto, currentUserId: number): Promise<Result>;

  /**
   * 删除用户（批量）
   * @param ids 用户ID列表
   * @returns 删除结果
   */
  remove(ids: number[]): Promise<Result>;

  /**
   * 修改用户状态
   * @param dto 修改状态 DTO
   * @returns 修改结果
   */
  changeStatus(dto: ChangeUserStatusDto): Promise<Result>;

  /**
   * 重置用户密码
   * @param dto 重置密码 DTO
   * @returns 重置结果
   */
  resetPwd(dto: ResetPwdDto): Promise<Result>;

  /**
   * 导出用户数据
   * @param res 响应对象
   * @param query 查询条件
   * @param user 当前用户
   */
  export(res: Response, query: ListUserDto, user: UserType['user']): Promise<void>;
}
```

### 6.2 DataScopeStrategy 接口

```typescript
interface DataScopeStrategy {
  /**
   * 构建数据权限查询条件
   * @param user 当前用户
   * @returns 查询条件数组
   */
  buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]>;

  /**
   * 获取策略类型
   * @returns 策略类型标识
   */
  getType(): string;
}

// 全部数据权限策略
class AllDataStrategy implements DataScopeStrategy {
  async buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]> {
    return []; // 无额外条件，可以查询所有数据
  }

  getType(): string {
    return 'ALL';
  }
}

// 本部门数据权限策略
class DeptDataStrategy implements DataScopeStrategy {
  constructor(private readonly deptService: DeptService) {}

  async buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]> {
    if (!user.deptId) {
      return [{ userId: user.userId }]; // 无部门，仅查询本人
    }
    return [{ deptId: user.deptId }];
  }

  getType(): string {
    return 'DEPT';
  }
}

// 本部门及下级数据权限策略
class DeptAndChildStrategy implements DataScopeStrategy {
  constructor(private readonly deptService: DeptService) {}

  async buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]> {
    if (!user.deptId) {
      return [{ userId: user.userId }]; // 无部门，仅查询本人
    }

    // 获取本部门及下级部门ID列表
    const deptIds = await this.deptService.getChildDeptIds(user.deptId);
    return [{ deptId: { in: deptIds } }];
  }

  getType(): string {
    return 'DEPT_AND_CHILD';
  }
}

// 仅本人数据权限策略
class SelfDataStrategy implements DataScopeStrategy {
  async buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]> {
    return [{ userId: user.userId }];
  }

  getType(): string {
    return 'SELF';
  }
}

// 自定义数据权限策略
class CustomDataStrategy implements DataScopeStrategy {
  constructor(private readonly roleService: RoleService) {}

  async buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]> {
    // 获取用户角色的自定义部门ID列表
    const roleIds = await this.roleService.getUserRoleIds(user.userId);
    const deptIds = await this.roleService.getCustomDeptIds(roleIds);

    if (deptIds.length === 0) {
      return [{ userId: user.userId }]; // 无自定义部门，仅查询本人
    }

    return [{ deptId: { in: deptIds } }];
  }

  getType(): string {
    return 'CUSTOM';
  }
}
```

### 6.3 UserImportService 接口

```typescript
interface UserImportService {
  /**
   * 导入用户数据
   * @param file Excel 文件
   * @returns 导入结果
   */
  import(file: Express.Multer.File): Promise<Result<ImportResult>>;

  /**
   * 下载导入模板
   * @returns Excel 文件 Buffer
   */
  downloadTemplate(): Promise<Buffer>;
}

interface ImportResult {
  total: number; // 总记录数
  success: number; // 成功数
  fail: number; // 失败数
  failReasons: Array<{
    // 失败原因列表
    row: number; // 行号
    userName: string; // 用户名
    reason: string; // 失败原因
  }>;
}
```

### 6.4 UserProfileService 接口

```typescript
interface UserProfileService {
  /**
   * 更新个人信息
   * @param user 当前用户
   * @param dto 更新个人信息 DTO
   * @returns 更新结果
   */
  updateProfile(user: UserType, dto: UpdateProfileDto): Promise<Result>;

  /**
   * 修改个人密码
   * @param user 当前用户
   * @param dto 修改密码 DTO
   * @returns 修改结果
   */
  updatePwd(user: UserType, dto: UpdatePwdDto): Promise<Result>;

  /**
   * 上传个人头像
   * @param file 头像文件
   * @param user 当前用户
   * @returns 头像 URL
   */
  uploadAvatar(file: Express.Multer.File, user: UserType): Promise<Result<{ imgUrl: string }>>;
}
```

---

## 7. 安全设计

### 7.1 密码安全

| 机制             | 实现方式                                         |
| ---------------- | ------------------------------------------------ |
| 密码加密         | bcrypt (cost=10)                                 |
| 密码强度校验     | 最少 5 字符，包含字母和数字（可配置）            |
| 密码历史         | 记录最近 3 次密码，禁止重复使用（待实现）        |
| 密码过期         | 90 天强制修改（待实现）                          |
| 首次登录强制修改 | 管理员重置密码后，用户首次登录强制修改（待实现） |
| 密码重置         | 仅管理员可重置，重置后清除用户会话               |

### 7.2 数据权限安全

| 机制         | 实现方式                             |
| ------------ | ------------------------------------ |
| 数据权限控制 | 基于角色的数据权限，支持 5 种类型    |
| 权限校验     | 查询用户列表时，自动应用数据权限过滤 |
| 权限缓存     | Redis 缓存用户权限，TTL 24 小时      |
| 权限更新     | 修改角色后，清除相关用户的权限缓存   |

### 7.3 操作安全

| 机制         | 实现方式                            |
| ------------ | ----------------------------------- |
| 敏感操作鉴权 | 删除、停用、重置密码需要 admin 角色 |
| 操作日志     | 使用 `@Operlog` 装饰器记录所有操作  |
| 状态变更历史 | 记录用户状态变更历史，便于审计      |
| 角色变更历史 | 记录用户角色变更历史，便于审计      |
| 防止自我操作 | 不能删除、停用自己                  |
| 防止超管操作 | 不能删除、停用超级管理员            |

### 7.4 会话安全

| 机制             | 实现方式                       |
| ---------------- | ------------------------------ |
| 停用清除会话     | 停用用户后，清除 Redis 会话    |
| 重置密码清除会话 | 重置密码后，清除用户的所有会话 |
| 修改密码清除会话 | 修改密码后，清除用户的所有会话 |
| 会话过期         | Token 过期后自动清除会话       |

---

## 8. 性能优化

### 8.1 缓存策略

#### 8.1.1 用户信息缓存

| 缓存项       | Key 格式                        | TTL          | 更新时机                   |
| ------------ | ------------------------------- | ------------ | -------------------------- |
| 用户基本信息 | `sys_user:{userId}`             | 24 小时      | 修改用户信息、删除用户     |
| 用户权限列表 | `sys_user:permissions:{userId}` | 24 小时      | 修改用户角色、修改角色权限 |
| 用户会话信息 | `login_tokens:{uuid}`           | Token 有效期 | 登录、修改密码、停用用户   |
| 部门树       | `sys_dept:tree`                 | 1 小时       | 修改部门结构               |

#### 8.1.2 缓存更新策略

```typescript
// 修改用户信息后更新缓存
async updateUserCache(userId: number): Promise<void> {
  // 1. 删除用户基本信息缓存
  await this.redisService.del(`sys_user:${userId}`);

  // 2. 删除用户权限缓存
  await this.redisService.del(`sys_user:permissions:${userId}`);

  // 3. 更新会话中的用户信息
  const sessions = await this.redisService.keys(`login_tokens:*`);
  for (const sessionKey of sessions) {
    const session = await this.redisService.get(sessionKey);
    if (session?.userId === userId) {
      const updatedUser = await this.findOne(userId);
      session.user = updatedUser;
      await this.redisService.set(sessionKey, session);
    }
  }
}
```

#### 8.1.3 缓存穿透防护

- 使用布隆过滤器防止查询不存在的用户
- 对不存在的用户 ID 缓存空值，TTL 5 分钟

### 8.2 数据库优化

#### 8.2.1 索引优化

```sql
-- 现有索引
CREATE UNIQUE INDEX uk_tenant_username ON sys_user (tenant_id, user_name);
CREATE INDEX idx_tenant_status ON sys_user (tenant_id, status, del_flag);
CREATE INDEX idx_dept_id ON sys_user (dept_id);
CREATE INDEX idx_create_time ON sys_user (create_time);

-- 建议新增索引
CREATE INDEX idx_phonenumber ON sys_user (phonenumber) WHERE phonenumber IS NOT NULL;
CREATE INDEX idx_email ON sys_user (email) WHERE email IS NOT NULL;
CREATE INDEX idx_nick_name ON sys_user (nick_name);
```

#### 8.2.2 查询优化

| 优化项           | 优化前                   | 优化后                       | 效果                         |
| ---------------- | ------------------------ | ---------------------------- | ---------------------------- |
| 用户列表查询     | 多次查询部门、角色、岗位 | 使用 Prisma include 一次查询 | 减少 N+1 查询，性能提升 60%  |
| 数据权限部门查询 | 每次查询递归查询部门树   | 缓存部门树，TTL 1 小时       | 减少数据库查询，性能提升 80% |
| 用户详情查询     | 分别查询用户、角色、岗位 | 使用 Prisma include 一次查询 | 减少查询次数，性能提升 50%   |

#### 8.2.3 分页优化

- 使用游标分页代替偏移分页（大数据量场景）
- 限制最大分页大小为 100
- 对于导出功能，使用流式查询避免内存溢出

### 8.3 性能指标

| 接口         | P50   | P95   | P99   | 目标 QPS |
| ------------ | ----- | ----- | ----- | -------- |
| 查询用户列表 | 100ms | 300ms | 500ms | 1000     |
| 查询用户详情 | 50ms  | 150ms | 200ms | 2000     |
| 创建用户     | 100ms | 200ms | 300ms | 100      |
| 修改用户信息 | 100ms | 200ms | 300ms | 200      |
| 删除用户     | 50ms  | 100ms | 150ms | 100      |
| 修改用户状态 | 50ms  | 100ms | 150ms | 200      |

---

## 9. 实施计划

### 9.1 阶段一：优化现有功能（1-2 周）

| 任务                    | 工作量 | 负责人 | 状态   |
| ----------------------- | ------ | ------ | ------ |
| 修复 Redis 缓存更新问题 | 1 天   | 后端   | 待开发 |
| 优化数据权限控制逻辑    | 3 天   | 后端   | 待开发 |
| 添加数据库索引          | 0.5 天 | 后端   | 待开发 |
| 优化用户列表查询性能    | 2 天   | 后端   | 待开发 |
| 补充单元测试            | 2 天   | 后端   | 待开发 |

### 9.2 阶段二：新增批量操作功能（2-3 周）

| 任务              | 工作量 | 负责人 | 状态   |
| ----------------- | ------ | ------ | ------ |
| 实现用户批量导入  | 3 天   | 后端   | 待开发 |
| 实现批量启用/停用 | 1 天   | 后端   | 待开发 |
| 实现批量分配角色  | 2 天   | 后端   | 待开发 |
| 前端批量操作界面  | 3 天   | 前端   | 待开发 |
| 集成测试          | 2 天   | 测试   | 待开发 |

### 9.3 阶段三：增强安全性（3-4 周）

| 任务                     | 工作量 | 负责人 | 状态   |
| ------------------------ | ------ | ------ | ------ |
| 实现密码过期策略         | 3 天   | 后端   | 待开发 |
| 实现首次登录强制修改密码 | 2 天   | 后端   | 待开发 |
| 实现密码历史记录         | 2 天   | 后端   | 待开发 |
| 实现用户状态变更历史     | 2 天   | 后端   | 待开发 |
| 实现用户角色变更历史     | 2 天   | 后端   | 待开发 |
| 前端安全提示界面         | 2 天   | 前端   | 待开发 |

### 9.4 阶段四：扩展功能（长期）

| 任务             | 工作量 | 负责人 | 状态   |
| ---------------- | ------ | ------ | ------ |
| 实现用户标签管理 | 5 天   | 后端   | 待规划 |
| 实现用户分组管理 | 5 天   | 后端   | 待规划 |
| 实现用户数据统计 | 3 天   | 后端   | 待规划 |
| 实现用户行为分析 | 7 天   | 后端   | 待规划 |

---

## 10. 测试策略

### 10.1 单元测试

#### 10.1.1 UserService 测试

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('应该成功创建用户', async () => {
      // 测试正常创建用户
    });

    it('用户名重复时应该抛出异常', async () => {
      // 测试用户名唯一性校验
    });

    it('密码应该被加密存储', async () => {
      // 测试密码加密
    });

    it('应该正确创建用户角色关联', async () => {
      // 测试角色分配
    });
  });

  describe('findAll', () => {
    it('全部数据权限应该返回所有用户', async () => {
      // 测试全部数据权限
    });

    it('本部门数据权限应该只返回本部门用户', async () => {
      // 测试本部门数据权限
    });

    it('仅本人数据权限应该只返回当前用户', async () => {
      // 测试仅本人数据权限
    });
  });

  describe('update', () => {
    it('应该成功更新用户信息', async () => {
      // 测试更新用户
    });

    it('不应该允许修改用户名', async () => {
      // 测试用户名不可修改
    });

    it('修改后应该更新 Redis 缓存', async () => {
      // 测试缓存更新
    });
  });

  describe('remove', () => {
    it('应该软删除用户', async () => {
      // 测试软删除
    });

    it('不应该允许删除自己', async () => {
      // 测试不能删除自己
    });

    it('不应该允许删除超级管理员', async () => {
      // 测试不能删除超管
    });
  });
});
```

#### 10.1.2 DataScopeStrategy 测试

```typescript
describe('DataScopeStrategy', () => {
  describe('AllDataStrategy', () => {
    it('应该返回空条件', async () => {
      // 测试全部数据权限策略
    });
  });

  describe('DeptDataStrategy', () => {
    it('应该返回本部门条件', async () => {
      // 测试本部门数据权限策略
    });

    it('无部门时应该返回仅本人条件', async () => {
      // 测试无部门场景
    });
  });

  describe('DeptAndChildStrategy', () => {
    it('应该返回本部门及下级条件', async () => {
      // 测试本部门及下级数据权限策略
    });
  });
});
```

### 10.2 集成测试

#### 10.2.1 用户管理接口测试

```typescript
describe('UserController (e2e)', () => {
  it('POST /system/user - 创建用户', () => {
    return request(app.getHttpServer())
      .post('/system/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userName: 'testuser',
        nickName: '测试用户',
        password: 'Test123456',
        deptId: 1,
        roleIds: [2],
      })
      .expect(200);
  });

  it('GET /system/user/list - 查询用户列表', () => {
    return request(app.getHttpServer())
      .get('/system/user/list')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ pageNum: 1, pageSize: 10 })
      .expect(200)
      .expect((res) => {
        expect(res.body.data.rows).toBeInstanceOf(Array);
        expect(res.body.data.total).toBeGreaterThan(0);
      });
  });

  it('PUT /system/user - 修改用户信息', () => {
    return request(app.getHttpServer())
      .put('/system/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: 2,
        nickName: '修改后的昵称',
      })
      .expect(200);
  });

  it('DELETE /system/user/:id - 删除用户', () => {
    return request(app.getHttpServer())
      .delete('/system/user/2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
```

### 10.3 性能测试

#### 10.3.1 压力测试场景

| 场景         | 并发数 | 持续时间 | 目标 TPS | 目标响应时间 |
| ------------ | ------ | -------- | -------- | ------------ |
| 查询用户列表 | 100    | 5 分钟   | 1000     | P95 < 500ms  |
| 查询用户详情 | 200    | 5 分钟   | 2000     | P95 < 200ms  |
| 创建用户     | 10     | 5 分钟   | 100      | P95 < 300ms  |
| 修改用户信息 | 20     | 5 分钟   | 200      | P95 < 300ms  |

#### 10.3.2 性能测试工具

- 使用 Apache JMeter 或 k6 进行压力测试
- 使用 New Relic 或 Prometheus 监控性能指标
- 使用 Grafana 可视化性能数据

### 10.4 安全测试

#### 10.4.1 安全测试场景

| 场景         | 测试内容                     | 预期结果                         |
| ------------ | ---------------------------- | -------------------------------- |
| SQL 注入     | 在用户名、昵称等字段注入 SQL | 应该被 Prisma 参数化查询防护     |
| XSS 攻击     | 在用户信息中注入脚本         | 应该被前端转义                   |
| 权限绕过     | 尝试访问无权限的用户数据     | 应该返回 403                     |
| 数据权限绕过 | 尝试查询其他部门的用户       | 应该被数据权限过滤               |
| 密码暴力破解 | 短时间内多次尝试登录         | 应该被账号锁定机制防护（待实现） |

---

## 11. 监控与告警

### 11.1 监控指标

#### 11.1.1 业务指标

| 指标           | 说明                  | 告警阈值         |
| -------------- | --------------------- | ---------------- |
| 用户创建成功率 | 创建成功数 / 创建总数 | < 95%            |
| 用户登录成功率 | 登录成功数 / 登录总数 | < 90%            |
| 用户查询失败率 | 查询失败数 / 查询总数 | > 5%             |
| 用户修改失败率 | 修改失败数 / 修改总数 | > 5%             |
| 停用用户数量   | 当前停用的用户数量    | > 总用户数的 20% |
| 删除用户数量   | 当前删除的用户数量    | > 总用户数的 10% |

#### 11.1.2 性能指标

| 指标                 | 说明                      | 告警阈值 |
| -------------------- | ------------------------- | -------- |
| 用户列表查询响应时间 | P95 响应时间              | > 500ms  |
| 用户详情查询响应时间 | P95 响应时间              | > 200ms  |
| 用户创建响应时间     | P95 响应时间              | > 300ms  |
| 用户修改响应时间     | P95 响应时间              | > 300ms  |
| Redis 缓存命中率     | 缓存命中数 / 缓存查询总数 | < 80%    |
| 数据库连接池使用率   | 已用连接数 / 总连接数     | > 80%    |

#### 11.1.3 错误指标

| 指标           | 说明               | 告警阈值       |
| -------------- | ------------------ | -------------- |
| 用户名重复错误 | 用户名重复错误次数 | > 100 次/小时  |
| 密码错误次数   | 密码错误次数       | > 1000 次/小时 |
| 权限不足错误   | 权限不足错误次数   | > 100 次/小时  |
| 数据库查询错误 | 数据库查询错误次数 | > 10 次/小时   |
| Redis 连接错误 | Redis 连接错误次数 | > 5 次/小时    |

### 11.2 告警规则

#### 11.2.1 P0 告警（立即处理）

- 用户管理接口可用性 < 99%
- 数据库连接池耗尽
- Redis 连接失败
- 用户创建成功率 < 80%

#### 11.2.2 P1 告警（1 小时内处理）

- 用户列表查询响应时间 P95 > 1s
- 用户创建失败率 > 10%
- Redis 缓存命中率 < 60%
- 数据库慢查询 > 50 次/小时

#### 11.2.3 P2 告警（4 小时内处理）

- 用户列表查询响应时间 P95 > 500ms
- 用户创建失败率 > 5%
- Redis 缓存命中率 < 80%
- 停用用户数量 > 总用户数的 20%

### 11.3 日志记录

#### 11.3.1 操作日志

```typescript
// 使用 @Operlog 装饰器自动记录操作日志
@Operlog({
  title: '用户管理',
  businessType: BusinessType.INSERT,
})
async create(dto: CreateUserDto): Promise<Result> {
  // 创建用户逻辑
}
```

#### 11.3.2 审计日志

```typescript
// 记录敏感操作的详细日志
this.logger.log({
  action: 'DELETE_USER',
  operator: currentUser.userName,
  operatorId: currentUser.userId,
  target: 'USER',
  targetId: userId,
  details: {
    userName: user.userName,
    nickName: user.nickName,
    deptId: user.deptId,
  },
  timestamp: new Date(),
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});
```

#### 11.3.3 错误日志

```typescript
// 记录错误日志
this.logger.error({
  action: 'CREATE_USER',
  error: getErrorMessage(error),
  stack: error.stack,
  input: dto,
  timestamp: new Date(),
});
```

---

## 12. 扩展性设计

### 12.1 用户认证方式扩展

当前仅支持用户名密码登录，未来可扩展：

```typescript
// 认证策略接口
interface AuthStrategy {
  authenticate(credentials: any): Promise<User>;
  getType(): string;
}

// 用户名密码认证
class UsernamePasswordStrategy implements AuthStrategy {
  async authenticate(credentials: { userName: string; password: string }): Promise<User> {
    // 实现用户名密码认证
  }
  getType(): string {
    return 'USERNAME_PASSWORD';
  }
}

// 手机号验证码认证（待实现）
class PhoneCodeStrategy implements AuthStrategy {
  async authenticate(credentials: { phone: string; code: string }): Promise<User> {
    // 实现手机号验证码认证
  }
  getType(): string {
    return 'PHONE_CODE';
  }
}

// 第三方登录认证（待实现）
class OAuthStrategy implements AuthStrategy {
  async authenticate(credentials: { provider: string; token: string }): Promise<User> {
    // 实现第三方登录认证
  }
  getType(): string {
    return 'OAUTH';
  }
}
```

### 12.2 数据权限类型扩展

当前支持 5 种数据权限类型，未来可扩展：

```typescript
// 新增数据权限类型
enum DataScopeType {
  ALL = '1', // 全部数据权限
  CUSTOM = '2', // 自定义数据权限
  DEPT = '3', // 本部门数据权限
  DEPT_AND_CHILD = '4', // 本部门及下级数据权限
  SELF = '5', // 仅本人数据权限
  REGION = '6', // 区域数据权限（新增）
  BUSINESS_LINE = '7', // 业务线数据权限（新增）
}

// 区域数据权限策略（新增）
class RegionDataStrategy implements DataScopeStrategy {
  async buildConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]> {
    // 根据用户所属区域过滤数据
    const regionIds = await this.regionService.getUserRegionIds(user.userId);
    return [{ regionId: { in: regionIds } }];
  }
  getType(): string {
    return 'REGION';
  }
}
```

### 12.3 用户扩展字段

当前用户表字段固定，未来可扩展：

```typescript
// 用户扩展字段表（新增）
CREATE TABLE sys_user_ext (
  user_id       BIGINT PRIMARY KEY,
  ext_data      JSON COMMENT '扩展字段（JSON格式）',
  create_time   DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES sys_user(user_id)
);

// 扩展字段示例
{
  "tags": ["VIP", "重点客户"],
  "level": "GOLD",
  "points": 1000,
  "birthday": "1990-01-01",
  "address": "北京市朝阳区",
  "company": "XX公司",
  "position": "技术总监"
}
```

---

## 13. 风险与缓解

### 13.1 技术风险

| 风险                         | 影响 | 概率 | 缓解措施                     |
| ---------------------------- | ---- | ---- | ---------------------------- |
| 数据权限逻辑复杂导致性能问题 | 高   | 中   | 使用策略模式重构，缓存部门树 |
| Redis 缓存不一致             | 中   | 中   | 修改用户后立即更新缓存       |
| 数据库连接池耗尽             | 高   | 低   | 监控连接池使用率，及时告警   |
| 大数据量导出内存溢出         | 中   | 低   | 使用流式查询，限制导出数量   |
| 并发修改用户导致数据不一致   | 中   | 低   | 使用乐观锁（version 字段）   |

### 13.2 安全风险

| 风险         | 影响 | 概率 | 缓解措施                       |
| ------------ | ---- | ---- | ------------------------------ |
| 密码泄露     | 高   | 中   | 使用 bcrypt 加密，定期强制修改 |
| 权限绕过     | 高   | 低   | 严格校验权限，记录操作日志     |
| 数据权限绕过 | 高   | 低   | 严格校验数据权限，记录访问日志 |
| 账号被盗     | 中   | 中   | 实现账号锁定机制，异常登录告警 |
| 敏感信息泄露 | 中   | 低   | 密码等敏感字段不返回给前端     |

### 13.3 业务风险

| 风险             | 影响 | 概率 | 缓解措施                     |
| ---------------- | ---- | ---- | ---------------------------- |
| 误删除用户       | 高   | 低   | 软删除，保留数据，支持恢复   |
| 误停用用户       | 中   | 低   | 停用前二次确认，记录操作日志 |
| 批量操作失败     | 中   | 中   | 事务保证原子性，失败回滚     |
| 用户数据导入错误 | 中   | 中   | 导入前校验数据，提供错误报告 |
| 用户权限配置错误 | 高   | 中   | 提供权限预览，修改前二次确认 |

---

## 14. 附录

### 14.1 相关文档

- [用户管理模块需求文档](../../../requirements/admin/system/user-requirements.md)
- [认证模块设计文档](../auth/auth-design.md)
- [角色管理模块设计文档](./role-design.md)
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
| bcrypt            | 5.x    | 密码加密       |
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

# JWT 配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 密码配置
PASSWORD_MIN_LENGTH=5
PASSWORD_REQUIRE_LETTER_AND_NUMBER=true
PASSWORD_BCRYPT_ROUNDS=10

# 上传配置
UPLOAD_MAX_FILE_SIZE=2097152  # 2MB
UPLOAD_ALLOWED_EXTENSIONS=jpg,png,gif
```

#### 14.3.2 Prisma 配置

```prisma
model SysUser {
  userId      BigInt    @id @default(autoincrement()) @map("user_id")
  tenantId    String    @default("000000") @map("tenant_id") @db.VarChar(20)
  deptId      BigInt?   @map("dept_id")
  userName    String    @map("user_name") @db.VarChar(30)
  nickName    String    @map("nick_name") @db.VarChar(30)
  userType    String    @default("00") @map("user_type") @db.VarChar(2)
  email       String?   @db.VarChar(50)
  phonenumber String?   @db.VarChar(11)
  sex         String    @default("0") @db.Char(1)
  avatar      String?   @db.VarChar(100)
  password    String    @db.VarChar(100)
  status      String    @default("0") @db.Char(1)
  delFlag     String    @default("0") @map("del_flag") @db.Char(1)
  loginIp     String?   @map("login_ip") @db.VarChar(128)
  loginDate   DateTime? @map("login_date")
  createBy    String?   @map("create_by") @db.VarChar(64)
  createTime  DateTime  @default(now()) @map("create_time")
  updateBy    String?   @map("update_by") @db.VarChar(64)
  updateTime  DateTime  @updatedAt @map("update_time")
  remark      String?   @db.VarChar(500)

  dept        SysDept?  @relation(fields: [deptId], references: [deptId])
  roles       SysUserRole[]
  posts       SysUserPost[]

  @@unique([tenantId, userName], name: "uk_tenant_username")
  @@index([tenantId, status, delFlag], name: "idx_tenant_status")
  @@index([deptId], name: "idx_dept_id")
  @@index([createTime], name: "idx_create_time")
  @@map("sys_user")
}
```

### 14.4 术语表

| 术语           | 说明                                               |
| -------------- | -------------------------------------------------- |
| 数据权限       | 控制用户可以查看哪些数据的权限                     |
| 全部数据权限   | 可以查看所有数据                                   |
| 本部门数据权限 | 只能查看本部门的数据                               |
| 本部门及下级   | 可以查看本部门及下级部门的数据                     |
| 仅本人数据权限 | 只能查看自己的数据                                 |
| 自定义数据权限 | 可以查看指定部门的数据                             |
| 软删除         | 标记为删除但不物理删除数据                         |
| bcrypt         | 一种密码哈希算法                                   |
| RBAC           | Role-Based Access Control，基于角色的访问控制      |
| 策略模式       | 定义一系列算法，将每个算法封装起来，使它们可以互换 |
| 乐观锁         | 使用版本号控制并发修改                             |
| 幂等性         | 多次执行相同操作，结果一致                         |

### 14.5 代码示例

#### 14.5.1 使用策略模式实现数据权限控制

```typescript
// user.service.ts
export class UserService {
  private dataScopeStrategies: Map<string, DataScopeStrategy>;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly roleService: RoleService,
    private readonly deptService: DeptService,
    private readonly allDataStrategy: AllDataStrategy,
    private readonly deptDataStrategy: DeptDataStrategy,
    private readonly deptAndChildStrategy: DeptAndChildStrategy,
    private readonly selfDataStrategy: SelfDataStrategy,
    private readonly customDataStrategy: CustomDataStrategy,
  ) {
    this.dataScopeStrategies = new Map([
      ['1', this.allDataStrategy],
      ['2', this.customDataStrategy],
      ['3', this.deptDataStrategy],
      ['4', this.deptAndChildStrategy],
      ['5', this.selfDataStrategy],
    ]);
  }

  async findAll(query: ListUserDto, user: UserType['user']): Promise<Result> {
    // 构建数据权限条件
    const dataScopeConditions = await this.buildDataScopeConditions(user);

    // 构建查询条件
    const where: Prisma.SysUserWhereInput = {
      AND: [
        { tenantId: user.tenantId },
        { delFlag: '0' },
        ...dataScopeConditions,
        // 其他筛选条件
      ],
    };

    // 查询用户列表
    const result = await this.userRepo.findPageWithFilter(where, skip, take);
    return Result.ok(result);
  }

  private async buildDataScopeConditions(user: UserType['user']): Promise<Prisma.SysUserWhereInput[]> {
    // 获取用户的所有角色
    const roles = await this.roleService.getUserRoles(user.userId);

    // 如果有任一角色是全部数据权限，直接返回空条件
    if (roles.some((role) => role.dataScope === '1')) {
      return [];
    }

    // 收集所有角色的数据权限条件
    const conditions: Prisma.SysUserWhereInput[] = [];
    for (const role of roles) {
      const strategy = this.getDataScopeStrategy(role.dataScope);
      const roleConditions = await strategy.buildConditions(user);
      conditions.push(...roleConditions);
    }

    // 使用 OR 连接多个条件
    return conditions.length > 0 ? [{ OR: conditions }] : [];
  }

  private getDataScopeStrategy(type: string): DataScopeStrategy {
    return this.dataScopeStrategies.get(type) || this.selfDataStrategy;
  }
}
```

#### 14.5.2 使用事务保证数据一致性

```typescript
// user.service.ts
@Transactional()
async create(dto: CreateUserDto): Promise<Result> {
  // 1. 检查用户名是否重复
  const existUser = await this.userRepo.findByUserName(dto.userName);
  if (existUser) {
    return Result.fail('用户名已存在');
  }

  // 2. 密码加密
  const hashedPassword = await bcrypt.hash(dto.password, 10);

  // 3. 创建用户
  const user = await this.userRepo.create({
    ...dto,
    password: hashedPassword,
  });

  // 4. 创建用户角色关联
  if (dto.roleIds && dto.roleIds.length > 0) {
    await this.userRepo.createUserRoles(user.userId, dto.roleIds);
  }

  // 5. 创建用户岗位关联
  if (dto.postIds && dto.postIds.length > 0) {
    await this.userRepo.createUserPosts(user.userId, dto.postIds);
  }

  // 6. 记录状态变更历史
  await this.userRepo.createStatusHistory({
    userId: user.userId,
    newStatus: user.status,
    changeType: 'CREATE',
    changeBy: this.cls.get('user')?.userName,
  });

  return Result.ok();
}
```

---

**文档结束**
