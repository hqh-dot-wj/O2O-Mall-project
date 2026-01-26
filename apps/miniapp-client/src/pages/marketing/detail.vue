<route lang="json5">
{
  style: {
    navigationBarTitleText: '活动详情',
  },
}
</route>

<template>
  <view class="page-container min-h-screen bg-gray-50 pb-20">
    <!-- 1. 公共层：商品卡片 (不变) -->
    <view class="mb-4 bg-white p-4">
      <image
        :src="productInfo.image"
        mode="aspectFill"
        class="mb-2 h-60 w-full rounded-lg"
      />
      <view class="text-lg font-bold">
        {{ productInfo.name }}
      </view>
      <view class="text-sm text-gray-500">
        {{ productInfo.desc }}
      </view>
      <view class="mt-2 text-xl text-red-500 font-bold">
        ¥ {{ instanceData ? instanceData.price : '...' }}
      </view>
    </view>

    <!-- 2. 差异层：玩法核心区 (变化) -->
    <!-- 使用 v-if 分发，或者 dynamic component -->
    <view v-if="instanceData" class="mx-4 mb-4 rounded-lg bg-white p-4 shadow-sm">
      <!-- 拼团核心交互区 -->
      <GroupBuyWidget
        v-if="instanceData.templateCode === 'GROUP_BUY'"
        :instance="instanceData"
      />

      <!-- 课程拼团核心区 -->
      <CourseWidget
        v-if="instanceData.templateCode === 'COURSE_GROUP_BUY'"
        :instance="instanceData"
      />

      <!-- 预留：秒杀核心区 -->
      <view v-if="instanceData.templateCode === 'SECKILL'">
        <view class="text-center text-orange-500">
          秒杀倒计时组件开发中...
        </view>
      </view>
    </view>

    <!-- 3. 公共层：底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-gray-100 bg-white p-4">
      <view class="flex flex-col">
        <text class="text-xs text-gray-500">实付金额</text>
        <text class="text-lg text-red-500 font-bold">¥ {{ instanceData ? instanceData.price : '0.00' }}</text>
      </view>
      <button
        class="rounded-full bg-blue-600 px-8 py-2 text-sm text-white font-bold"
        :disabled="isLoading"
        @click="handleMainAction"
      >
        {{ actionBtnText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import CourseWidget from './components/course-widget.vue'
import GroupBuyWidget from './components/group-buy-widget.vue'

// --- Mock Data or API ---
// 实际应从 API 获取
const productInfo = ref({
  name: '高端家政保洁服务 4小时',
  desc: '深度清洁，专业工具，不满意重做',
  image: 'https://via.placeholder.com/400x300',
})

const instanceData = ref<any>(null)
const isLoading = ref(false)

// 路由参数
const instanceId = ref('')

onLoad((options) => {
  if (options.id) {
    instanceId.value = options.id
    loadData(options.id)
  }
})

async function loadData(id: string) {
  // TODO: Call API /marketing/instance/:id
  // Mock response for COURSE_GROUP_BUY verification
  setTimeout(() => {
    instanceData.value = {
      id,
      templateCode: 'COURSE_GROUP_BUY',
      status: 'ACTIVE',
      price: '199.00',
      role: 'MEMBER',
      config: {
        rules: {
          minCount: 5,
          maxCount: 20,
          classTime: '每周六 19:00 - 21:00',
          address: '北京市朝阳区三里屯SOHO A座',
          totalLessons: 12,
          dayLessons: 2,
          joinDeadline: new Date(Date.now() + 86400000).toISOString(),
        },
      },
      instanceData: {
        currentCount: 3,
        endTime: Date.now() + 3600000,
      },
    }
  }, 500)
}

// 动态计算按钮文案
const actionBtnText = computed(() => {
  if (!instanceData.value)
    return '加载中...'
  const map: Record<string, string> = {
    GROUP_BUY: '邀请好友拼团',
    COURSE_GROUP_BUY: '立即报名占位',
    SECKILL: '立即抢购',
    BARGAIN: '找人砍价',
  }
  return map[instanceData.value.templateCode] || '立即参与'
})

function handleMainAction() {
  uni.showToast({ title: `触发: ${actionBtnText.value}`, icon: 'none' })
  // Logic: share or pay
}
</script>

<style scoped>
/* UnoCSS recommended */
</style>
