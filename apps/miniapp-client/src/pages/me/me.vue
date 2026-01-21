<script lang="ts" setup>
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store'
import { useTokenStore } from '@/store/token'
import { useAuthStore } from '@/store/auth'
import { getWxCode } from '@/api/login'

definePage({
  style: {
    navigationBarTitleText: '我的',
  },
})

const userStore = useUserStore()
const tokenStore = useTokenStore()
const authStore = useAuthStore()

const { userInfo } = storeToRefs(userStore)

// 是否显示手机号绑定提示
const showPhoneBindTip = computed(() => {
  return tokenStore.hasLogin && !userInfo.value?.phone
})

// 微信小程序下登录
async function handleLogin() {
  // #ifdef MP-WEIXIN
  // 打开授权弹窗
  authStore.openAuthModal()
  // #endif

  // #ifndef MP-WEIXIN
  uni.navigateTo({
    url: '/pages-auth/login',
  })
  // #endif
}

// 绑定手机号
async function onBindPhone(e: any) {
  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    uni.showLoading({ title: '绑定中...' })
    try {
      const loginRes = await getWxCode()
      await tokenStore.mobileLogin({
        loginCode: loginRes.code,
        phoneCode: e.detail.code,
        tenantId: '000000',
        userInfo: {
          nickName: userInfo.value?.nickname || '微信用户',
          avatarUrl: userInfo.value?.avatar || '',
        },
      })
      uni.showToast({ title: '绑定成功', icon: 'success' })
    } catch (err) {
      console.error(err)
      uni.showToast({ title: '绑定失败', icon: 'none' })
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
        tokenStore.logout()
        uni.showToast({
          title: '退出登录成功',
          icon: 'success',
        })
      }
    },
  })
}
</script>

<template>
  <view class="profile-container">
    <!-- 手机号绑定提示 -->
    <view v-if="showPhoneBindTip" class="phone-bind-tip">
      <wd-icon name="phone" size="32rpx" color="#1890ff" />
      <text class="tip-text">绑定手机号，享受更好的服务体验</text>
      <button class="bind-btn" open-type="getPhoneNumber" @getphonenumber="onBindPhone">
        去绑定
      </button>
    </view>

    <!-- 用户信息 -->
    <view class="user-section">
      <template v-if="tokenStore.hasLogin">
        <image
          class="avatar"
          :src="userInfo.avatar || '/static/images/default-avatar.png'"
          mode="aspectFill"
        />
        <view class="user-info">
          <text class="nickname">{{ userInfo.nickname || '微信用户' }}</text>
          <text class="phone" v-if="userInfo.phone">
            {{ userInfo.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') }}
          </text>
        </view>
      </template>
      <template v-else>
        <image class="avatar" src="/static/images/default-avatar.png" mode="aspectFill" />
        <view class="user-info">
          <text class="login-tip" @click="handleLogin">点击登录</text>
        </view>
      </template>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section">
      <button v-if="tokenStore.hasLogin" type="warn" class="logout-btn" @click="handleLogout">
        退出登录
      </button>
      <button v-else type="primary" class="login-btn" @click="handleLogin">
        登录 / 注册
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.phone-bind-tip {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  margin: 20rpx;
  border-radius: 12rpx;

  .tip-text {
    flex: 1;
    margin-left: 16rpx;
    font-size: 26rpx;
    color: #1890ff;
  }

  .bind-btn {
    font-size: 24rpx;
    padding: 8rpx 24rpx;
    background: #1890ff;
    color: #fff;
    border-radius: 30rpx;

    &::after {
      display: none;
    }
  }
}

.user-section {
  display: flex;
  align-items: center;
  padding: 40rpx 30rpx;
  background: #fff;
  margin: 20rpx;
  border-radius: 16rpx;

  .avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    border: 4rpx solid #eee;
  }

  .user-info {
    flex: 1;
    margin-left: 24rpx;

    .nickname {
      display: block;
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }

    .phone {
      display: block;
      font-size: 26rpx;
      color: #999;
      margin-top: 8rpx;
    }

    .login-tip {
      font-size: 30rpx;
      color: #1890ff;
    }
  }
}

.action-section {
  padding: 40rpx 30rpx;

  .logout-btn, .login-btn {
    border-radius: 12rpx;
  }
}
</style>

