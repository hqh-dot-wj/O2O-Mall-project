<script lang="ts" setup>
/**
 * 全局授权弹窗 - chooseAvatar + nickname
 * 符合微信2023+新规，使用 open-type="chooseAvatar" 和 type="nickname"
 */
import { ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useTokenStore } from '@/store/token'
import { useLocationStore } from '@/store/location'
import { getWxCode } from '@/api/login'

const authStore = useAuthStore()
const tokenStore = useTokenStore()
const locationStore = useLocationStore()

// 表单数据
const avatar = ref('')
const nickname = ref('')
const submitting = ref(false)

// 头像选择 (微信原生)
function onChooseAvatar(e: any) {
  // e.detail.avatarUrl 是 tmp:// 路径
  // TODO: 后续需上传到 OSS 获取永久链接
  avatar.value = e.detail.avatarUrl
  authStore.tempAvatar = e.detail.avatarUrl
}

// 昵称输入完成
function onNicknameBlur() {
  authStore.tempNickname = nickname.value
}

// 随机头像
function randomAvatar() {
  avatar.value = authStore.generateRandomAvatar()
}

// 随机昵称
function randomNickname() {
  nickname.value = authStore.generateRandomNickname()
}

// 提交授权
async function submitAuth() {
  if (!avatar.value && !nickname.value) {
    uni.showToast({ title: '请选择头像或填写昵称', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    // #ifdef MP-WEIXIN
    const wxRes = await getWxCode()

    // 调用 register 接口
    await tokenStore.wxRegister({
      loginCode: wxRes.code,
      tenantId: locationStore.currentTenantId || '000000',
      referrerId: authStore.getShareUserId() || undefined,
      userInfo: {
        nickName: nickname.value || '微信用户',
        avatarUrl: avatar.value || '',
      },
    })

    uni.showToast({ title: '授权成功', icon: 'success' })
    authStore.onAuthSuccess()
    // #endif
  } catch (err) {
    console.error('授权失败:', err)
    uni.showToast({ title: '授权失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// 关闭弹窗
function onClose() {
  authStore.closeAuthModal()
}
</script>

<template>
  <wd-popup v-model="authStore.showAuthModal" position="bottom" :safe-area-inset-bottom="true" @close="onClose">
    <view class="auth-modal">
      <view class="modal-header">
        <text class="title">完善个人信息</text>
        <text class="subtitle">完善信息后享受更好的服务体验</text>
      </view>

      <view class="modal-body">
        <!-- 头像选择 -->
        <view class="avatar-section">
          <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <image
              class="avatar-img"
              :src="avatar || '/static/images/default-avatar.png'"
              mode="aspectFill"
            />
            <view class="avatar-tip">点击更换头像</view>
          </button>
          <text class="random-btn" @click="randomAvatar">🎲 随机</text>
        </view>

        <!-- 昵称输入 -->
        <view class="nickname-section">
          <view class="input-label">昵称</view>
          <view class="input-row">
            <input
              v-model="nickname"
              type="nickname"
              class="nickname-input"
              placeholder="点击使用微信昵称"
              @blur="onNicknameBlur"
            />
            <text class="random-btn" @click="randomNickname">🎲</text>
          </view>
        </view>
      </view>

      <view class="modal-footer">
        <wd-button type="primary" block :loading="submitting" @click="submitAuth">
          确认授权
        </wd-button>
        <view class="skip-btn" @click="onClose">暂不授权</view>
      </view>
    </view>
  </wd-popup>
</template>

<style lang="scss" scoped>
.auth-modal {
  padding: 40rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
}

.modal-header {
  text-align: center;
  margin-bottom: 40rpx;

  .title {
    display: block;
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 12rpx;
  }

  .subtitle {
    display: block;
    font-size: 26rpx;
    color: #999;
  }
}

.modal-body {
  margin-bottom: 40rpx;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;

  .avatar-btn {
    width: 160rpx;
    height: 160rpx;
    padding: 0;
    background: transparent;
    border: none;
    position: relative;

    &::after {
      display: none;
    }
  }

  .avatar-img {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    border: 4rpx solid #eee;
  }

  .avatar-tip {
    position: absolute;
    bottom: -10rpx;
    left: 50%;
    transform: translateX(-50%);
    font-size: 22rpx;
    color: #1890ff;
    white-space: nowrap;
  }

  .random-btn {
    margin-top: 20rpx;
    font-size: 26rpx;
    color: #666;
  }
}

.nickname-section {
  .input-label {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 16rpx;
  }

  .input-row {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 12rpx;
    padding: 0 24rpx;
  }

  .nickname-input {
    flex: 1;
    height: 88rpx;
    font-size: 28rpx;
  }

  .random-btn {
    font-size: 32rpx;
    padding: 16rpx;
  }
}

.modal-footer {
  .skip-btn {
    text-align: center;
    padding: 24rpx;
    font-size: 26rpx;
    color: #999;
  }
}
</style>
