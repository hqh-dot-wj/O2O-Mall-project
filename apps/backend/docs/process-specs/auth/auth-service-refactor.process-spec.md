# AuthService 重构流程规约（验证码 + 租户列表下沉）

## 0-Meta

| 属性     | 值                                          |
| -------- | ------------------------------------------- |
| 操作     | AuthService.generateCaptcha / getTenantList |
| 级别     | Lite                                        |
| 涉及模块 | auth                                        |

## 2-Input

### generateCaptcha

无输入参数。

### getTenantList

无输入参数。

## 3-PreConditions

| Rule ID          | 描述                                     |
| ---------------- | ---------------------------------------- |
| R-PRE-CAPTCHA-01 | 系统配置 captchaEnabled=false 时跳过生成 |

## 10-TestMapping

| Rule ID           | 测试用例                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| R-FLOW-CAPTCHA-01 | Given captchaEnabled=true, When generateCaptcha, Then return img+uuid          |
| R-FLOW-CAPTCHA-02 | Given captchaEnabled=false, When generateCaptcha, Then return empty img        |
| R-FLOW-CAPTCHA-03 | Given captcha generation error, When generateCaptcha, Then return error result |
| R-FLOW-TENANT-01  | Given tenantEnabled=true, When getTenantList, Then return tenant list from DB  |
| R-FLOW-TENANT-02  | Given tenantEnabled=false, When getTenantList, Then return empty list          |
| R-FLOW-TENANT-03  | Given DB error, When getTenantList, Then return default tenant                 |
