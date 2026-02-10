<script setup lang="tsx">
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { fetchDeletePointTask, fetchGetPointTaskList } from '@/service/api/marketing-points';
import { useAppStore } from '@/store/modules/app';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import TaskOperateModal from './modules/task-operate-modal.vue';

defineOptions({
  name: 'PointTaskList',
});

const appStore = useAppStore();
const { bool: modalVisible, setTrue: openModal, setFalse: closeModal } = useBoolean();
const operateType = ref<'add' | 'edit'>('add');
const rowData = ref<Api.Marketing.PointTask | null>(null);

const { columns, data, getData, loading, mobilePagination } = useTable({
  apiFn: fetchGetPointTaskList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
  },
  columns: () => [
    {
      key: 'taskKey',
      title: '任务标识',
      align: 'center',
      width: 140,
    },
    {
      key: 'taskName',
      title: '任务名称',
      align: 'center',
      minWidth: 120,
    },
    {
      key: 'pointsReward',
      title: '积分奖励',
      align: 'center',
      width: 100,
      render: (row) => row.pointsReward ?? '-',
    },
    {
      key: 'isRepeatable',
      title: '可重复',
      align: 'center',
      width: 80,
      render: (row) => (
        <NTag type={row.isRepeatable ? 'success' : 'default'} size="small">
          {row.isRepeatable ? '是' : '否'}
        </NTag>
      ),
    },
    {
      key: 'maxCompletions',
      title: '最多次数',
      align: 'center',
      width: 100,
      render: (row) => (row.maxCompletions != null ? row.maxCompletions : '不限'),
    },
    {
      key: 'isEnabled',
      title: '状态',
      align: 'center',
      width: 80,
      render: (row) => (
        <NTag type={row.isEnabled ? 'success' : 'default'} size="small">
          {row.isEnabled ? '启用' : '停用'}
        </NTag>
      ),
    },
    {
      key: 'taskDescription',
      title: '描述',
      align: 'center',
      minWidth: 160,
      ellipsis: { tooltip: true },
      render: (row) => row.taskDescription ?? '-',
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 140,
      fixed: 'right',
      render: (row) => (
        <div class="flex-center gap-8px">
          <ButtonIcon
            type="primary"
            class="text-primary"
            tooltipContent={$t('common.edit')}
            icon="material-symbols:edit-square-outline"
            onClick={() => handleEdit(row)}
          />
          <ButtonIcon
            type="error"
            class="text-error"
            tooltipContent={$t('common.delete')}
            icon="material-symbols:delete-outline"
            onClick={() => handleDelete(row)}
          />
        </div>
      ),
    },
  ],
});

function handleAdd() {
  operateType.value = 'add';
  rowData.value = null;
  openModal();
}

function handleEdit(row: Api.Marketing.PointTask) {
  operateType.value = 'edit';
  rowData.value = row;
  openModal();
}

async function handleDelete(row: Api.Marketing.PointTask) {
  window.$dialog?.warning({
    title: $t('common.tip'),
    content: `确定删除任务「${row.taskName}」吗？`,
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      await fetchDeletePointTask(row.id);
      window.$message?.success($t('common.deleteSuccess'));
      getData();
    },
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="积分任务管理" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NSpace>
          <NButton ghost size="small" @click="getData">
            <template #icon>
              <icon-mdi-refresh class="text-icon" />
            </template>
            刷新
          </NButton>
          <NButton type="primary" size="small" @click="handleAdd">
            <template #icon>
              <icon-ic-round-plus class="text-icon" />
            </template>
            创建任务
          </NButton>
        </NSpace>
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="mobilePagination"
        remote
        :flex-height="!appStore.isMobile"
        class="sm:h-full"
      />
      <TaskOperateModal
        v-model:visible="modalVisible"
        :operate-type="operateType"
        :row-data="rowData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
