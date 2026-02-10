<script setup lang="tsx">
import { computed, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NProgress,
  NSelect,
  NSpace,
  NSpin,
  NTag
} from 'naive-ui';
import {
  type CourseAttendance,
  type MarkAttendanceRequest,
  fetchAttendanceRate,
  fetchCourseAttendances,
  markAttendance
} from '@/service/api/course-group-buy';

interface Props {
  instanceId: string;
}

const props = defineProps<Props>();

// 考勤列表数据
const attendances = ref<CourseAttendance[]>([]);
const loading = ref(false);

// 标记出勤弹窗
const showMarkModal = ref(false);
const markForm = ref<MarkAttendanceRequest>({
  memberId: '',
  date: '',
  remark: ''
});
const markLoading = ref(false);

// 出勤率查询
const showRateModal = ref(false);
const selectedMemberId = ref('');
const attendanceRate = ref<{ total: number; attended: number; rate: number } | null>(null);
const rateLoading = ref(false);

// 筛选条件
const attendedFilter = ref<boolean | null>(null);
const attendedOptions = [
  { label: '全部', value: null },
  { label: '已出勤', value: true },
  { label: '未出勤', value: false }
];

// 表格列定义
const columns = [
  {
    key: 'memberId',
    title: '学员ID',
    align: 'center' as const,
    width: 150,
    render: (row: CourseAttendance) => (
      <div class="flex items-center justify-center gap-1">
        <icon-mdi-account class="text-primary" />
        <span class="font-mono">{row.memberId}</span>
      </div>
    )
  },
  {
    key: 'date',
    title: '考勤日期',
    align: 'center' as const,
    width: 120,
    render: (row: CourseAttendance) => {
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
    key: 'attended',
    title: '出勤状态',
    align: 'center' as const,
    width: 120,
    render: (row: CourseAttendance) =>
      row.attended ? (
        <NTag type="success" size="large">
          <div class="flex items-center gap-1">
            <icon-mdi-check-circle />
            <span>已出勤</span>
          </div>
        </NTag>
      ) : (
        <NTag type="error" size="large">
          <div class="flex items-center gap-1">
            <icon-mdi-close-circle />
            <span>未出勤</span>
          </div>
        </NTag>
      )
  },
  {
    key: 'remark',
    title: '备注',
    align: 'left' as const,
    minWidth: 200,
    ellipsis: {
      tooltip: true
    },
    render: (row: CourseAttendance) => row.remark || <span class="text-gray-400">无</span>
  },
  {
    key: 'createTime',
    title: '记录时间',
    align: 'center' as const,
    width: 180,
    render: (row: CourseAttendance) => {
      const date = new Date(row.createTime);
      return date.toLocaleString('zh-CN');
    }
  },
  {
    key: 'operate',
    title: '操作',
    align: 'center' as const,
    width: 120,
    render: (row: CourseAttendance) => (
      <NButton type="primary" ghost size="small" onClick={() => viewAttendanceRate(row.memberId)}>
        <template #icon>
          <icon-mdi-chart-line />
        </template>
        出勤率
      </NButton>
    )
  }
];

// 加载考勤数据
async function loadAttendances() {
  if (!props.instanceId) {
    window.$message?.error('缺少实例ID参数');
    return;
  }

  loading.value = true;
  try {
    const { data } = await fetchCourseAttendances(props.instanceId);
    attendances.value = data || [];
  } catch (error) {
    window.$message?.error('加载考勤数据失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
}

// 筛选后的数据
const filteredAttendances = computed(() => {
  if (attendedFilter.value === null) {
    return attendances.value;
  }
  return attendances.value.filter(a => a.attended === attendedFilter.value);
});

// 统计信息
const statistics = computed(() => {
  const total = attendances.value.length;
  const attended = attendances.value.filter(a => a.attended).length;
  const absent = total - attended;
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

  // 按学员统计
  const memberMap = new Map<string, { total: number; attended: number }>();
  attendances.value.forEach(a => {
    if (!memberMap.has(a.memberId)) {
      memberMap.set(a.memberId, { total: 0, attended: 0 });
    }
    const stat = memberMap.get(a.memberId)!;
    stat.total++;
    if (a.attended) stat.attended++;
  });

  return {
    total,
    attended,
    absent,
    rate,
    memberCount: memberMap.size
  };
});

// 打开标记出勤弹窗
function openMarkModal() {
  markForm.value = {
    memberId: '',
    date: new Date().toISOString().split('T')[0],
    remark: ''
  };
  showMarkModal.value = true;
}

// 提交标记出勤
async function submitMarkAttendance() {
  if (!markForm.value.memberId || !markForm.value.date) {
    window.$message?.error('请填写学员ID和考勤日期');
    return;
  }

  markLoading.value = true;
  try {
    await markAttendance(props.instanceId, markForm.value);
    window.$message?.success('标记出勤成功');
    showMarkModal.value = false;
    loadAttendances();
  } catch (error) {
    window.$message?.error('标记出勤失败');
    console.error(error);
  } finally {
    markLoading.value = false;
  }
}

// 查看学员出勤率
async function viewAttendanceRate(memberId: string) {
  selectedMemberId.value = memberId;
  showRateModal.value = true;
  rateLoading.value = true;
  attendanceRate.value = null;

  try {
    const { data } = await fetchAttendanceRate(props.instanceId, memberId);
    attendanceRate.value = data;
  } catch (error) {
    window.$message?.error('获取出勤率失败');
    console.error(error);
  } finally {
    rateLoading.value = false;
  }
}

onMounted(() => {
  loadAttendances();
});
</script>

<template>
  <div class="h-full flex-col">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-5 mb-4 gap-4">
      <NCard size="small" :bordered="false" class="shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl text-primary font-bold">{{ statistics.total }}</div>
            <div class="mt-1 text-sm text-gray-600">总考勤记录</div>
          </div>
          <icon-mdi-clipboard-list class="text-4xl text-primary opacity-20" />
        </div>
      </NCard>

      <NCard size="small" :bordered="false" class="shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl text-success font-bold">{{ statistics.attended }}</div>
            <div class="mt-1 text-sm text-gray-600">已出勤</div>
          </div>
          <icon-mdi-check-circle class="text-4xl text-success opacity-20" />
        </div>
      </NCard>

      <NCard size="small" :bordered="false" class="shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl text-error font-bold">{{ statistics.absent }}</div>
            <div class="mt-1 text-sm text-gray-600">未出勤</div>
          </div>
          <icon-mdi-close-circle class="text-4xl text-error opacity-20" />
        </div>
      </NCard>

      <NCard size="small" :bordered="false" class="shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl text-purple-600 font-bold">{{ statistics.rate }}%</div>
            <div class="mt-1 text-sm text-gray-600">总出勤率</div>
          </div>
          <icon-mdi-chart-line class="text-4xl text-purple-600 opacity-20" />
        </div>
      </NCard>

      <NCard size="small" :bordered="false" class="shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-2xl text-warning font-bold">{{ statistics.memberCount }}</div>
            <div class="mt-1 text-sm text-gray-600">学员人数</div>
          </div>
          <icon-mdi-account-group class="text-4xl text-warning opacity-20" />
        </div>
      </NCard>
    </div>

    <!-- 操作栏 -->
    <NSpace class="mb-4" justify="space-between">
      <NSelect
        v-model:value="attendedFilter"
        :options="attendedOptions"
        placeholder="筛选出勤状态"
        style="width: 150px"
      />

      <NSpace>
        <NButton type="primary" @click="openMarkModal">
          <template #icon>
            <icon-mdi-check-circle />
          </template>
          标记出勤
        </NButton>
        <NButton @click="loadAttendances">
          <template #icon>
            <icon-mdi-refresh />
          </template>
          刷新
        </NButton>
      </NSpace>
    </NSpace>

    <!-- 表格 -->
    <NDataTable
      :columns="columns"
      :data="filteredAttendances"
      :loading="loading"
      :scroll-x="900"
      flex-height
      class="flex-1-hidden"
    />

    <!-- 标记出勤弹窗 -->
    <NModal v-model:show="showMarkModal" preset="card" title="标记学员出勤" style="width: 500px">
      <NForm :model="markForm" label-placement="left" label-width="100px">
        <NFormItem label="学员ID" required>
          <NInput v-model:value="markForm.memberId" placeholder="请输入学员ID" clearable>
            <template #prefix>
              <icon-mdi-account />
            </template>
          </NInput>
        </NFormItem>

        <NFormItem label="考勤日期" required>
          <NDatePicker
            v-model:formatted-value="markForm.date"
            type="date"
            value-format="yyyy-MM-dd"
            placeholder="请选择考勤日期"
            style="width: 100%"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="markForm.remark"
            type="textarea"
            placeholder="请输入备注信息（可选）"
            :rows="3"
            clearable
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showMarkModal = false">取消</NButton>
          <NButton type="primary" :loading="markLoading" @click="submitMarkAttendance">确认标记</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 出勤率查询弹窗 -->
    <NModal v-model:show="showRateModal" preset="card" title="学员出勤率统计" style="width: 500px">
      <div v-if="rateLoading" class="flex-center py-12">
        <NSpin size="large" />
      </div>

      <div v-else-if="attendanceRate" class="flex-col gap-6">
        <!-- 学员信息 -->
        <div class="rounded bg-gray-50 p-4 text-center">
          <div class="mb-2 text-sm text-gray-600">学员ID</div>
          <div class="flex items-center justify-center gap-2 text-xl font-bold">
            <icon-mdi-account class="text-primary" />
            <span>{{ selectedMemberId }}</span>
          </div>
        </div>

        <!-- 出勤率进度条 -->
        <div class="rounded from-purple-50 to-blue-50 bg-gradient-to-r p-4">
          <div class="mb-2 text-sm text-gray-600">出勤率</div>
          <NProgress
            type="line"
            :percentage="Math.round(attendanceRate.rate * 100)"
            :height="24"
            :border-radius="12"
            :fill-border-radius="12"
            processing
          />
        </div>

        <!-- 统计数据 -->
        <div class="grid grid-cols-3 gap-4">
          <div class="flex-col items-center rounded-lg bg-blue-50 p-4">
            <icon-mdi-clipboard-list class="mb-2 text-3xl text-primary" />
            <div class="text-2xl text-primary font-bold">{{ attendanceRate.total }}</div>
            <div class="mt-1 text-sm text-gray-600">总课时</div>
          </div>

          <div class="flex-col items-center rounded-lg bg-green-50 p-4">
            <icon-mdi-check-circle class="mb-2 text-3xl text-success" />
            <div class="text-2xl text-success font-bold">{{ attendanceRate.attended }}</div>
            <div class="mt-1 text-sm text-gray-600">已出勤</div>
          </div>

          <div class="flex-col items-center rounded-lg bg-red-50 p-4">
            <icon-mdi-close-circle class="mb-2 text-3xl text-error" />
            <div class="text-2xl text-error font-bold">
              {{ attendanceRate.total - attendanceRate.attended }}
            </div>
            <div class="mt-1 text-sm text-gray-600">未出勤</div>
          </div>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showRateModal = false">关闭</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.flex-col {
  display: flex;
  flex-direction: column;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-1-hidden {
  flex: 1;
  overflow: hidden;
}
</style>
