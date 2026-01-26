<script lang="ts" setup>
definePage({
  style: {
    navigationBarTitleText: '我的团队',
  },
})

import { ref, onMounted } from 'vue'
import { getTeamStats, getTeamList } from '@/api/upgrade'
import type { TeamStats } from '@/api/upgrade'

const paging = ref<any>(null)
const dataList = ref<any[]>([])
const currentTab = ref<'direct' | 'indirect'>('direct')
const stats = ref<TeamStats>({
  myLevel: 0,
  directCount: 0,
  indirectCount: 0,
  totalTeamSales: 0,
})

const tabs = [
  { label: '直推成员', value: 'direct' },
  { label: '间推成员', value: 'indirect' },
]

onMounted(async () => {
  fetchStats()
})

async function fetchStats() {
  try {
    const res = await getTeamStats()
    if (res) {
      stats.value = res
    }
  } catch (e) {
    console.error(e)
  }
}

function handleTabChange(value: 'direct' | 'indirect') {
  currentTab.value = value
  paging.value?.reload()
}

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getTeamList({
      type: currentTab.value,
      pageNum: pageNo,
      pageSize,
    })
    if (res) {
      // 假设后端直接返回数组，如果是 { rows, total } 结构则需要相应调整
      paging.value?.complete(res)
    } else {
      paging.value?.complete(false)
    }
  } catch (e) {
    paging.value?.complete(false)
  }
}
</script>

<template>
  <view class="page-container">
    <!-- 顶部背景饰物 -->
    <view class="bg-decoration"></view>

    <!-- 顶部统计 -->
    <view class="header-section">
      <view class="header-content">
        <text class="page-title">我的团队</text>
        <view class="stats-glass-card">
          <view class="total-sales">
            <text class="label">团队总业绩</text>
            <view class="value-container">
              <text class="symbol">¥</text>
              <text class="value">{{ stats.totalTeamSales }}</text>
            </view>
          </view>
          <view class="stats-grid">
            <view class="stat-item">
              <text class="num">{{ stats.directCount }}</text>
              <text class="label">直推人数</text>
            </view>
            <view class="divider"></view>
            <view class="stat-item">
              <text class="num">{{ stats.indirectCount }}</text>
              <text class="label">间推人数</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表区域 -->
    <view class="list-section">
      <view class="tabs-container">
        <wd-tabs
          v-model="currentTab"
          @change="handleTabChange"
          sticky
          :offset-top="0"
          custom-class="custom-tabs"
        >
          <wd-tab v-for="item in tabs" :key="item.value" :title="item.label" :name="item.value" />
        </wd-tabs>
      </view>

      <view class="list-container">
        <z-paging ref="paging" v-model="dataList" @query="queryList" :fixed="false" height="100%">
          <view class="member-item" v-for="(item, index) in dataList" :key="index">
            <view class="member-card">
              <image
                :src="item.avatar || '/static/images/default-avatar.png'"
                class="avatar"
                mode="aspectFill"
              />
              <view class="info">
                <view class="name-row">
                  <text class="nickname">{{ item.nickname || '匿名用户' }}</text>
                  <view class="level-tag" :class="'level-' + (item.levelId || 0)">
                    <wd-icon
                      v-if="item.levelId > 0"
                      name="star-filled"
                      size="20rpx"
                      class="tag-icon"
                    />
                    {{ item.levelId === 0 ? '会员' : item.levelId === 1 ? '团长' : '股东' }}
                  </view>
                </view>
                <view class="time-row">
                  <wd-icon name="time" size="24rpx" color="#999" />
                  <text class="time">注册时间: {{ item.createTime || '-' }}</text>
                </view>
              </view>
              <view class="arrow-box">
                <wd-icon name="arrow-right" size="32rpx" color="#ccc" />
              </view>
            </view>
          </view>

          <!-- 空数据状态 -->
          <template #empty>
            <view class="empty-state">
              <wd-icon name="team" size="120rpx" color="#eee" />
              <text class="empty-text">暂无团队成员</text>
            </view>
          </template>
        </z-paging>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* 样式保持不变 */
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.header-section {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  padding: 40rpx 40rpx 80rpx;
  position: relative;

  .page-title {
    font-size: 40rpx;
    font-weight: 700;
    color: #fff;
    margin-bottom: 40rpx;
    display: block;
    letter-spacing: 2rpx;
  }

  .stats-glass-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 32rpx;
    padding: 40rpx;
    box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
  }

  .total-sales {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40rpx;

    .label {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 12rpx;
      text-transform: uppercase;
      letter-spacing: 2rpx;
    }

    .value-container {
      display: flex;
      align-items: baseline;

      .symbol {
        font-size: 32rpx;
        color: #38bdf8;
        margin-right: 8rpx;
        font-weight: 600;
      }

      .value {
        font-size: 72rpx;
        font-weight: 800;
        color: #fff;
        line-height: 1;
      }
    }
  }

  .stats-grid {
    display: flex;
    align-items: center;
    justify-content: space-around;

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .num {
        font-size: 36rpx;
        font-weight: 700;
        color: #fff;
        margin-bottom: 8rpx;
      }

      .label {
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .divider {
      width: 1px;
      height: 48rpx;
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border-radius: 40rpx 40rpx 0 0;
  margin-top: -40rpx;
  z-index: 1;
  overflow: hidden;

  .tabs-container {
    padding: 20rpx 40rpx 0;
    background: #fff;
    border-radius: 40rpx 40rpx 0 0;

    :deep(.custom-tabs) {
      .wd-tabs__nav {
        background: transparent;
      }
      .wd-tabs__line {
        height: 6rpx;
        border-radius: 3rpx;
        background: #1890ff;
      }
      .wd-tab__text {
        font-size: 30rpx;
        font-weight: 500;
      }
    }
  }

  .list-container {
    flex: 1;
    position: relative;
    padding: 20rpx 0;
  }
}

.member-item {
  padding: 12rpx 30rpx;

  .member-card {
    background: #fff;
    border-radius: 24rpx;
    padding: 24rpx;
    display: flex;
    align-items: center;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
    transition: transform 0.2s;

    &:active {
      transform: scale(0.98);
    }

    .avatar {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      margin-right: 24rpx;
      border: 4rpx solid #f0f4f8;
    }

    .info {
      flex: 1;

      .name-row {
        display: flex;
        align-items: center;
        margin-bottom: 12rpx;

        .nickname {
          font-size: 32rpx;
          font-weight: 600;
          color: #1e293b;
          margin-right: 16rpx;
          max-width: 240rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .level-tag {
          font-size: 20rpx;
          padding: 4rpx 16rpx;
          border-radius: 10rpx;
          display: flex;
          align-items: center;

          .tag-icon {
            margin-right: 4rpx;
          }

          &.level-0 {
            background: #f1f5f9;
            color: #64748b;
          }
          &.level-1 {
            background: #fffbeb;
            color: #d97706;
            border: 1px solid #fef3c7;
          }
          &.level-2 {
            background: #f5f3ff;
            color: #7c3aed;
            border: 1px solid #ede9fe;
          }
        }
      }

      .time-row {
        display: flex;
        align-items: center;

        .time {
          font-size: 24rpx;
          color: #94a3b8;
          margin-left: 8rpx;
        }
      }
    }

    .arrow-box {
      padding-left: 10rpx;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 100rpx;

  .empty-text {
    margin-top: 24rpx;
    font-size: 28rpx;
    color: #94a3b8;
  }
}
</style>
