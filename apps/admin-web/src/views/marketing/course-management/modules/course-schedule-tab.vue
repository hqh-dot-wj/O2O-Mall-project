<script setup lang="tsx">
import { ref, onMounted, computed } from 'vue';
import { NButton, NCard, NDataTable, NTag, NSpace, NSelect, NSpin } from 'naive-ui';
import { fetchCourseSchedules, type CourseSchedule } from '@/service/api/course-group-buy';

interface Props {
  instanceId: string;
}

const props = defineProps<Props>();

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
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const weekday = weekdays[date.getDay()];
      return (
        <div class="flex-col items-center">
          <div class="font-bold">{date.toLocaleDateString('zh-CN')}</div>
          <div class="text-xs text-gray-500">周{weekday}</div>
        </div>
      );
    }
  },
  {
    key: 'time',
    title: '上课时间',
    align: 'center' as const,
    width: 150,
    render: (row: CourseSchedule) => (
      <div class="flex items-center justify-center gap-1">
        <icon-mdi-clock-outline class="text-primary" />
        <span>{row.startTime} - {row.endTime}</span>
      </div>
    )
  },
  {
    key: 'lessons',
    title: '课时数',
    align: 'center' as const,
    width: 100,
    render: (row: CourseSchedule) => (
      <NTag type="primary" size="large">
        {row.lessons} 节
      </NTag>
    )
  },
  {
    key: 'status',
    title: '状态',
    align: 'center' as const,
    width: 100,
    render: (row: CourseSchedule) => {
      const statusMap = {
        SCHEDULED: { type: 'info' as const, text: '已排课', icon: 'mdi-calendar-clock' },
        COMPLETED: { type: 'success' as const, text: '已完成', icon: 'mdi-check-circle' },
        CANCELLED: { type: 'error' as const, text: '已取消', icon: 'mdi-close-circle' }
      };
      const status = statusMap[row.status];
      return (
        <NTag type={status.type}>
          <div class="flex items-center gap-1">
            <icon-local={status.icon} />
            <span>{status.text}</span>
          </div>
        </NTag>
      );
    }
  },
  {
    key: 'remark',
    title: '备注',
    align: 'left' as const,
    minWidth: 200,
    ellipsis: {
      tooltip: true
    },
    render: (row: CourseSchedule) => row.remark || <span class="text-gray-400">无</span>
  }
];

// 加载排课数据
async function loadSchedules() {
  if (!props.instanceId) {
    window.$message?.error('缺少实例ID参数');
    return;
  }

  loading.value = true;
  try {
    const { data } = await fetchCourseSchedules(props.instanceId);
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
  const completedLessons = schedules.value
    .filter(s => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.lessons, 0);

  return {
    total,
    scheduled,
    completed,
    cancelled,
    totalLessons,
    completedLessons,
    progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  };
});

onMounted(() => {
  loadSchedules();
});
</script>

<template>
  <div class="h-full flex-col">
    <!-- 统计卡片 -->
    <div class="mb-4 grid grid-cols-4 gap-4">
      <NCard size="small" :bordered="false" class="shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-primary">{{ statistics.total }}</div>
            <div class="mt-1 text-sm text-gray-600">总排课数</div>
          </div>
          <icon-mdi-calendar-multiple class="text-4xl text-primary opacity-20" />
        </div>
      </NCard>

      <NCard size="small" :bordered="false" class="shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-success">{{ statistics.completed }}</div>
            <div class="mt-1 text-sm text-gray-600">已完成</div>
          </div>
          <icon-mdi-check-circle class="text-4xl text-success opacity-20" />
        </div>
      </NCard>

      <NCard size="small" :bordered="false" class="shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-warning">{{ statistics.scheduled }}</div>
            <div class="mt-1 text-sm text-gray-600">待上课</div>
          </div>
          <icon-mdi-calendar-clock class="text-4xl text-warning opacity-20" />
        </div>
      </NCard>

      <NCard size="small" :bordered="false" class="shadow-sm hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl font-bold text-purple-600">{{ statistics.progress }}%</div>
            <div class="mt-1 text-sm text-gray-600">
              课时进度 ({{ statistics.completedLessons }}/{{ statistics.totalLessons }})
            </div>
          </div>
          <icon-mdi-progress-clock class="text-4xl text-purple-600 opacity-20" />
        </div>
      </NCard>
    </div>

    <!-- 操作栏 -->
    <NSpace class="mb-4" justify="space-between">
      <NSelect v-model:value="statusFilter" :options="statusOptions" placeholder="筛选状态" style="width: 150px" />

      <NButton @click="loadSchedules">
        <template #icon>
          <icon-mdi-refresh />
        </template>
        刷新
      </NButton>
    </NSpace>

    <!-- 表格 -->
    <NDataTable
      :columns="columns"
      :data="filteredSchedules"
      :loading="loading"
      :scroll-x="800"
      flex-height
      class="flex-1-hidden"
    />
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
