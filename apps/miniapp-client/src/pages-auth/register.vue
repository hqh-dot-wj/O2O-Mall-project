<script lang="ts" setup>
import { ref } from 'vue'
import { LOGIN_PAGE } from '@/router/config'
import { useTokenStore } from '@/store/token'

definePage({
  style: {
    navigationBarTitleText: '注册',
  },
})

const tokenStore = useTokenStore()
const username = ref('')
const password = ref('')
const confirmPassword = ref('')

async function doRegister() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }

  if (password.value !== confirmPassword.value) {
    uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
    return
  }

  try {
    // 调用注册接口
    await tokenStore.register({
      username: username.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    })

    // 注册成功 (store中已经处理了登录逻辑)，跳转到首页或登录页
    // 这里假设直接登录成功，返回上一页
    uni.navigateBack()
  }
  catch (error) {
    console.log('注册失败', error)
  }
}

function toLogin() {
  uni.navigateTo({ url: LOGIN_PAGE })
}
</script>

<template>
  <view class="register-container p-6">
    <view class="mb-8 mt-10 text-center text-2xl font-bold">
      欢迎注册
    </view>

    <view class="form-item mb-4">
      <view class="mb-2 text-gray-500">
        用户名
      </view>
      <input
        v-model="username"
        class="input-box h-12 w-full rounded-lg bg-gray-100 px-4"
        placeholder="请输入用户名"
      >
    </view>

    <view class="form-item mb-4">
      <view class="mb-2 text-gray-500">
        密码
      </view>
      <input
        v-model="password"
        class="input-box h-12 w-full rounded-lg bg-gray-100 px-4"
        password
        placeholder="请输入密码"
      >
    </view>

    <view class="form-item mb-8">
      <view class="mb-2 text-gray-500">
        确认密码
      </view>
      <input
        v-model="confirmPassword"
        class="input-box h-12 w-full rounded-lg bg-gray-100 px-4"
        password
        placeholder="请再次输入密码"
      >
    </view>

    <button class="w-full rounded-full bg-green-500 py-3 text-lg text-white" @click="doRegister">
      注册
    </button>

    <view class="mt-6 text-center text-blue-500" @click="toLogin">
      已有账号？去登录
    </view>
  </view>
</template>

<style lang="scss" scoped>
.register-container {
  min-height: 100vh;
  background-color: #fff;
}
</style>
