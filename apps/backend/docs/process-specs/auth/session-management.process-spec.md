# 会话管理流程规约

## 0-Meta

| 属性     | 值                |
| -------- | ----------------- |
| 操作     | SessionService.\* |
| 级别     | Lite              |
| 涉及模块 | auth              |

## 2-Input

### saveSession

| 参数        | 类型                    | 校验                 |
| ----------- | ----------------------- | -------------------- |
| uuid        | string                  | 必填，非空           |
| sessionData | Record<string, unknown> | 必填                 |
| ttlMs       | number (可选)           | 正整数，默认全局配置 |

### getSession

| 参数 | 类型   | 校验       |
| ---- | ------ | ---------- |
| uuid | string | 必填，非空 |

### deleteSession

| 参数 | 类型   | 校验       |
| ---- | ------ | ---------- |
| uuid | string | 必填，非空 |

### refreshSessionTtl

| 参数  | 类型   | 校验         |
| ----- | ------ | ------------ |
| uuid  | string | 必填，非空   |
| ttlMs | number | 必填，正整数 |

### getOnlineUsers

| 参数     | 类型   | 校验 |
| -------- | ------ | ---- |
| userName | string | 可选 |
| ipaddr   | string | 可选 |
| pageNum  | number | 可选 |
| pageSize | number | 可选 |

### isSessionActive

| 参数 | 类型   | 校验       |
| ---- | ------ | ---------- |
| uuid | string | 必填，非空 |

## 3-PreConditions

| Rule ID       | 描述                                   |
| ------------- | -------------------------------------- |
| R-PRE-SESS-01 | getSession 会话不存在时返回 null       |
| R-PRE-SESS-02 | refreshSessionTtl 会话不存在时静默跳过 |

## 10-TestMapping

| Rule ID        | 测试用例                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| R-FLOW-SESS-01 | Given uuid+data, When saveSession, Then Redis set with correct key and TTL   |
| R-FLOW-SESS-02 | Given existing session, When getSession, Then return session data            |
| R-PRE-SESS-01  | Given non-existent uuid, When getSession, Then return null                   |
| R-FLOW-SESS-03 | Given uuid, When deleteSession, Then Redis del called                        |
| R-FLOW-SESS-04 | Given existing session, When refreshSessionTtl, Then Redis set with new TTL  |
| R-PRE-SESS-02  | Given non-existent session, When refreshSessionTtl, Then no-op               |
| R-FLOW-SESS-05 | Given Redis keys with sessions, When getOnlineUsers, Then return parsed list |
| R-FLOW-SESS-06 | Given no Redis keys, When getOnlineUsers, Then return empty list             |
| R-FLOW-SESS-07 | Given userName filter, When getOnlineUsers, Then filter by userName          |
| R-FLOW-SESS-08 | Given pageNum+pageSize, When getOnlineUsers, Then return paginated results   |
| R-FLOW-SESS-09 | Given existing session, When isSessionActive, Then return true               |
| R-FLOW-SESS-10 | Given non-existent session, When isSessionActive, Then return false          |
