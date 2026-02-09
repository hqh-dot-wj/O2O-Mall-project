# 活动审批流模块

## 📋 模块概述

活动审批流模块提供营销活动的审批流程管理功能，确保活动上线前经过必要的审核，保障运营操作安全。

**验证需求**: FR-7.3

---

## 🎯 核心功能

### 1. 审批状态管理

支持四种审批状态：

| 状态 | 说明 | 允许的操作 |
|------|------|-----------|
| **DRAFT** | 草稿状态 | 提交审批 |
| **PENDING** | 待审批状态 | 审批通过、审批驳回 |
| **APPROVED** | 已通过状态 | 活动可以上线 |
| **REJECTED** | 已驳回状态 | 重新提交审批 |

### 2. 审批流程

```
┌─────────┐
│  DRAFT  │ 草稿状态（运营编辑中）
└────┬────┘
     │ 提交审批
     ▼
┌─────────┐
│ PENDING │ 待审批状态（等待审批人审核）
└────┬────┘
     │
     ├─────────┐
     │         │
     ▼         ▼
┌──────────┐ ┌──────────┐
│ APPROVED │ │ REJECTED │
└──────────┘ └────┬─────┘
     │            │
     │            │ 重新提交
     │            ▼
     │       ┌─────────┐
     │       │ PENDING │
     │       └─────────┘
     │            │
     │            ▼
     │       ┌──────────┐
     └──────>│ APPROVED │
             └──────────┘
```

### 3. 核心接口

#### 提交审批

```typescript
await approvalService.submitApproval({
  configId: 'config-123',
  submitterId: 'user-456',
  remark: '新春促销活动，请审批'
});
```

**状态变更**: DRAFT → PENDING 或 REJECTED → PENDING

#### 审批通过

```typescript
await approvalService.approve({
  configId: 'config-123',
  approverId: 'admin-789',
  remark: '活动方案合理，批准上线'
});
```

**状态变更**: PENDING → APPROVED

#### 审批驳回

```typescript
await approvalService.reject({
  configId: 'config-123',
  approverId: 'admin-789',
  remark: '折扣力度过大，请调整后重新提交'
});
```

**状态变更**: PENDING → REJECTED

**注意**: 驳回时必须提供驳回原因（remark）

#### 查询审批状态

```typescript
const record = await approvalService.getApprovalStatus('config-123');

console.log(record.status); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT'
console.log(record.approver); // 审批人ID（如果已审批）
console.log(record.approvalTime); // 审批时间（如果已审批）
console.log(record.remark); // 审批意见
```

#### 检查是否可以上线

```typescript
const canPublish = await approvalService.canPublish('config-123');

if (!canPublish) {
  throw new Error('活动未通过审批，无法上线');
}
```

---

## 🔧 集成指南

### 1. 在其他模块中导入

```typescript
import { Module } from '@nestjs/common';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [ApprovalModule],
  // ...
})
export class ConfigModule {}
```

### 2. 在服务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { ApprovalService } from '../approval/approval.service';

@Injectable()
export class ConfigService {
  constructor(
    private readonly approvalService: ApprovalService,
  ) {}

  async publishActivity(configId: string) {
    // 检查审批状态
    const canPublish = await this.approvalService.canPublish(configId);
    
    if (!canPublish) {
      throw new Error('活动未通过审批，无法上线');
    }
    
    // 执行上线逻辑
    // ...
  }
}
```

### 3. 数据库字段扩展

为了支持审批流，需要在 `StorePlayConfig` 表中添加以下字段：

```prisma
model StorePlayConfig {
  // ... 现有字段
  
  // 审批相关字段
  approvalStatus  String    @default("DRAFT") @map("approval_status")
  approver        String?   @map("approver")
  approvalTime    DateTime? @map("approval_time")
  approvalRemark  String?   @map("approval_remark")
  submitTime      DateTime? @map("submit_time")
  submitter       String?   @map("submitter")
  
  // ...
}
```

**数据库迁移**:

```bash
# 创建迁移文件
npx prisma migrate dev --name add_approval_fields

# 应用迁移
npx prisma migrate deploy
```

---

## 📊 状态流转规则

### 合法的状态流转

| 当前状态 | 目标状态 | 操作 | 说明 |
|---------|---------|------|------|
| DRAFT | PENDING | 提交审批 | 运营提交活动配置等待审批 |
| PENDING | APPROVED | 审批通过 | 审批人批准活动配置 |
| PENDING | REJECTED | 审批驳回 | 审批人拒绝活动配置 |
| REJECTED | PENDING | 重新提交 | 运营修改后重新提交审批 |

### 非法的状态流转

| 当前状态 | 目标状态 | 原因 |
|---------|---------|------|
| DRAFT | APPROVED | 必须先提交审批 |
| DRAFT | REJECTED | 必须先提交审批 |
| APPROVED | PENDING | 已通过的活动不能回退 |
| APPROVED | REJECTED | 已通过的活动不能回退 |
| REJECTED | APPROVED | 必须先重新提交审批 |

### 状态流转校验

```typescript
// 检查状态流转是否合法
const isValid = approvalService.isValidTransition(
  currentStatus,
  targetStatus
);

if (!isValid) {
  throw new Error(`非法的审批状态流转：${currentStatus} -> ${targetStatus}`);
}
```

---

## 🎨 前端集成示例

### 1. 提交审批按钮

```typescript
// 提交审批
async function submitApproval(configId: string) {
  try {
    await api.post('/api/marketing/approval/submit', {
      configId,
      submitterId: currentUserId,
      remark: '请审批此活动'
    });
    
    message.success('提交审批成功');
    // 刷新页面或更新状态
  } catch (error) {
    message.error('提交审批失败：' + error.message);
  }
}
```

### 2. 审批操作界面

```typescript
// 审批通过
async function approveActivity(configId: string, remark: string) {
  try {
    await api.post('/api/marketing/approval/approve', {
      configId,
      approverId: currentUserId,
      remark
    });
    
    message.success('审批通过');
  } catch (error) {
    message.error('审批失败：' + error.message);
  }
}

// 审批驳回
async function rejectActivity(configId: string, remark: string) {
  if (!remark) {
    message.error('请填写驳回原因');
    return;
  }
  
  try {
    await api.post('/api/marketing/approval/reject', {
      configId,
      approverId: currentUserId,
      remark
    });
    
    message.success('已驳回');
  } catch (error) {
    message.error('驳回失败：' + error.message);
  }
}
```

### 3. 审批状态展示

```typescript
// 获取审批状态
async function getApprovalStatus(configId: string) {
  const record = await api.get(`/api/marketing/approval/status/${configId}`);
  
  return {
    status: record.status,
    statusText: getStatusText(record.status),
    approver: record.approver,
    approvalTime: record.approvalTime,
    remark: record.remark
  };
}

function getStatusText(status: string): string {
  const statusMap = {
    'DRAFT': '草稿',
    'PENDING': '待审批',
    'APPROVED': '已通过',
    'REJECTED': '已驳回'
  };
  
  return statusMap[status] || '未知';
}
```

---

## 🔒 权限控制建议

### 1. 角色定义

| 角色 | 权限 |
|------|------|
| **运营人员** | 创建活动、编辑活动、提交审批、查看审批状态 |
| **审批人** | 审批通过、审批驳回、查看所有待审批活动 |
| **管理员** | 所有权限 |

### 2. 权限检查示例

```typescript
// 检查是否有审批权限
function checkApprovalPermission(userId: string): boolean {
  const user = getUserById(userId);
  return user.role === 'APPROVER' || user.role === 'ADMIN';
}

// 在审批接口中使用
async function approve(dto: ApprovalActionDto) {
  if (!checkApprovalPermission(dto.approverId)) {
    throw new Error('您没有审批权限');
  }
  
  // 执行审批逻辑
  // ...
}
```

---

## 📈 监控指标

### 建议监控的指标

| 指标 | 说明 | 告警阈值 |
|------|------|---------|
| 待审批活动数量 | PENDING 状态的活动数 | > 50 |
| 平均审批时长 | 从提交到审批完成的平均时间 | > 24小时 |
| 审批通过率 | 通过数 / (通过数 + 驳回数) | < 60% |
| 最老待审批活动 | 最早提交的待审批活动年龄 | > 48小时 |

### 监控日志示例

```typescript
// 记录审批操作日志
this.logger.log({
  action: 'APPROVAL_SUBMITTED',
  configId: 'config-123',
  submitter: 'user-456',
  timestamp: new Date()
});

this.logger.log({
  action: 'APPROVAL_APPROVED',
  configId: 'config-123',
  approver: 'admin-789',
  duration: '2h 30m', // 从提交到审批的时长
  timestamp: new Date()
});
```

---

## 🧪 测试建议

### 1. 单元测试

```typescript
describe('ApprovalService', () => {
  it('应该允许从 DRAFT 提交审批', async () => {
    const result = await approvalService.submitApproval({
      configId: 'config-123',
      submitterId: 'user-456'
    });
    
    expect(result.status).toBe('PENDING');
  });
  
  it('应该允许审批通过', async () => {
    const result = await approvalService.approve({
      configId: 'config-123',
      approverId: 'admin-789',
      remark: '批准'
    });
    
    expect(result.status).toBe('APPROVED');
  });
  
  it('驳回时必须提供原因', async () => {
    await expect(
      approvalService.reject({
        configId: 'config-123',
        approverId: 'admin-789',
        remark: ''
      })
    ).rejects.toThrow('驳回审批必须提供驳回原因');
  });
  
  it('应该正确校验状态流转', () => {
    expect(approvalService.isValidTransition('DRAFT', 'PENDING')).toBe(true);
    expect(approvalService.isValidTransition('DRAFT', 'APPROVED')).toBe(false);
  });
});
```

### 2. 集成测试

```typescript
describe('审批流程集成测试', () => {
  it('完整的审批流程', async () => {
    // 1. 创建活动（状态：DRAFT）
    const config = await createConfig();
    expect(config.approvalStatus).toBe('DRAFT');
    
    // 2. 提交审批（状态：PENDING）
    await approvalService.submitApproval({
      configId: config.id,
      submitterId: 'user-456'
    });
    const pending = await getConfig(config.id);
    expect(pending.approvalStatus).toBe('PENDING');
    
    // 3. 审批通过（状态：APPROVED）
    await approvalService.approve({
      configId: config.id,
      approverId: 'admin-789',
      remark: '批准'
    });
    const approved = await getConfig(config.id);
    expect(approved.approvalStatus).toBe('APPROVED');
    
    // 4. 检查可以上线
    const canPublish = await approvalService.canPublish(config.id);
    expect(canPublish).toBe(true);
  });
  
  it('驳回后重新提交的流程', async () => {
    // 1. 创建并提交审批
    const config = await createConfig();
    await approvalService.submitApproval({
      configId: config.id,
      submitterId: 'user-456'
    });
    
    // 2. 审批驳回（状态：REJECTED）
    await approvalService.reject({
      configId: config.id,
      approverId: 'admin-789',
      remark: '需要修改'
    });
    const rejected = await getConfig(config.id);
    expect(rejected.approvalStatus).toBe('REJECTED');
    
    // 3. 重新提交（状态：PENDING）
    await approvalService.submitApproval({
      configId: config.id,
      submitterId: 'user-456',
      remark: '已修改，请重新审批'
    });
    const resubmitted = await getConfig(config.id);
    expect(resubmitted.approvalStatus).toBe('PENDING');
  });
});
```

---

## 📝 待实现功能

当前实现是基础框架，实际使用时需要完善以下功能：

### 1. 数据库集成

- [ ] 添加 Prisma 查询和更新逻辑
- [ ] 实现审批记录的持久化
- [ ] 添加审批历史记录表（可选）

### 2. 通知功能

- [ ] 提交审批后通知审批人
- [ ] 审批完成后通知提交人
- [ ] 支持邮件、短信、站内信等多种通知方式

### 3. 审批流扩展

- [ ] 支持多级审批（例如：初审 -> 复审 -> 终审）
- [ ] 支持审批委托（审批人可以委托他人审批）
- [ ] 支持审批撤回（提交人可以撤回审批）

### 4. 权限控制

- [ ] 集成权限系统
- [ ] 实现基于角色的访问控制（RBAC）
- [ ] 审批操作日志记录

### 5. API 接口

- [ ] 创建 ApprovalController
- [ ] 实现 RESTful API
- [ ] 添加 Swagger 文档

---

## 🔗 相关文档

- [需求文档](../../../../.kiro/specs/maas-architecture-improvement/requirements.md) - FR-7.3
- [设计文档](../../../../.kiro/specs/maas-architecture-improvement/design.md) - 运营安全机制
- [任务列表](../../../../.kiro/specs/maas-architecture-improvement/tasks.md) - Task 7.3

---

## 📅 更新历史

| 版本 | 日期 | 变更内容 | 负责人 |
|------|------|---------|--------|
| v1.0 | 2024-02-06 | 初始版本，实现基础审批流程 | 开发团队 |

---

**模块状态**: ✅ 基础实现完成  
**待完善**: 数据库集成、通知功能、API 接口  
**验证需求**: FR-7.3
