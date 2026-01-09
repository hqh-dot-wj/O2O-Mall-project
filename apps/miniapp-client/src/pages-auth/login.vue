<script lang="ts" setup>
import { ref } from 'vue'
import { useTokenStore } from '@/store/token'
import { REGISTER_PAGE } from '@/router/config'

definePage({
  style: {
    navigationBarTitleText: '登录',
  },
})

const tokenStore = useTokenStore()
const username = ref('')
const password = ref('')

async function doLogin() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
    return
  }
  
  try {
    // 调用登录接口
    await tokenStore.login({
      username: username.value,
      password: password.value,
    })
    // 登录成功，返回上一页
    uni.navigateBack()
  }
  catch (error) {
    console.log('登录失败', error)
  }
}

function toRegister() {
  uni.navigateTo({ url: REGISTER_PAGE })
}
</script>

<template>
  <view class="login-container p-6">
    <view class="text-center text-2xl font-bold mt-10 mb-8">
      欢迎登录
    </view>
    
    <view class="form-item mb-4">
      <view class="text-gray-500 mb-2">用户名</view>
      <input 
        v-model="username" 
        class="input-box w-full h-12 px-4 rounded-lg bg-gray-100" 
        placeholder="请输入用户名" 
      />
    </view>
    
    <view class="form-item mb-8">
      <view class="text-gray-500 mb-2">密码</view>
      <input 
        v-model="password" 
        class="input-box w-full h-12 px-4 rounded-lg bg-gray-100" 
        password 
        placeholder="请输入密码" 
      />
    </view>
    
    <button class="w-full bg-blue-500 text-white rounded-full py-3 text-lg" @click="doLogin">
      登录
    </button>
    
    <view class="mt-6 text-center text-blue-500" @click="toRegister">
      没有账号？去注册
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background-color: #fff;
}
</style>
