# 账号锁定流程规约

## 0-Meta

| 属性     | 值                    |
| -------- | --------------------- |
| 操作     | AccountLockService.\* |
| 级别     | Lite                  |
| 涉及模块 | auth                  |

## 2-Input

### checkAccountLocked

| 参数     | 类型   | 校验       |
| -------- | ------ | ---------- |
| tenantId | string | 必填，非空 |
| username | string | 必填，非空 |

### recordLoginFail

| 参数     | 类型   | 校验       |
| -------- | ------ | ---------- |
| tenantId | string | 必填，非空 |
| username | string | 必填，非空 |

### clearFailCount

| 参数     | 类型   | 校验       |
| -------- | ------ | ---------- |
| tenantId | string | 必填，非空 |
| username | string | 必填，非空 |

## 3-PreConditions

| Rule ID       | 描述                   |
| ------------- | ---------------------- |
| R-PRE-LOCK-01 | 账号未被锁定时允许登录 |
| R-PRE-LOCK-02 | 账号已被锁定时拒绝登录 |

## 10-TestMapping

| Rule ID        | 测试用例                                                                   |
| -------------- | -------------------------------------------------------------------------- |
| R-PRE-LOCK-01  | Given no lock key, When checkAccountLocked, Then no exception              |
| R-PRE-LOCK-02  | Given lock key exists, When checkAccountLocked, Then throw BUSINESS_ERROR  |
| R-FLOW-LOCK-01 | Given first fail, When recordLoginFail, Then incr=1 and set expire         |
| R-FLOW-LOCK-02 | Given 4th fail, When recordLoginFail, Then remaining=1                     |
| R-FLOW-LOCK-03 | Given 5th fail, When recordLoginFail, Then lock account and return 0       |
| R-FLOW-LOCK-04 | Given login success, When clearFailCount, Then del fail key                |
| R-FLOW-LOCK-05 | Given lock triggered, When lockAccount, Then set lock key and del fail key |
