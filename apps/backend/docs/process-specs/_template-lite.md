# Process Spec: {流程名称}

> 模板级别：**Lite**（CRUD / 查询 / 配置类）
> 适用于不涉及状态机、并发、金额计算、幂等性的简单业务操作。
> 涉及上述任一项时，请使用 `_template-full.md`。

---

## 0. Meta

| 项目         | 值                         |
| ------------ | -------------------------- |
| 流程名称     | {例：创建用户}             |
| 流程编号     | {例：USER_CREATE_V1}       |
| 负责人       | {xxx}                      |
| 最后修改     | {YYYY-MM-DD}               |
| 影响系统     | {Web / App / Mini / Admin} |
| 是否核心链路 | {是 / 否}                  |
| Spec 级别    | Lite                       |

---

## 1. Input Contract

```typescript
interface {Action}Input {
  // 定义完整的输入参数类型
}
```

### 输入规则

| 字段     | 规则                     | Rule ID          |
| -------- | ------------------------ | ---------------- |
| {field1} | {必填 / 可选 / 格式要求} | R-IN-{DOMAIN}-01 |
| {field2} | {长度限制 / 枚举值}      | R-IN-{DOMAIN}-02 |

---

## 2. PreConditions

> 前置条件失败 **不得产生任何副作用**。

| 编号 | 前置条件               | 失败响应      | Rule ID           |
| ---- | ---------------------- | ------------- | ----------------- |
| P1   | {例：用户名不可重复}   | 409 Conflict  | R-PRE-{DOMAIN}-01 |
| P2   | {例：关联部门必须存在} | 404 Not Found | R-PRE-{DOMAIN}-02 |

---

## 3. Test Mapping

| Rule ID            | 测试类型 | Given         | When     | Then              |
| ------------------ | -------- | ------------- | -------- | ----------------- |
| R-IN-{DOMAIN}-01   | 校验     | {field1} 为空 | {action} | 400 参数错误      |
| R-IN-{DOMAIN}-02   | 边界     | {field2} 超长 | {action} | 422 校验失败      |
| R-PRE-{DOMAIN}-01  | 前置     | 用户名已存在  | {action} | 409 冲突          |
| R-FLOW-{DOMAIN}-01 | 主路径   | 合法输入      | {action} | 创建成功，返回 ID |
