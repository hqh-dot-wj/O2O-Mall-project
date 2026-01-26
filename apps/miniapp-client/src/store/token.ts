import type {
  ILoginForm,
  IRegisterForm,
} from '@/api/login'
import type { IAuthLoginRes, IRegisterMobileParams, ISingleTokenRes, IWxRegisterParams } from '@/api/types/login'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue' // 修复：导入 computed
import {
  login as _login,
  logout as _logout,
  mobileLogin as _mobileLogin,
  refreshToken as _refreshToken,
  register as _register,
  wxLogin as _wxLogin,
  wxRegister as _wxRegister,
  getWxCode,
} from '@/api/login'

import { isDoubleTokenRes, isSingleTokenRes } from '@/api/types/login'
import { isDoubleTokenMode } from '@/utils'
import { useUserStore } from './user'

// 初始化状态
const tokenInfoState = isDoubleTokenMode
  ? {
      accessToken: '',
      accessExpiresIn: 0,
      refreshToken: '',
      refreshExpiresIn: 0,
    }
  : {
      token: '',
      expiresIn: 0,
    }

export const useTokenStore = defineStore(
  'token',
  () => {
    // 定义用户信息
    const tokenInfo = ref<IAuthLoginRes>({ ...tokenInfoState })

    // 添加一个时间戳 ref 作为响应式依赖
    const nowTime = ref(Date.now())
    /**
     * 更新响应式数据:now
     * 确保isTokenExpired/isRefreshTokenExpired重新计算,而不是用错误过期缓存值
     * 可useTokenStore内部适时调用;也可链式调用:tokenStore.updateNowTime().hasLogin
     * @returns 最新的tokenStore实例
     */
    const updateNowTime = () => {
      nowTime.value = Date.now()
      return useTokenStore()
    }

    // 设置用户信息
    const setTokenInfo = (val: IAuthLoginRes) => {
      updateNowTime()
      tokenInfo.value = val

      // 计算并存储过期时间
      const now = Date.now()
      if (isSingleTokenRes(val)) {
        // 单token模式
        const expireTime = now + val.expiresIn * 1000
        uni.setStorageSync('accessTokenExpireTime', expireTime)
      }
      else if (isDoubleTokenRes(val)) {
        // 双token模式
        const accessExpireTime = now + val.accessExpiresIn * 1000
        const refreshExpireTime = now + val.refreshExpiresIn * 1000
        uni.setStorageSync('accessTokenExpireTime', accessExpireTime)
        uni.setStorageSync('refreshTokenExpireTime', refreshExpireTime)
      }
    }

    /**
     * 判断token是否过期
     */
    const isTokenExpired = computed(() => {
      if (!tokenInfo.value) {
        return true
      }

      const now = nowTime.value
      const expireTime = uni.getStorageSync('accessTokenExpireTime')

      if (!expireTime)
        return true
      return now >= expireTime
    })

    /**
     * 判断refreshToken是否过期
     */
    const isRefreshTokenExpired = computed(() => {
      if (!isDoubleTokenMode)
        return true

      const now = nowTime.value
      const refreshExpireTime = uni.getStorageSync('refreshTokenExpireTime')

      if (!refreshExpireTime)
        return true
      return now >= refreshExpireTime
    })

    /**
     * 登录成功后处理逻辑
     * @param tokenInfo 登录返回的token信息
     */
    async function _postLogin(tokenInfo: IAuthLoginRes) {
      setTokenInfo(tokenInfo)
      const userStore = useUserStore()
      await userStore.fetchUserInfo()
    }

    /**
     * 用户登录
     * 有的时候后端会用一个接口返回token和用户信息，有的时候会分开2个接口，一个获取token，一个获取用户信息
     * （各有利弊，看业务场景和系统复杂度），这里使用2个接口返回的来模拟
     * @param loginForm 登录参数
     * @returns 登录结果
     */
    const login = async (loginForm: ILoginForm) => {
      try {
        const res = await _login(loginForm)
        console.log('普通登录-res: ', res)
        await _postLogin(res)
        uni.showToast({
          title: '登录成功',
          icon: 'success',
        })
        return res
      }
      catch (error) {
        console.error('登录失败:', error)
        throw error
      }
      finally {
        updateNowTime()
      }
    }

    /**
     * 用户注册
     */
    const register = async (registerForm: IRegisterForm) => {
      try {
        const res = await _register(registerForm)
        console.log('注册-res: ', res)
        // 注册后直接登录，或者跳转登录页
        // 这里假设注册返回的是登录信息，或者注册成功后无需自动登录
        // 如果后端注册只返回成功，不返回token，则需要跳转登录
        // 如果返回token，则自动登录

        // 假设返回token
        if (res) {
          await _postLogin(res)
          uni.showToast({
            title: '注册成功',
            icon: 'success',
          })
          return res
        }
      }
      catch (error) {
        console.error('注册失败:', error)
        throw error
      }
    }

    /**
     * 微信登录
     * 有的时候后端会用一个接口返回token和用户信息，有的时候会分开2个接口，一个获取token，一个获取用户信息
     * （各有利弊，看业务场景和系统复杂度），这里使用2个接口返回的来模拟
     * @returns 登录结果
     */
    /**
     * 微信登录 (静默登录)
     */
    const wxLogin = async () => {
      try {
        const resCode = await getWxCode()
        const code = resCode.code
        console.log('微信登录-code: ', code)
        // 1. 调用 check-login
        const res = await _wxLogin({ code })
        console.log('微信登录-res: ', res)

        // 2. 如果已注册，直接登录
        if (res.isRegistered && res.token) {
          // 构造 IAuthLoginRes
          const loginRes: IAuthLoginRes = {
            token: res.token,
            expiresIn: 7200, // 假设默认过期时间，或者后端返回
            // 注意: 后端 check-login 返回的 format 可能需要适配
            // 这里假设后端 checkLogin 返回的 token 是 string。
            // 实际上 checkLogin 返回的是 Result.ok({ isRegistered: true, token, userInfo })
            // 我们的 http 拦截器已经解包了 Result.data
          }
          // 修正：后端 check-login 返回结构是 { isRegistered, token, userInfo }
          // 但是 setTokenInfo 需要 { token, expiresIn } (单token) 或双token结构
          // 我们需要确认 genToken 返回的是什么。AuthService.genToken 返回的是 string。
          // 所以我们需要手动构造一个符合 ISingleTokenRes 的对象
          const authRes: ISingleTokenRes = {
            token: res.token,
            expiresIn: 60 * 60 * 24 * 7, // 默认7天，或者从配置读取
          }
          await _postLogin(authRes)
          uni.showToast({ title: '登录成功', icon: 'success' })
        }

        return res
      }
      catch (error) {
        console.error('微信登录失败:', error)
        // uni.showToast({ title: '登录失败', icon: 'error' })
        throw error
      }
      finally {
        updateNowTime()
      }
    }

    /**
     * 手机号一键登录
     */
    const mobileLogin = async (params: IRegisterMobileParams) => {
      try {
        const res = await _mobileLogin(params)
        console.log('手机号登录-res:', res)
        // 后端可能未返回 expiresIn，手动补全以确保持久化逻辑正常
        const authRes: IAuthLoginRes = {
          ...res,
          expiresIn: 60 * 60 * 24 * 7,
        }
        await _postLogin(authRes)
        return authRes
      }
      catch (error) {
        console.error('手机号登录失败:', error)
        throw error
      }
      finally {
        updateNowTime()
      }
    }

    /**
     * 微信注册 (无需手机号, chooseAvatar + nickname)
     */
    const wxRegister = async (params: IWxRegisterParams) => {
      try {
        const res = await _wxRegister(params)
        console.log('微信注册-res:', res)
        const authRes: IAuthLoginRes = {
          ...res,
          expiresIn: 60 * 60 * 24 * 7,
        }
        await _postLogin(authRes)
        return authRes
      }
      catch (error) {
        console.error('微信注册失败:', error)
        throw error
      }
      finally {
        updateNowTime()
      }
    }

    /**
     * 退出登录 并 删除用户信息
     */
    const logout = async () => {
      try {
        // TODO 实现自己的退出登录逻辑
        await _logout()
      }
      catch (error) {
        console.error('退出登录失败:', error)
      }
      finally {
        updateNowTime()

        // 无论成功失败，都需要清除本地token信息
        // 清除存储的过期时间
        uni.removeStorageSync('accessTokenExpireTime')
        uni.removeStorageSync('refreshTokenExpireTime')
        console.log('退出登录-清除用户信息')
        tokenInfo.value = { ...tokenInfoState }
        uni.removeStorageSync('token')
        const userStore = useUserStore()
        userStore.clearUserInfo()
      }
    }

    /**
     * 刷新token
     * @returns 刷新结果
     */
    const refreshToken = async () => {
      if (!isDoubleTokenMode) {
        console.error('单token模式不支持刷新token')
        throw new Error('单token模式不支持刷新token')
      }

      try {
        // 安全检查，确保refreshToken存在
        if (!isDoubleTokenRes(tokenInfo.value) || !tokenInfo.value.refreshToken) {
          throw new Error('无效的refreshToken')
        }

        const refreshToken = tokenInfo.value.refreshToken
        const res = await _refreshToken(refreshToken)
        console.log('刷新token-res: ', res)
        setTokenInfo(res)
        return res
      }
      catch (error) {
        console.error('刷新token失败:', error)
        throw error
      }
      finally {
        updateNowTime()
      }
    }

    /**
     * 获取有效的token
     * 注意：在computed中不直接调用异步函数，只做状态判断
     * 实际的刷新操作应由调用方处理
     * 建议这样使用 tokenStore.updateNowTime().validToken
     */
    const getValidToken = computed(() => {
      // token已过期，返回空
      if (isTokenExpired.value) {
        return ''
      }

      if (!isDoubleTokenMode) {
        return isSingleTokenRes(tokenInfo.value) ? tokenInfo.value.token : ''
      }
      else {
        return isDoubleTokenRes(tokenInfo.value) ? tokenInfo.value.accessToken : ''
      }
    })

    /**
     * 检查是否有登录信息（不考虑token是否过期）
     */
    const hasLoginInfo = computed(() => {
      if (!tokenInfo.value) {
        return false
      }
      if (isDoubleTokenMode) {
        return isDoubleTokenRes(tokenInfo.value) && !!tokenInfo.value.accessToken
      }
      else {
        return isSingleTokenRes(tokenInfo.value) && !!tokenInfo.value.token
      }
    })

    /**
     * 检查是否已登录且token有效
     * 建议这样使用tokenStore.updateNowTime().hasLogin
     */
    const hasValidLogin = computed(() => {
      console.log('hasValidLogin', hasLoginInfo.value, !isTokenExpired.value)
      return hasLoginInfo.value && !isTokenExpired.value
    })

    /**
     * 尝试获取有效的token，如果过期且可刷新，则刷新token
     * @returns 有效的token或空字符串
     */
    const tryGetValidToken = async (): Promise<string> => {
      updateNowTime()
      if (!getValidToken.value && isDoubleTokenMode && !isRefreshTokenExpired.value) {
        try {
          await refreshToken()
          return getValidToken.value
        }
        catch (error) {
          console.error('尝试刷新token失败:', error)
          return ''
        }
      }
      return getValidToken.value
    }

    return {
      login,
      register,
      wxLogin,
      mobileLogin,
      wxRegister,
      logout,

      // 认证状态判断（最常用的）
      hasLogin: hasValidLogin,

      // 内部系统使用的方法
      refreshToken,
      tryGetValidToken,
      validToken: getValidToken,

      // 调试或特殊场景可能需要直接访问的信息
      tokenInfo,
      setTokenInfo,
      updateNowTime,
    }
  },
  {
    // 添加持久化配置，确保刷新页面后token信息不丢失
    persist: true,
  },
)
