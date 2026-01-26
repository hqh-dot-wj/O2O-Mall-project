import type { IAuthLoginRes, ICaptcha, ICheckLoginRes, IDoubleTokenRes, IRegisterMobileParams, IUpdateInfo, IUpdatePassword, IUserInfoRes, IWxRegisterParams } from './types/login'
import { http } from '@/http/http'
import { Crypto } from '@/utils/crypto'

/**
 * 登录表单
 */
export interface ILoginForm {
  username: string
  password: string
  code?: string
  uuid?: string
}

export interface IRegisterForm extends ILoginForm {
  confirmPassword?: string
}

/**
 * 获取验证码
 * @returns ICaptcha 验证码
 */
export function getCode() {
  return http.get<ICaptcha>('/user/getCode')
}

/**
 * 获取公钥
 */
export function getPublicKey() {
  return http.get<{ publicKey: string }>('/auth/publicKey')
}

/**
 * 确保公钥已设置
 */
async function ensurePublicKey() {
  if (!Crypto.getPublicKey()) {
    const { publicKey } = await getPublicKey()
    if (publicKey) {
      Crypto.setPublicKey(publicKey)
    }
  }
}

/**
 * 用户登录
 * @param loginForm 登录表单
 */
export async function login(loginForm: ILoginForm) {
  await ensurePublicKey()
  const data = Crypto.encryptRequest(loginForm)
  return http.post<IAuthLoginRes>('/auth/login', data, {}, {
    'x-encrypted': 'true',
  })
}

/**
 * 用户注册
 * @param registerForm 注册表单
 */
export async function register(registerForm: IRegisterForm) {
  await ensurePublicKey()
  const data = Crypto.encryptRequest(registerForm)
  return http.post<IAuthLoginRes>('/auth/register', data, {}, {
    'x-encrypted': 'true',
  })
}

/**
 * 刷新token
 * @param refreshToken 刷新token
 */
export function refreshToken(refreshToken: string) {
  return http.post<IDoubleTokenRes>('/auth/refreshToken', { refreshToken })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return http.get<IUserInfoRes>('/client/user/info')
}

/**
 * 退出登录
 */
export function logout() {
  return http.get<void>('/client/auth/logout')
}

/**
 * 修改用户信息
 */
export function updateInfo(data: IUpdateInfo) {
  return http.post('/user/updateInfo', data)
}

/**
 * 修改用户密码
 */
export function updateUserPassword(data: IUpdatePassword) {
  return http.post('/user/updatePassword', data)
}

/**
 * 获取微信登录凭证
 * @returns Promise 包含微信登录凭证(code)
 */
export function getWxCode() {
  return new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: res => resolve(res),
      fail: err => reject(err),
    })
  })
}

/**
 * 微信登录 (静默登录检查)
 * @param data 包含code
 */
export function wxLogin(data: { code: string }) {
  // 注意：后端接口是 check-login，返回 isRegistered
  // 这里我们为了保持 frontend store 调用方便，返回 ICheckLoginRes
  // 如果已注册，里面会有 token
  return http.post<ICheckLoginRes>('/client/auth/check-login', data)
}

/**
 * 手机号一键登录/注册
 */
export function mobileLogin(data: IRegisterMobileParams) {
  return http.post<IAuthLoginRes>('/client/auth/register-mobile', data)
}

/**
 * 微信注册 (无需手机号, chooseAvatar + nickname)
 */
export function wxRegister(data: IWxRegisterParams) {
  return http.post<IAuthLoginRes>('/client/auth/register', data)
}
