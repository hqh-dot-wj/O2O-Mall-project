<script lang="ts" setup>
definePage({
  style: {
    navigationBarTitleText: '我的推荐码',
  },
})

import { ref, onMounted } from 'vue'
import { getMyReferralCode } from '@/api/upgrade'
import type { ReferralCodeInfo } from '@/api/upgrade'

const loading = ref(true)
const info = ref<ReferralCodeInfo | null>(null)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const res = await getMyReferralCode()
    if (res) {
      info.value = res
    }
  } catch (err: any) {
    errorMsg.value = err.msg || err.message || '获取失败'
  } finally {
    loading.value = false
  }
})

function handleCopy() {
  if (info.value?.code) {
    uni.setClipboardData({
      data: info.value.code,
      success: () => {
        uni.showToast({ title: '已复制', icon: 'success' })
      },
    })
  }
}

function handleSaveQr() {
  if (info.value?.qrCodeUrl) {
    uni.showLoading({ title: '保存中...' })
    uni.downloadFile({
      url: info.value.qrCodeUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          uni.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              uni.showToast({ title: '已保存到相册', icon: 'success' })
            },
            fail: () => {
              uni.showToast({ title: '保存失败', icon: 'none' })
            },
          })
        }
      },
      fail: () => {
        uni.showToast({ title: '下载失败', icon: 'none' })
      },
      complete: () => {
        uni.hideLoading()
      },
    })
  }
}

function handleBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="page-container">
    <!-- 顶部背景饰物 -->
    <view class="bg-decoration-1"></view>
    <view class="bg-decoration-2"></view>

    <view v-if="loading" class="loading-box">
      <wd-loading size="80rpx" color="#1890ff" />
      <text class="loading-text">正在生成专属于您的推荐码...</text>
    </view>

    <view v-else-if="errorMsg" class="error-box">
      <view class="error-card">
        <wd-icon name="warn-circle" size="100rpx" color="#ff4d4f" />
        <text class="error-text">{{ errorMsg }}</text>
        <text class="sub-text">仅共享股东(C2)角色可享受团队招募特权</text>
        <wd-button type="primary" size="small" custom-class="back-btn" @click="handleBack">
          返回
        </wd-button>
      </view>
    </view>

    <view v-else class="content-box">
      <view class="header-section">
        <text class="page-title">专属推荐码</text>
        <text class="page-subtitle">邀请小伙伴，共创美好前程</text>
      </view>

      <view class="code-card">
        <view class="card-inner">
          <text class="card-label">我的邀请码</text>
          <view class="code-display" @click="handleCopy">
            <text class="code-text">{{ info?.code }}</text>
            <wd-icon name="copy" size="36rpx" color="#1890ff" class="copy-icon" />
          </view>
          <text class="copy-tip">点击邀请码即可快速复制</text>

          <view class="divider">
            <view class="dot left"></view>
            <view class="line"></view>
            <view class="dot right"></view>
          </view>

          <view class="qr-section">
            <view class="qr-wrapper" @click="handleSaveQr">
              <image v-if="info?.qrCodeUrl" :src="info.qrCodeUrl" mode="aspectFit" class="qr-img" />
              <view v-else class="qr-placeholder">
                <wd-icon name="qrcode" size="80rpx" color="#eee" />
                <text>暂无二维码</text>
              </view>
              <view class="qr-overlay" v-if="info?.qrCodeUrl">
                <wd-icon name="download" size="48rpx" color="#fff" />
              </view>
            </view>
            <text class="qr-tip">长按或点击二维码可保存相册</text>
          </view>

          <view class="stats-footer">
            <view class="stat-item">
              <text class="stat-num">{{ info?.usageCount || 0 }}</text>
              <text class="stat-label">已成功邀请</text>
            </view>
          </view>
        </view>
      </view>

      <view class="action-bar">
        <wd-button type="primary" block size="large" custom-class="share-btn" open-type="share">
          立即发送给好友
        </wd-button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #0f172a;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bg-decoration-1 {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 500rpx;
  height: 500rpx;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.bg-decoration-2 {
  position: absolute;
  bottom: -150rpx;
  left: -150rpx;
  width: 600rpx;
  height: 600rpx;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.loading-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);

  .loading-text {
    margin-top: 30rpx;
    font-size: 26rpx;
  }
}

.error-box {
  flex: 1;
  padding: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .error-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 32rpx;
    padding: 60rpx 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;

    .error-text {
      margin-top: 30rpx;
      font-size: 32rpx;
      color: #fff;
      font-weight: 600;
    }

    .sub-text {
      margin-top: 16rpx;
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.5);
      text-align: center;
    }

    .back-btn {
      margin-top: 40rpx;
      min-width: 200rpx;
    }
  }
}

.content-box {
  flex: 1;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.header-section {
  text-align: center;
  margin-bottom: 60rpx;
  padding-top: 20rpx;

  .page-title {
    font-size: 44rpx;
    font-weight: 800;
    color: #fff;
    display: block;
    margin-bottom: 12rpx;
    letter-spacing: 4rpx;
  }

  .page-subtitle {
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 2rpx;
  }
}

.code-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 40rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, 0.2);

  .card-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .card-label {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 30rpx;
    text-transform: uppercase;
    letter-spacing: 4rpx;
  }

  .code-display {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    padding: 20rpx 40rpx;
    border-radius: 20rpx;
    margin-bottom: 20rpx;
    border: 1px dashed rgba(56, 189, 248, 0.3);

    .code-text {
      font-size: 72rpx;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 8rpx;
      line-height: 1;
    }

    .copy-icon {
      margin-left: 24rpx;
    }
  }

  .copy-tip {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.3);
  }

  .divider {
    width: 100%;
    margin: 60rpx 0;
    position: relative;
    display: flex;
    align-items: center;

    .line {
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
    }

    .dot {
      width: 24rpx;
      height: 24rpx;
      background: #0f172a;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);

      &.left {
        left: -52rpx;
      }
      &.right {
        right: -52rpx;
      }
    }
  }

  .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;

    .qr-wrapper {
      width: 360rpx;
      height: 360rpx;
      background: #fff;
      padding: 20rpx;
      border-radius: 24rpx;
      position: relative;
      overflow: hidden;

      .qr-img {
        width: 100%;
        height: 100%;
      }

      .qr-placeholder {
        width: 100%;
        height: 100%;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #ddd;
        font-size: 24rpx;
      }

      .qr-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;
      }

      &:active .qr-overlay {
        opacity: 1;
      }
    }

    .qr-tip {
      margin-top: 24rpx;
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.4);
    }
  }

  .stats-footer {
    margin-top: 60rpx;
    width: 100%;
    padding-top: 40rpx;
    border-top: 1px solid rgba(255, 255, 255, 0.05);

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .stat-num {
        font-size: 36rpx;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4rpx;
      }

      .stat-label {
        font-size: 20rpx;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
      }
    }
  }
}

.action-bar {
  margin-top: auto;
  padding-top: 60rpx;

  :deep(.share-btn) {
    background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%) !important;
    border: none !important;
    font-weight: 700 !important;
    border-radius: 24rpx !important;
    height: 100rpx !important;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
