<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { getWxCode } from '@/api/login'
import { useUserStore } from '@/store'
import { useAuthStore } from '@/store/auth'
import { useTokenStore } from '@/store/token'

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
    }
    catch (err) {
      console.error(err)
      uni.showToast({ title: '绑定失败', icon: 'none' })
    }
    finally {
      uni.hideLoading()
    }
  }
  else {
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

function goTeam() {
  uni.navigateTo({ url: '/pages/upgrade/team' })
}

function goReferralCode() {
  uni.navigateTo({ url: '/pages/upgrade/referral-code' })
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
          <text v-if="userInfo.phone" class="phone">
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

    <!-- 分销中心 -->
    <view class="service-section" v-if="tokenStore.hasLogin && (userInfo.levelId > 0)">
      <view class="section-header">
        <text class="section-title">分销中心</text>
        <text class="section-tag" v-if="userInfo.levelId > 0">
          {{ userInfo.levelId === 1 ? '高级团长' : '共享股东' }}
        </text>
      </view>
      <view class="grid-container">
        <view class="grid-item" @click="goTeam">
          <view class="icon-wrapper glass-orange">
            <wd-icon name="team" size="48rpx" color="#fff" />
          </view>
          <text class="grid-label">我的团队</text>
        </view>
        <view class="grid-item" v-if="userInfo.levelId === 2" @click="goReferralCode">
          <view class="icon-wrapper glass-blue">
            <wd-icon name="qrcode" size="48rpx" color="#fff" />
          </view>
          <text class="grid-label">我的邀请码</text>
        </view>
      </view>
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

.service-section {
  background: #fff;
  margin: 20rpx;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
  
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32rpx;
    
    .section-title {
      font-size: 30rpx;
      font-weight: 700;
      color: #1e293b;
    }
    
    .section-tag {
      font-size: 20rpx;
      padding: 4rpx 16rpx;
      background: #fff7ed;
      color: #ea580c;
      border-radius: 20rpx;
      font-weight: 600;
    }
  }
  
  .grid-container {
    display: flex;
    flex-wrap: wrap;
    
    .grid-item {
      width: 25%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 10rpx;
      
      .icon-wrapper {
        width: 96rpx;
        height: 96rpx;
        border-radius: 32rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16rpx;
        box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.05);
        
        &.glass-orange {
          background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
        }
        &.glass-blue {
          background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
        }
      }
      
      .grid-label {
        font-size: 24rpx;
        color: #64748b;
        font-weight: 500;
      }
    }
  }
}

.action-section {
  padding: 40rpx 30rpx;

  .logout-btn,
  .login-btn {
    border-radius: 12rpx;
  }
}
</style>
