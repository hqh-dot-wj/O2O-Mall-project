# Process Spec: 缓存管理

> 模板级别：**Lite**（CRUD / 查询 / 配置类）

---

## 0. Meta

| 项目         | 值              |
| ------------ | --------------- |
| 流程名称     | 缓存监控与管理  |
| 流程编号     | CACHE_MANAGE_V1 |
| 负责人       | -               |
| 最后修改     | 2026-03-03      |
| 影响系统     | Admin           |
| 是否核心链路 | 否              |
| Spec 级别    | Lite            |

---

## 1. Input Contract

### getInfo — 无输入参数

### getNames — 无输入参数

### getKeys

```typescript
interface GetKeysInput {
  id: string; // 缓存名称前缀，如 "login_tokens:"
}
```

### getValue

```typescript
interface GetValueInput {
  cacheName: string; // 缓存分类名称前缀
  cacheKey: string; // 完整缓存键名
}
```

### clearCacheName

```typescript
interface ClearCacheNameInput {
  cacheName: string; // 缓存分类名称前缀
}
```

### clearCacheKey

```typescript
interface ClearCacheKeyInput {
  cacheKey: string; // 完整缓存键名
}
```

### clearCacheAll — 无输入参数

### 输入规则

| 字段      | 规则                         | Rule ID       |
| --------- | ---------------------------- | ------------- |
| id        | 必填，非空字符串             | R-IN-CACHE-01 |
| cacheName | 必填，必须匹配预定义缓存分类 | R-IN-CACHE-02 |
| cacheKey  | 必填，非空字符串             | R-IN-CACHE-03 |

---

## 2. PreConditions

| 编号 | 前置条件       | 失败响应       | Rule ID        |
| ---- | -------------- | -------------- | -------------- |
| P1   | Redis 服务可用 | 500 服务不可用 | R-PRE-CACHE-01 |

---

## 3. Test Mapping

### getInfo

| Rule ID         | 测试类型 | Given                | When    | Then                                 |
| --------------- | -------- | -------------------- | ------- | ------------------------------------ |
| R-FLOW-CACHE-01 | 主路径   | Redis 正常           | getInfo | 返回 info + dbSize + commandStats    |
| R-RESP-CACHE-01 | 返回     | Redis 返回 INFO 数据 | getInfo | info 为 Record<string, string>       |
| R-RESP-CACHE-02 | 返回     | Redis 有命令统计     | getInfo | commandStats 为 {name, value}[] 数组 |

### getNames

| Rule ID         | 测试类型 | Given      | When     | Then                      |
| --------------- | -------- | ---------- | -------- | ------------------------- |
| R-FLOW-CACHE-02 | 主路径   | 预定义分类 | getNames | 返回 7 个缓存分类         |
| R-RESP-CACHE-03 | 返回     | 预定义分类 | getNames | 每项含 cacheName + remark |

### getKeys

| Rule ID         | 测试类型 | Given          | When    | Then               |
| --------------- | -------- | -------------- | ------- | ------------------ |
| R-FLOW-CACHE-03 | 主路径   | 前缀下有缓存键 | getKeys | 返回匹配的键名列表 |
| R-FLOW-CACHE-04 | 边界     | 前缀下无缓存键 | getKeys | 返回空数组         |

### getValue

| Rule ID         | 测试类型 | Given                      | When     | Then                                 |
| --------------- | -------- | -------------------------- | -------- | ------------------------------------ |
| R-FLOW-CACHE-05 | 主路径   | cacheName 和 cacheKey 有效 | getValue | 返回含 cacheName/cacheKey/cacheValue |
| R-FLOW-CACHE-06 | 边界     | cacheKey 对应值为 null     | getValue | cacheValue 为 "null"                 |

### clearCacheName

| Rule ID         | 测试类型 | Given          | When           | Then                     |
| --------------- | -------- | -------------- | -------------- | ------------------------ |
| R-FLOW-CACHE-07 | 主路径   | 分类下有缓存键 | clearCacheName | 删除所有匹配键，返回成功 |
| R-FLOW-CACHE-08 | 边界     | 分类下无缓存键 | clearCacheName | 返回成功（删除 0 个）    |

### clearCacheKey

| Rule ID         | 测试类型 | Given  | When          | Then     |
| --------------- | -------- | ------ | ------------- | -------- |
| R-FLOW-CACHE-09 | 主路径   | 键存在 | clearCacheKey | 删除成功 |

### clearCacheAll

| Rule ID         | 测试类型 | Given        | When          | Then                     |
| --------------- | -------- | ------------ | ------------- | ------------------------ |
| R-FLOW-CACHE-10 | 主路径   | Redis 有数据 | clearCacheAll | 清空所有键，返回删除数量 |
