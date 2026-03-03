# Token 刷新流程规约

## 0-Meta

| 属性     | 值                                                 |
| -------- | -------------------------------------------------- |
| 操作     | TokenService.refreshToken / generateTokenPair      |
| 级别     | Full                                               |
| 涉及模块 | auth                                               |
| 状态机   | 无                                                 |
| 并发     | 无（黑名单机制防重放）                             |
| 幂等性   | 否（每次刷新生成新 Token 对，旧 token 加入黑名单） |

## 1-Why

前端 access_token 短有效期（1h），需要 refresh_token 无感续期。旧方案 access_token = refresh_token，无法独立撤销。

## 2-Input

### generateTokenPair

| 参数   | 类型   | 校验         |
| ------ | ------ | ------------ |
| userId | number | 必填，正整数 |
| uuid   | string | 必填，非空   |

### refreshToken

| 参数         | 类型   | 校验                |
| ------------ | ------ | ------------------- |
| refreshToken | string | 必填，合法 JWT 格式 |

## 3-PreConditions

| Rule ID        | 描述                                     |
| -------------- | ---------------------------------------- |
| R-PRE-TOKEN-01 | refresh_token JWT 签名有效且未过期       |
| R-PRE-TOKEN-02 | refresh_token 的 type 字段必须为 refresh |
| R-PRE-TOKEN-03 | refresh_token 的 jti 不在黑名单中        |
| R-PRE-TOKEN-04 | 对应的 Redis 会话（uuid）必须存在        |

## 4-HappyPath

| Rule ID         | 描述                                                     |
| --------------- | -------------------------------------------------------- |
| R-FLOW-TOKEN-01 | generateTokenPair 生成包含 type=access 的 access_token   |
| R-FLOW-TOKEN-02 | generateTokenPair 生成包含 type=refresh 的 refresh_token |
| R-FLOW-TOKEN-03 | access_token 和 refresh_token 的 jti 不同                |
| R-FLOW-TOKEN-04 | refreshToken 成功后返回新的 Token 对                     |
| R-FLOW-TOKEN-05 | refreshToken 将旧 refresh_token 的 jti 加入黑名单        |
| R-FLOW-TOKEN-06 | refreshToken 更新 Redis 会话 TTL                         |
| R-FLOW-TOKEN-07 | parseExpiresIn 正确解析时间字符串为秒数                  |

## 5-BranchRules

| Rule ID           | 描述                                         |
| ----------------- | -------------------------------------------- |
| R-BRANCH-TOKEN-01 | refresh_token 无效 → 抛出 UNAUTHORIZED       |
| R-BRANCH-TOKEN-02 | refresh_token 已在黑名单 → 抛出 UNAUTHORIZED |
| R-BRANCH-TOKEN-03 | Redis 会话不存在 → 抛出 UNAUTHORIZED         |
| R-BRANCH-TOKEN-04 | decodePayload 对无效 token 返回 null         |

## 7-ExceptionStrategy

| 异常场景          | 错误码       | 错误信息               |
| ----------------- | ------------ | ---------------------- |
| JWT 签名无效/过期 | UNAUTHORIZED | 刷新令牌无效           |
| jti 在黑名单中    | UNAUTHORIZED | 刷新令牌已失效         |
| Redis 会话不存在  | UNAUTHORIZED | 会话已失效，请重新登录 |

## 10-TestMapping

| Rule ID           | 测试用例                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| R-FLOW-TOKEN-01   | Given userId+uuid, When generateTokenPair, Then access_token type=access   |
| R-FLOW-TOKEN-02   | Given userId+uuid, When generateTokenPair, Then refresh_token type=refresh |
| R-FLOW-TOKEN-03   | Given userId+uuid, When generateTokenPair, Then jti are different          |
| R-FLOW-TOKEN-04   | Given valid refresh_token, When refreshToken, Then return new TokenPair    |
| R-FLOW-TOKEN-05   | Given valid refresh_token, When refreshToken, Then old jti blacklisted     |
| R-FLOW-TOKEN-06   | Given valid refresh_token, When refreshToken, Then session TTL updated     |
| R-FLOW-TOKEN-07   | Given '1h', When parseExpiresIn, Then 3600                                 |
| R-PRE-TOKEN-01    | Given expired JWT, When refreshToken, Then UNAUTHORIZED                    |
| R-PRE-TOKEN-02    | Given access_token as refresh, When refreshToken, Then UNAUTHORIZED        |
| R-PRE-TOKEN-03    | Given blacklisted jti, When refreshToken, Then UNAUTHORIZED                |
| R-PRE-TOKEN-04    | Given no session, When refreshToken, Then UNAUTHORIZED                     |
| R-BRANCH-TOKEN-04 | Given invalid token, When decodePayload, Then null                         |
