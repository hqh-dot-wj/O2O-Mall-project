# 枚举与字典管理规范 (Enum & Dictionary Management)

## 1. 核心理念
本系统采用 **“枚举驱动字典 (Enum-Driven Dictionary)”** 的管理模式。其目的是消除代码中的“魔法数字”，实现强类型约束，并保持 UI 显示的灵活性。

*   **枚举 (Enum)**: 定义“值 (Values)”的唯一事实来源，存在于代码中 (`libs/common-types`)。
*   **字典 (Dictionary)**: 定义“表现 (Labels/Colors)”的配置层，存在于数据库中 (`SysDictData`)。

## 2. 目录结构
```text
libs/common-types/src/enum/
├── index.ts          # 统一导出
├── system.enum.ts    # 系统级枚举 (Status, DelFlag, Gender...)
├── business.enum.ts  # 核心业务枚举 (MemberStatus, OrderStatus...)
└── finance.enum.ts   # 财务相关枚举 (TransType, WithdrawalStatus...)
```

## 3. 工作流规范

### 3.1 定义阶段
所有的状态类字段必须在 `libs/common-types` 中定义。
```typescript
// libs/common-types/src/enum/business.enum.ts
export enum MemberStatus {
  NORMAL = '1',
  DISABLED = '2'
}
```

### 3.2 数据库映射 (Prisma)
数据库中的映射应与枚举 Value 保持一致：
```prisma
enum MemberStatus {
  NORMAL   @map("1")
  DISABLED @map("2")
}
```

### 3.3 前端使用
前端不再手动维护映射映射表，而是直接引用枚举。
```typescript
import { MemberStatus } from '@libs/common-types';

// 类型安全
const isNormal = row.status === MemberStatus.NORMAL;

// 标签获取 (通过 useDict hook)
const { record } = useDict('sys_member_status');
const label = record[MemberStatus.NORMAL]; // 返回数据库配置的 "正常"
```

## 4. 字典转换机制 (VO)
为了进一步简化前端逻辑，后端在返回数据时会自动注入标签。

**原始数据:**
```json
{ "status": "1" }
```
**客户端接收到的数据 (经过 VO 转换):**
```json
{
  "status": "1",
  "statusLabel": "正常",
  "statusTag": "success"
}
```

## 5. 同步机制 (Maintenance)
系统提供 `pnpm seed:dict` 命令。
1. 扫描代码中所有的 `libs` 枚举。
2. 自动检查数据库 `SysDictData` 表。
3. 如果代码中新增了枚举值，自动在数据库中生成对应的“字典项”，默认 Label 为枚举 Key 名。
