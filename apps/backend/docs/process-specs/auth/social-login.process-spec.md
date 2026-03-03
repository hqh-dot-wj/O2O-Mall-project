# 社交登录流程规约

## 0-Meta

| 属性     | 值                                                |
| -------- | ------------------------------------------------- |
| 操作     | SocialAuthService.handleCallback / bindSocialUser |
| 级别     | Lite                                              |
| 涉及模块 | auth                                              |

## 2-Input

### generateState

| 参数   | 类型         | 校验                |
| ------ | ------------ | ------------------- |
| source | SocialSource | 必填，枚举值 github |

### handleCallback

| 参数     | 类型         | 校验          |
| -------- | ------------ | ------------- |
| source   | SocialSource | 必填          |
| code     | string       | 必填，授权码  |
| state    | string       | 可选，防 CSRF |
| tenantId | string       | 必填          |

### bindSocialUser

| 参数       | 类型           | 校验 |
| ---------- | -------------- | ---- |
| userId     | number         | 必填 |
| source     | SocialSource   | 必填 |
| socialUser | SocialUserInfo | 必填 |
| tenantId   | string         | 必填 |

## 3-PreConditions

| Rule ID         | 描述                                    |
| --------------- | --------------------------------------- |
| R-PRE-SOCIAL-01 | state 参数必须存在                      |
| R-PRE-SOCIAL-02 | state 必须与 Redis 中存储的 source 匹配 |
| R-PRE-SOCIAL-03 | 社交平台策略必须已注册                  |

## 10-TestMapping

| Rule ID          | 测试用例                                                                              |
| ---------------- | ------------------------------------------------------------------------------------- |
| R-FLOW-SOCIAL-01 | Given source, When generateState, Then return UUID and store in Redis                 |
| R-PRE-SOCIAL-01  | Given no state, When handleCallback, Then throw BAD_REQUEST                           |
| R-PRE-SOCIAL-02  | Given mismatched state, When handleCallback, Then throw BAD_REQUEST                   |
| R-PRE-SOCIAL-03  | Given unsupported source, When handleCallback, Then throw BAD_REQUEST                 |
| R-FLOW-SOCIAL-02 | Given valid callback with bound user, When handleCallback, Then return userId         |
| R-FLOW-SOCIAL-03 | Given valid callback with unbound user, When handleCallback, Then return null userId  |
| R-FLOW-SOCIAL-04 | Given userId+socialUser, When bindSocialUser, Then upsert record in DB                |
| R-FLOW-SOCIAL-05 | Given third-party API failure, When handleCallback, Then throw EXTERNAL_SERVICE_ERROR |
