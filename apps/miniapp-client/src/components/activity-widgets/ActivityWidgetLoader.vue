<script setup lang="ts">
import { computed } from 'vue'
import GroupBuyWidget from './GroupBuyWidget.vue'

const props = defineProps<{
  activities: any[] // List from backend
}>()

const emit = defineEmits<{
  (e: 'create-group', activity: any): void
}>()

// 1. Pick the highest priority activity
const targetActivity = computed(() => {
  if (!props.activities || props.activities.length === 0)
    return null
  return props.activities[0]
})

// 2. Computed Types helper
const activityType = computed(() => targetActivity.value?.type)

function onGroupCreate(activity: any) {
  emit('create-group', activity)
}
</script>

<template>
  <view v-if="targetActivity" class="activity-loader-container">
    <!--
      UniApp MP specific limitation:
      Dynamic <component :is> often fails with component objects.
      Using explicit v-if branches is the safest approach for Mini Programs.
    -->

    <GroupBuyWidget
      v-if="activityType === 'GROUP_BUY' || activityType === 'COURSE_GROUP_BUY'"
      :activity="targetActivity"
      @create="onGroupCreate"
    />

    <!-- Future:
    <SeckillWidget
      v-else-if="activityType === 'SECKILL'"
      :activity="targetActivity"
    />
    -->
  </view>
</template>
