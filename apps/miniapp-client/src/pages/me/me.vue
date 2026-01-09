<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { LOGIN_PAGE } from '@/router/config'
import { useUserStore } from '@/store'
import { useTokenStore } from '@/store/token'
import { getWxCode } from '@/api/login'

definePage({
  style: {
    navigationBarTitleText: '我的',
  },
})

const userStore = useUserStore()
const tokenStore = useTokenStore()
// 使用storeToRefs解构userInfo
const { userInfo } = storeToRefs(userStore)

const isUnregistered = ref(false)

// 微信小程序下登录
async function handleLogin() {
  // #ifdef MP-WEIXIN
  // 微信登录
  const res = await tokenStore.wxLogin()
  if (res && res.isRegistered === false) {
    isUnregistered.value = true
    uni.showToast({ title: '请授权手机号以完成注册', icon: 'none' })
  }

  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateTo({
    url: `${LOGIN_PAGE}`,
  })
  // #endif
}

async function onGetPhoneNumber(e: any) {
  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    uni.showLoading({ title: '登录中...' })
    try {
      const loginRes = await getWxCode()
      await tokenStore.mobileLogin({
        loginCode: loginRes.code,
        phoneCode: e.detail.code,
        tenantId: '000000', // 默认租户
        userInfo: {
            nickName: '微信用户',
            avatarUrl: ''
        }
      })
      isUnregistered.value = false
    } catch (err) {
      console.error(err)
      uni.showToast({ title: '登录失败', icon: 'none' })
    } finally {
      uni.hideLoading()
    }
  } else {
    uni.showToast({ title: '您取消了授权', icon: 'none' })
  }
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        // 清空用户信息
        useTokenStore().logout()
        // 执行退出登录逻辑
        uni.showToast({
          title: '退出登录成功',
          icon: 'success',
        })
        // #ifdef MP-WEIXIN
        // 微信小程序，去首页
        // uni.reLaunch({ url: '/pages/index/index' })
        // #endif
        // #ifndef MP-WEIXIN
        // 非微信小程序，去登录页
        // uni.navigateTo({ url: LOGIN_PAGE })
        // #endif
      }
    },
  })
}
</script>

<template>
  <view class="profile-container">
    <view class="mt-3 break-all px-3 text-center text-green-500">
      {{ userInfo.username ? '已登录' : '未登录' }}
    </view>
    <view class="mt-3 break-all px-3">
      {{ JSON.stringify(userInfo, null, 2) }}
    </view>

    <view class="mt-[60vh] px-3">
      <view class="m-auto w-160px text-center">
        <button v-if="tokenStore.hasLogin" type="warn" class="w-full" @click="handleLogout">
          退出登录
        </button>
        <template v-else>
          <button v-if="isUnregistered" type="primary" class="w-full" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
            手机号一键登录
          </button>
          <button v-else type="primary" class="w-full" @click="handleLogin">
            登录
          </button>
        </template>
      </view>
    </view>
  </view>
</template>
