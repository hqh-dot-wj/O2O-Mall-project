# 请求加密

Nest-Admin-Soybean 采用 AES + RSA 混合加密方案保护敏感数据传输，确保登录、密码修改等关键操作的安全性。

## 加密方案

### 混合加密流程

```
1. 前端生成随机 AES 密钥
2. 使用 AES-CBC 模式加密请求数据
3. 使用服务端 RSA 公钥加密 AES 密钥
4. 发送 { encryptedKey, encryptedData } 到后端
5. 后端使用 RSA 私钥解密 AES 密钥
6. 使用 AES 密钥解密请求数据
```

### 为什么使用混合加密

- **RSA**: 非对称加密，安全但性能低，适合加密密钥
- **AES**: 对称加密，性能高，适合加密大量数据
- **混合方案**: 兼顾安全性和性能

## 后端实现

### 1. 生成 RSA 密钥对

首次使用需要生成 RSA 密钥对：

```bash
cd server
pnpm generate:keys
```

生成的密钥位于：
- `server/keys/private.pem` - RSA 私钥（2048位）
- `server/keys/public.pem` - RSA 公钥

::: warning 安全提示
- 私钥必须妥善保管，不能泄露
- 私钥不能提交到代码仓库
- 生产环境建议使用 4096 位密钥
:::

### 2. 密钥配置

配置文件：`server/src/config/index.ts`

```typescript
export default {
  encrypt: {
    // RSA 密钥路径
    publicKeyPath: path.join(__dirname, '../../keys/public.pem'),
    privateKeyPath: path.join(__dirname, '../../keys/private.pem'),
    
    // AES 配置
    aes: {
      algorithm: 'aes-256-cbc',  // AES-256-CBC 模式
      iv: crypto.randomBytes(16)  // 初始化向量
    }
  }
}
```

### 3. 解密拦截器

位置：`server/src/common/interceptors/decrypt.interceptor.ts`

```typescript
@Injectable()
export class DecryptInterceptor implements NestInterceptor {
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const isEncrypted = request.headers['x-encrypted'] === 'true'
    
    if (!isEncrypted) {
      return next.handle()
    }
    
    try {
      // 解密请求体
      request.body = this.decryptRequest(request.body)
      return next.handle()
    } catch (error) {
      throw new BadRequestException('解密失败')
    }
  }
  
  private decryptRequest(body: any): any {
    const { encryptedKey, encryptedData } = body
    
    // 1. 使用 RSA 私钥解密 AES 密钥
    const privateKey = fs.readFileSync(config.encrypt.privateKeyPath)
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(encryptedKey, 'base64')
    )
    
    // 2. 使用 AES 密钥解密数据
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      aesKey,
      Buffer.from(body.iv, 'base64')
    )
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  }
}
```

### 4. 跳过加密

某些接口不需要加密，使用 `@SkipDecrypt()` 装饰器：

```typescript
@Controller('auth')
export class AuthController {
  
  // 登录需要加密
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }
  
  // 获取公钥不需要加密
  @Get('publicKey')
  @SkipDecrypt()
  async getPublicKey() {
    const publicKey = fs.readFileSync(config.encrypt.publicKeyPath, 'utf8')
    return { publicKey }
  }
}
```

### 5. 应用拦截器

在应用启动时全局应用：

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  
  // 全局应用解密拦截器
  app.useGlobalInterceptors(new DecryptInterceptor())
  
  await app.listen(8080)
}
```

## 前端实现

### 1. 获取公钥

应用启动时获取服务端公钥：

```typescript
// service/api/auth.ts
export async function fetchPublicKey() {
  return request<{ publicKey: string }>({
    url: '/auth/publicKey',
    method: 'GET'
  })
}

// store/modules/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const publicKey = ref('')
  
  async function initPublicKey() {
    const { data } = await fetchPublicKey()
    publicKey.value = data.publicKey
  }
  
  return { publicKey, initPublicKey }
})
```

### 2. 加密工具

位置：`admin-naive-ui/src/service/request/encrypt.ts`

```typescript
import CryptoJS from 'crypto-js'
import JSEncrypt from 'jsencrypt'

/**
 * 加密请求数据
 */
export function encryptRequest(data: any, publicKey: string) {
  // 1. 生成随机 AES 密钥（32字节）
  const aesKey = CryptoJS.lib.WordArray.random(32)
  
  // 2. 生成随机 IV（16字节）
  const iv = CryptoJS.lib.WordArray.random(16)
  
  // 3. 使用 AES-CBC 加密数据
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(data),
    aesKey,
    {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    }
  )
  
  // 4. 使用 RSA 公钥加密 AES 密钥
  const jsencrypt = new JSEncrypt()
  jsencrypt.setPublicKey(publicKey)
  const encryptedKey = jsencrypt.encrypt(
    CryptoJS.enc.Base64.stringify(aesKey)
  )
  
  return {
    encryptedKey,
    encryptedData: encrypted.toString(),
    iv: CryptoJS.enc.Base64.stringify(iv)
  }
}
```

### 3. 请求拦截器

自动加密标记了需要加密的请求：

```typescript
// service/request/instance.ts
import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000
})

// 请求拦截器
instance.interceptors.request.use(config => {
  // 检查是否需要加密
  if (config.encrypt) {
    const publicKey = useAuthStore().publicKey
    
    // 加密请求数据
    config.data = encryptRequest(config.data, publicKey)
    
    // 添加加密标记
    config.headers['x-encrypted'] = 'true'
  }
  
  return config
})

export default instance
```

### 4. API 调用

标记需要加密的请求：

```typescript
// service/api/auth.ts

/** 登录 - 需要加密 */
export function fetchLogin(data: LoginDto) {
  return request<LoginVo>({
    url: '/auth/login',
    method: 'POST',
    data,
    encrypt: true  // 启用加密
  })
}

/** 修改密码 - 需要加密 */
export function fetchUpdatePassword(data: UpdatePasswordDto) {
  return request({
    url: '/system/user/profile/updatePwd',
    method: 'PUT',
    data,
    encrypt: true  // 启用加密
  })
}

/** 查询用户列表 - 不需要加密 */
export function fetchUserList(params: QueryUserDto) {
  return request<UserVo[]>({
    url: '/system/user/list',
    method: 'GET',
    params
    // 不设置 encrypt，默认不加密
  })
}
```

## 需要加密的场景

### 1. 认证相关

- 登录 (`/auth/login`)
- 注册 (`/auth/register`)
- 找回密码 (`/auth/forget`)
- 修改密码 (`/system/user/profile/updatePwd`)

### 2. 敏感信息

- 身份证号
- 银行卡号
- 手机号
- 邮箱

### 3. 关键操作

- 支付相关
- 重要数据导入
- 批量删除

## 安全建议

### 1. 密钥管理

```bash
# 生产环境使用环境变量
export RSA_PRIVATE_KEY=$(cat /secure/path/private.pem)
export RSA_PUBLIC_KEY=$(cat /secure/path/public.pem)

# 或使用密钥管理服务（KMS）
```

### 2. 定期轮换密钥

```typescript
// 支持多个公钥，平滑过渡
const publicKeys = {
  v1: 'old-public-key',
  v2: 'new-public-key'  // 当前使用
}

// 私钥保留旧版本一段时间，兼容旧请求
const privateKeys = {
  v1: 'old-private-key',  // 保留7天
  v2: 'new-private-key'   // 当前使用
}
```

### 3. 限制解密失败次数

```typescript
@Injectable()
export class DecryptInterceptor {
  private failedAttempts = new Map<string, number>()
  
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest()
    const ip = request.ip
    
    try {
      // 解密逻辑
      request.body = this.decryptRequest(request.body)
      
      // 重置失败次数
      this.failedAttempts.delete(ip)
      
      return next.handle()
    } catch (error) {
      // 记录失败次数
      const attempts = this.failedAttempts.get(ip) || 0
      this.failedAttempts.set(ip, attempts + 1)
      
      // 超过5次失败，临时封禁
      if (attempts >= 5) {
        throw new TooManyRequestsException('解密失败次数过多')
      }
      
      throw new BadRequestException('解密失败')
    }
  }
}
```

### 4. HTTPS 传输

虽然有加密，但仍建议使用 HTTPS：

```nginx
# Nginx 配置
server {
    listen 443 ssl http2;
    server_name api.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 强制 HTTPS
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

## 性能优化

### 1. 缓存公钥

前端缓存公钥，避免每次请求：

```typescript
export const useAuthStore = defineStore('auth', () => {
  const publicKey = ref(localStorage.getItem('publicKey') || '')
  
  async function initPublicKey() {
    if (publicKey.value) return
    
    const { data } = await fetchPublicKey()
    publicKey.value = data.publicKey
    localStorage.setItem('publicKey', data.publicKey)
  }
  
  return { publicKey, initPublicKey }
})
```

### 2. 选择性加密

只加密敏感字段，而不是整个请求：

```typescript
function encryptSensitiveFields(data: any, fields: string[]) {
  const encrypted = { ...data }
  
  fields.forEach(field => {
    if (data[field]) {
      encrypted[field] = encrypt(data[field])
    }
  })
  
  return encrypted
}

// 使用
const loginData = {
  username: 'admin',
  password: encrypt('password'),  // 只加密密码
  tenantId: '000000'
}
```

### 3. 压缩后加密

大数据先压缩再加密：

```typescript
import pako from 'pako'

function compressAndEncrypt(data: any) {
  // 1. 序列化
  const json = JSON.stringify(data)
  
  // 2. 压缩
  const compressed = pako.gzip(json)
  
  // 3. 加密
  return encrypt(compressed)
}
```

## 调试工具

开发环境可以关闭加密便于调试：

```typescript
// .env.development
VITE_ENABLE_ENCRYPT=false

// service/request/instance.ts
const shouldEncrypt = (config: AxiosRequestConfig) => {
  // 开发环境可以关闭加密
  if (import.meta.env.VITE_ENABLE_ENCRYPT === 'false') {
    return false
  }
  
  return config.encrypt
}
```

## 常见问题

### Q: 解密失败怎么办？

**排查步骤**：
1. 检查密钥是否正确生成
2. 确认前端获取的公钥与后端私钥匹配
3. 检查 IV 是否正确传输
4. 查看加密算法配置是否一致

### Q: 如何在 Postman 中测试加密接口？

使用 Pre-request Script 加密：

```javascript
// Postman Pre-request Script
const CryptoJS = require('crypto-js')
const publicKey = pm.environment.get('publicKey')

// 加密逻辑
const aesKey = CryptoJS.lib.WordArray.random(32)
const iv = CryptoJS.lib.WordArray.random(16)

const encrypted = CryptoJS.AES.encrypt(
  pm.request.body.raw,
  aesKey,
  { iv: iv, mode: CryptoJS.mode.CBC }
)

pm.request.headers.add({
  key: 'x-encrypted',
  value: 'true'
})

pm.request.body.raw = JSON.stringify({
  encryptedKey: encryptWithRSA(aesKey, publicKey),
  encryptedData: encrypted.toString(),
  iv: CryptoJS.enc.Base64.stringify(iv)
})
```

### Q: 移动端如何实现？

参考前端实现，各平台都有对应的加密库：
- iOS: CryptoSwift
- Android: javax.crypto
- React Native: react-native-rsa-native
- Flutter: encrypt package

## 下一步

- [日志监控](/guide/logging) - 了解日志系统
- [安全实践](/development/security) - 学习安全开发
- [API 开发](/development/api) - 学习 API 开发
