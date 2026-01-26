<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { navigateToInterceptor } from '@/router/interceptor'
import { useAuthStore } from '@/store/auth'
import { useTokenStore } from '@/store/token'

onLaunch((options) => {
  console.log('App.vue onLaunch', options)

  // #ifdef MP-WEIXIN
  // 捕获分享归因参数
  captureShareAttribution(options)

  // 静默登录
  silentLogin()
  // #endif
})

onShow((options) => {
  console.log('App.vue onShow', options)
  // 处理直接进入页面路由的情况：如h5直接输入路由、微信小程序分享后进入等
  // https://github.com/unibest-tech/unibest/issues/192
  if (options?.path) {
    navigateToInterceptor.invoke({ url: `/${options.path}`, query: options.query })
  }
  else {
    navigateToInterceptor.invoke({ url: '/' })
  }
})

onHide(() => {
  console.log('App Hide')
})

/**
 * 捕获分享归因参数
 */
function captureShareAttribution(options: any) {
  const authStore = useAuthStore()
  let shareUserId: string | null = null

  // 卡片分享
  if (options?.query?.shareUserId) {
    shareUserId = options.query.shareUserId
  }

  // 扫码 (小程序码 scene 参数)
  if (options?.query?.scene) {
    try {
      const scene = decodeURIComponent(options.query.scene)
      // 假设 scene 格式: "u=xxx" 或 "shareUserId=xxx"
      const match = scene.match(/(?:u|shareUserId)=([^&]+)/)
      if (match) {
        shareUserId = match[1]
      }
    }
    catch (e) {
      console.warn('解析 scene 参数失败:', e)
    }
  }

  if (shareUserId) {
    console.log('捕获分享归因:', shareUserId)
    authStore.setShareUserId(shareUserId)
  }
}

/**
 * 静默登录 - 检查是否已注册
 */
async function silentLogin() {
  const tokenStore = useTokenStore()

  // 如果已登录则跳过
  if (tokenStore.hasLogin) {
    console.log('已登录，跳过静默登录')
    return
  }

  try {
    // 静默登录检查
    const res = await tokenStore.wxLogin()
    if (res.isRegistered) {
      console.log('静默登录成功')
    }
    else {
      console.log('用户未注册，等待触发授权弹窗')
    }
  }
  catch (e) {
    console.warn('静默登录失败:', e)
  }
}
</script>

<style lang="scss">

</style>
