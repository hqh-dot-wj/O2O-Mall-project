# Postman 测试指南：微信小程序登录流程

本指南演示如何使用 Postman 测试通过 `mock-` 前缀触发的模拟登录流程。

**基础 URL**: `http://localhost:3000` (请根据实际端口调整)

---

## 步骤 1：静默登录检查 (Check Login)

模拟用户刚打开小程序，后端检查该用户是否已注册。

*   **方法**: `POST`
*   **URL**: `{{baseUrl}}/client/auth/check-login`
*   **Headers**: 
    *   `Content-Type`: `application/json`
*   **Body (raw JSON)**:
    ```json
    {
        "code": "mock-user-001"
    }
    ```

**预期结果 (新用户)**:
```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "isRegistered": false
    }
}
```
*说明：`isRegistered: false` 表示用户未注册，前端应弹出“手机号一键登录”按钮。*

---

## 步骤 2：手机号一键注册 (Register Mobile)

模拟用户点击了授权按钮，前端拿到 `phoneCode` 后调用注册接口。

*   **方法**: `POST`
*   **URL**: `{{baseUrl}}/client/auth/register-mobile`
*   **Headers**: 
    *   `Content-Type`: `application/json`
*   **Body (raw JSON)**:
    ```json
    {
        "loginCode": "mock-user-001",
        "phoneCode": "mock-phone-code",
        "tenantId": "000000",
        "userInfo": {
            "nickName": "测试用户",
            "avatarUrl": "https://example.com/avatar.png"
        }
    }
    ```
    *注意：`loginCode` 必须和步骤 1 中的 `code` 保持一致，代表同一个用户。*

**预期结果 (注册成功)**:
```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "userInfo": {
            "memberId": 1,
            "tenantId": "000000",
            "mobile": "13800138000",
            "nickname": "测试用户",
            "status": "NORMAL"
        }
    }
}
```
*说明：注册成功，返回了 JWT Token 和用户信息。默认 Mock 手机号为 13800138000。*

---

## 步骤 3：再次静默检查 (验证老用户)

模拟用户下次再打开小程序。

*   **方法**: `POST`
*   **URL**: `{{baseUrl}}/client/auth/check-login`
*   **Body (raw JSON)**:
    ```json
    {
        "code": "mock-user-001"
    }
    ```

**预期结果 (已注册)**:
```json
{
    "code": 200,
    "msg": "success",
    "data": {
        "isRegistered": true,
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "userInfo": { ... }
    }
}
```
*说明：这次直接返回了 Token，这就是“静默登录”。*
