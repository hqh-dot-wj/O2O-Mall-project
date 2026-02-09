<script setup lang="tsx">
import { ref, onMounted } from 'vue';
import { NCard, NTabs, NTabPane, NButton, NSpace, NAlert } from 'naive-ui';
import { useRoute } from 'vue-router';
import CourseScheduleTab from './modules/course-schedule-tab.vue';
import CourseAttendanceTab from './modules/course-attendance-tab.vue';

/**
 * 课程拼团管理页面
 *
 * @description
 * 综合管理课程拼团的排课和考勤，提供统一入口
 */

const route = useRoute();
const instanceId = ref(route.query.instanceId as string);
const activeTab = ref('schedule');

// 课程基本信息（可以从后端获取）
const courseInfo = ref({
  name: '课程拼团',
  instanceId: instanceId.value,
  status: 'ACTIVE'
});
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard :bordered="false" class="h-full">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <icon-mdi-school class="text-3xl text-primary" />
            <div>
              <div class="text-xl font-bold">{{ courseInfo.name }}</div>
              <div class="mt-1 text-sm text-gray-500">实例ID: {{ courseInfo.instanceId }}</div>
            </div>
          </div>
        </div>
      </template>

      <div class="h-full flex-col">
        <!-- 提示信息 -->
        <NAlert type="info" class="mb-4" closable>
          <template #icon>
            <icon-mdi-information />
          </template>
          <div>
            <div class="font-bold mb-1">课程管理说明</div>
            <ul class="list-disc list-inside text-sm">
              <li>排课管理：查看课程的排课计划，了解上课时间和课时安排</li>
              <li>考勤管理：记录学员出勤情况，统计出勤率</li>
              <li>数据实时同步：所有操作立即生效，数据实时更新</li>
            </ul>
          </div>
        </NAlert>

        <!-- 标签页 -->
        <NTabs v-model:value="activeTab" type="line" animated class="flex-1-hidden">
          <NTabPane name="schedule" tab="排课管理">
            <CourseScheduleTab :instance-id="instanceId" />
          </NTabPane>

          <NTabPane name="attendance" tab="考勤管理">
            <CourseAttendanceTab :instance-id="instanceId" />
          </NTabPane>
        </NTabs>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.flex-col {
  display: flex;
  flex-direction: column;
}

.flex-1-hidden {
  flex: 1;
  overflow: hidden;
}
</style>
