/**
 * Auth Store - 管理全局登录弹窗状态
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useTokenStore } from './token'
import { useUserStore } from './user'

// 随机头像池
const AVATAR_POOL = [
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI9FhyGvU...',
  // TODO: 添加更多预设头像
]

// 随机昵称池
const NICKNAME_POOL = [
  '快乐的小狗',
  '奔跑的橘猫',
  '睡觉的熊猫',
  '微笑的兔子',
  '可爱的仓鼠',
  '调皮的猴子',
  '优雅的天鹅',
  '勤劳的蜜蜂',
]

// 分享归因过期时间（1天，毫秒）
const SHARE_USER_EXPIRE_MS = 24 * 60 * 60 * 1000

export const useAuthStore = defineStore(
  'auth',
  () => {
    // 全局登录弹窗是否显示
    const showAuthModal = ref(false)
    // 完成授权后的回调
    const authCallback = ref<(() => void) | null>(null)
    // 临时存储的头像 (tmp:// 路径)
    const tempAvatar = ref('')
    // 临时昵称
    const tempNickname = ref('')
    // 分享归因ID
    const shareUserId = ref<string | null>(null)

    // 是否需要绑定手机号 (用户未绑定时提示)
    const needBindPhone = computed(() => {
      const userStore = useUserStore()
      const tokenStore = useTokenStore()
      return tokenStore.hasLogin && !userStore.userInfo?.phone
    })

    // 打开授权弹窗
    function openAuthModal(callback?: () => void) {
      showAuthModal.value = true
      authCallback.value = callback || null
    }

    // 关闭授权弹窗
    function closeAuthModal() {
      showAuthModal.value = false
      authCallback.value = null
    }

    // 授权成功后执行回调
    function onAuthSuccess() {
      if (authCallback.value) {
        authCallback.value()
      }
      closeAuthModal()
    }

    // 生成随机头像
    function generateRandomAvatar(): string {
      const index = Math.floor(Math.random() * AVATAR_POOL.length)
      tempAvatar.value = AVATAR_POOL[index] || ''
      return tempAvatar.value
    }

    // 生成随机昵称
    function generateRandomNickname(): string {
      const index = Math.floor(Math.random() * NICKNAME_POOL.length)
      const suffix = Math.floor(Math.random() * 1000)
      tempNickname.value = `${NICKNAME_POOL[index]}${suffix}`
      return tempNickname.value
    }

    // 设置分享归因（带过期时间）
    function setShareUserId(id: string) {
      shareUserId.value = id
      const expireTime = Date.now() + SHARE_USER_EXPIRE_MS
      uni.setStorageSync('share_user_id', id)
      uni.setStorageSync('share_user_expire', expireTime)
    }

    // 获取分享归因 (检查过期)
    function getShareUserId(): string | null {
      if (shareUserId.value) {
        // 检查内存中的值是否过期
        const expireTime = uni.getStorageSync('share_user_expire')
        if (expireTime && Date.now() < expireTime) {
          return shareUserId.value
        }
        // 已过期，清除
        clearShareUserId()
        return null
      }

      const stored = uni.getStorageSync('share_user_id')
      const expireTime = uni.getStorageSync('share_user_expire')

      // 检查是否过期
      if (stored && expireTime && Date.now() < expireTime) {
        shareUserId.value = stored
        return stored
      }

      // 过期则清除
      clearShareUserId()
      return null
    }

    // 清除分享归因
    function clearShareUserId() {
      shareUserId.value = null
      uni.removeStorageSync('share_user_id')
      uni.removeStorageSync('share_user_expire')
    }

    // 需要登录时的检查 (如未登录弹出授权弹窗)
    function requireAuth(callback?: () => void): boolean {
      const tokenStore = useTokenStore()
      if (tokenStore.hasLogin) {
        return true
      }
      openAuthModal(callback)
      return false
    }

    return {
      showAuthModal,
      tempAvatar,
      tempNickname,
      shareUserId,
      needBindPhone,
      openAuthModal,
      closeAuthModal,
      onAuthSuccess,
      generateRandomAvatar,
      generateRandomNickname,
      setShareUserId,
      getShareUserId,
      clearShareUserId,
      requireAuth,
    }
  },
)
