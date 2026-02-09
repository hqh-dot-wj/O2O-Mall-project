<script setup lang="tsx">
import { ref, onMounted, computed } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NTag,
  NSpace,
  NModal,
  NForm,
  NFormItem,
  NDatePicker,
  NInput,
  NCheckbox,
  NSelect
} from 'naive-ui';
import {
  fetchCourseAttendances,
  markAttendance,
  fetchAttendanceRate,
  type CourseAttendance,
  type MarkAttendanceRequest
} from '@/service/api/course-group-buy';
import { useRoute } from 'vue-router';

/**
 * 课程考勤管理页面
 *
 * @description
 * 管理课程拼团的学员考勤，支持标记出勤、查看出勤率
 */

const route = useRoute();
const instanceId = ref(route.query.instanceId as string);

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
    width: 150
  },
  {
    key: 'date',
    title: '考勤日期',
    align: 'center' as const,
    width: 120,
    render: (row: CourseAttendance) => {
      const date = new Date(row.date);
      return date.toLocaleDateString('zh-CN');
    }
  },
  {
    key: 'attended',
    title: '出勤状态',
    align: 'center' as const,
    width: 100,
    render: (row: CourseAttendance) =>
      row.attended ? (
        <NTag type="success">已出勤</NTag>
      ) : (
        <NTag type="error">未出勤</NTag>
      )
  },
  {
    key: 'remark',
    title: '备注',
    align: 'left' as const,
    minWidth: 200,
    render: (row: CourseAttendance) => row.remark || '-'
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
      <NButton
        type="primary"
        ghost
        size="small"
        onClick={() => viewAttendanceRate(row.memberId)}
      >
        查看出勤率
      </NButton>
    )
  }
];

// 加载考勤数据
async function loadAttendances() {
  if (!instanceId.value) {
    window.$message?.error('缺少实例ID参数');
    return;
  }

  loading.value = true;
  try {
    const { data } = await fetchCourseAttendances(instanceId.value);
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
    date: '',
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
    await markAttendance(instanceId.value, markForm.value);
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

  try {
    const { data } = await fetchAttendanceRate(instanceId.value, memberId);
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
  <div class="h-full overflow-hidden">
    <NCard title="课程考勤管理" :bordered="false" class="h-full">
      <template #header-extra>
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
      </template>

      <div class="h-full flex-col">
        <!-- 统计卡片 -->
        <div class="mb-4 grid grid-cols-5 gap-4">
          <NCard size="small" :bordered="false" class="bg-blue-50">
            <div class="flex-col items-center">
              <div class="text-2xl font-bold text-primary">{{ statistics.total }}</div>
              <div class="mt-1 text-sm text-gray-600">总考勤记录</div>
            </div>
          </NCard>

          <NCard size="small" :bordered="false" class="bg-green-50">
            <div class="flex-col items-center">
              <div class="text-2xl font-bold text-success">{{ statistics.attended }}</div>
              <div class="mt-1 text-sm text-gray-600">已出勤</div>
            </div>
          </NCard>

          <NCard size="small" :bordered="false" class="bg-red-50">
            <div class="flex-col items-center">
              <div class="text-2xl font-bold text-error">{{ statistics.absent }}</div>
              <div class="mt-1 text-sm text-gray-600">未出勤</div>
            </div>
          </NCard>

          <NCard size="small" :bordered="false" class="bg-purple-50">
            <div class="flex-col items-center">
              <div class="text-2xl font-bold text-purple-600">{{ statistics.rate }}%</div>
              <div class="mt-1 text-sm text-gray-600">总出勤率</div>
            </div>
          </NCard>

          <NCard size="small" :bordered="false" class="bg-orange-50">
            <div class="flex-col items-center">
              <div class="text-2xl font-bold text-warning">{{ statistics.memberCount }}</div>
              <div class="mt-1 text-sm text-gray-600">学员人数</div>
            </div>
          </NCard>
        </div>

        <!-- 筛选栏 -->
        <NSpace class="mb-4">
          <NSelect
            v-model:value="attendedFilter"
            :options="attendedOptions"
            placeholder="筛选出勤状态"
            style="width: 150px"
          />
        </NSpace>

        <!-- 表格 -->
        <NDataTable
          :columns="columns"
          :data="filteredAttendances"
          :loading="loading"
          flex-height
          class="flex-1-hidden"
        />
      </div>
    </NCard>

    <!-- 标记出勤弹窗 -->
    <NModal v-model:show="showMarkModal" preset="card" title="标记学员出勤" style="width: 500px">
      <NForm :model="markForm" label-placement="left" label-width="100px">
        <NFormItem label="学员ID" required>
          <NInput v-model:value="markForm.memberId" placeholder="请输入学员ID" />
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
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showMarkModal = false">取消</NButton>
          <NButton type="primary" :loading="markLoading" @click="submitMarkAttendance">
            确认标记
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 出勤率查询弹窗 -->
    <NModal v-model:show="showRateModal" preset="card" title="学员出勤率" style="width: 400px">
      <div v-if="rateLoading" class="flex-center py-8">
        <NSpin size="large" />
      </div>

      <div v-else-if="attendanceRate" class="flex-col gap-4">
        <div class="text-center">
          <div class="text-sm text-gray-600 mb-2">学员ID</div>
          <div class="text-lg font-bold">{{ selectedMemberId }}</div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="flex-col items-center p-4 bg-blue-50 rounded">
            <div class="text-2xl font-bold text-primary">{{ attendanceRate.total }}</div>
            <div class="mt-1 text-sm text-gray-600">总课时</div>
          </div>

          <div class="flex-col items-center p-4 bg-green-50 rounded">
            <div class="text-2xl font-bold text-success">{{ attendanceRate.attended }}</div>
            <div class="mt-1 text-sm text-gray-600">已出勤</div>
          </div>

          <div class="flex-col items-center p-4 bg-purple-50 rounded">
            <div class="text-2xl font-bold text-purple-600">
              {{ Math.round(attendanceRate.rate * 100) }}%
            </div>
            <div class="mt-1 text-sm text-gray-600">出勤率</div>
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
