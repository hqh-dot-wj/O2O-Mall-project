<script setup lang="tsx">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { NButton, NCard, NDataTable, NDatePicker, NInput, NSelect, NSpace, NTag } from 'naive-ui';
import { type CourseSchedule, fetchCourseSchedules } from '@/service/api/course-group-buy';

/**
 * 课程排课管理页面
 *
 * @description
 * 展示课程拼团的排课计划，支持查看排课详情
 */

const route = useRoute();
const instanceId = ref(route.query.instanceId as string);

// 排课列表数据
const schedules = ref<CourseSchedule[]>([]);
const loading = ref(false);

// 状态筛选
const statusFilter = ref<string | null>(null);
const statusOptions = [
  { label: '全部', value: null },
  { label: '已排课', value: 'SCHEDULED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' }
];

// 表格列定义
const columns = [
  {
    key: 'date',
    title: '上课日期',
    align: 'center' as const,
    width: 120,
    render: (row: CourseSchedule) => {
      const date = new Date(row.date);
      return date.toLocaleDateString('zh-CN');
    }
  },
  {
    key: 'time',
    title: '上课时间',
    align: 'center' as const,
    width: 150,
    render: (row: CourseSchedule) => `${row.startTime} - ${row.endTime}`
  },
  {
    key: 'lessons',
    title: '课时数',
    align: 'center' as const,
    width: 100,
    render: (row: CourseSchedule) => <span class="text-primary font-bold">{row.lessons} 节</span>
  },
  {
    key: 'status',
    title: '状态',
    align: 'center' as const,
    width: 100,
    render: (row: CourseSchedule) => {
      const statusMap = {
        SCHEDULED: { type: 'info' as const, text: '已排课' },
        COMPLETED: { type: 'success' as const, text: '已完成' },
        CANCELLED: { type: 'error' as const, text: '已取消' }
      };
      const status = statusMap[row.status];
      return <NTag type={status.type}>{status.text}</NTag>;
    }
  },
  {
    key: 'remark',
    title: '备注',
    align: 'left' as const,
    minWidth: 200,
    render: (row: CourseSchedule) => row.remark || '-'
  },
  {
    key: 'createTime',
    title: '创建时间',
    align: 'center' as const,
    width: 180,
    render: (row: CourseSchedule) => {
      const date = new Date(row.createTime);
      return date.toLocaleString('zh-CN');
    }
  }
];

// 加载排课数据
async function loadSchedules() {
  if (!instanceId.value) {
    window.$message?.error('缺少实例ID参数');
    return;
  }

  loading.value = true;
  try {
    const { data } = await fetchCourseSchedules(instanceId.value);
    schedules.value = data || [];
  } catch (error) {
    window.$message?.error('加载排课数据失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 筛选后的数据
const filteredSchedules = computed(() => {
  if (!statusFilter.value) {
    return schedules.value;
  }
  return schedules.value.filter(s => s.status === statusFilter.value);
});

// 统计信息
const statistics = computed(() => {
  const total = schedules.value.length;
  const scheduled = schedules.value.filter(s => s.status === 'SCHEDULED').length;
  const completed = schedules.value.filter(s => s.status === 'COMPLETED').length;
  const cancelled = schedules.value.filter(s => s.status === 'CANCELLED').length;
  const totalLessons = schedules.value.reduce((sum, s) => sum + s.lessons, 0);
  const completedLessons = schedules.value.filter(s => s.status === 'COMPLETED').reduce((sum, s) => sum + s.lessons, 0);

  return {
    total,
    scheduled,
    completed,
    cancelled,
    totalLessons,
    completedLessons,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0
  };
});

onMounted(() => {
  loadSchedules();
});
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard title="课程排课管理" :bordered="false" class="h-full">
      <template #header-extra>
        <NButton @click="loadSchedules">
          <template #icon>
            <icon-mdi-refresh />
          </template>
          刷新
        </NButton>
      </template>

      <div class="h-full flex-col">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-4 mb-4 gap-4">
          <NCard size="small" :bordered="false" class="bg-blue-50">
            <div class="flex-col items-center">
              <div class="text-2xl text-primary font-bold">{{ statistics.total }}</div>
              <div class="mt-1 text-sm text-gray-600">总排课数</div>
            </div>
          </NCard>

          <NCard size="small" :bordered="false" class="bg-green-50">
            <div class="flex-col items-center">
              <div class="text-2xl text-success font-bold">{{ statistics.completed }}</div>
              <div class="mt-1 text-sm text-gray-600">已完成</div>
            </div>
          </NCard>

          <NCard size="small" :bordered="false" class="bg-orange-50">
            <div class="flex-col items-center">
              <div class="text-2xl text-warning font-bold">{{ statistics.scheduled }}</div>
              <div class="mt-1 text-sm text-gray-600">待上课</div>
            </div>
          </NCard>

          <NCard size="small" :bordered="false" class="bg-purple-50">
            <div class="flex-col items-center">
              <div class="text-2xl text-purple-600 font-bold">
                {{ statistics.completedLessons }} / {{ statistics.totalLessons }}
              </div>
              <div class="mt-1 text-sm text-gray-600">课时进度</div>
            </div>
          </NCard>
        </div>

        <!-- 筛选栏 -->
        <NSpace class="mb-4">
          <NSelect v-model:value="statusFilter" :options="statusOptions" placeholder="筛选状态" style="width: 150px" />
        </NSpace>

        <!-- 表格 -->
        <NDataTable :columns="columns" :data="filteredSchedules" :loading="loading" flex-height class="flex-1-hidden" />
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
