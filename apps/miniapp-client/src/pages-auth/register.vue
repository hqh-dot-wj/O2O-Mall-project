<script lang="ts" setup>
import { ref } from 'vue'
import { useTokenStore } from '@/store/token'
import { LOGIN_PAGE } from '@/router/config'

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
    <view class="text-center text-2xl font-bold mt-10 mb-8">
      欢迎注册
    </view>
    
    <view class="form-item mb-4">
      <view class="text-gray-500 mb-2">用户名</view>
      <input 
        v-model="username" 
        class="input-box w-full h-12 px-4 rounded-lg bg-gray-100" 
        placeholder="请输入用户名" 
      />
    </view>
    
    <view class="form-item mb-4">
      <view class="text-gray-500 mb-2">密码</view>
      <input 
        v-model="password" 
        class="input-box w-full h-12 px-4 rounded-lg bg-gray-100" 
        password 
        placeholder="请输入密码" 
      />
    </view>
    
    <view class="form-item mb-8">
      <view class="text-gray-500 mb-2">确认密码</view>
      <input 
        v-model="confirmPassword" 
        class="input-box w-full h-12 px-4 rounded-lg bg-gray-100" 
        password 
        placeholder="请再次输入密码" 
      />
    </view>
    
    <button class="w-full bg-green-500 text-white rounded-full py-3 text-lg" @click="doRegister">
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
