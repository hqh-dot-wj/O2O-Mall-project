<script setup lang="tsx">
import { NButton, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { fetchDeleteMessage, fetchGetMessageList, fetchReadMessage } from '@/service/api/system/message';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import MessageSearch from './modules/message-search.vue';
import MessageOperateDrawer from './modules/message-operate-drawer.vue';

defineOptions({
  name: 'MessageList'
});

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams
} = useTable({
  apiFn: fetchGetMessageList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    type: null,
    isRead: null
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 48
    },
    {
      key: 'title',
      title: '标题',
      align: 'left',
      minWidth: 150
    },
    {
      key: 'type',
      title: '类型',
      align: 'center',
      width: 100,
      render: row => {
        const map: Record<string, 'default' | 'primary' | 'info'> = {
          ORDER: 'primary',
          SYSTEM: 'info',
          NOTICE: 'default'
        };
        return <NTag type={map[row.type] || 'default'}>{row.type}</NTag>;
      }
    },
    {
      key: 'isRead',
      title: '状态',
      align: 'center',
      width: 80,
      render: row => <NTag type={row.isRead ? 'success' : 'warning'}>{row.isRead ? '已读' : '未读'}</NTag>
    },
    {
      key: 'createTime',
      title: '创建时间',
      align: 'center',
      width: 180
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 150,
      render: row => (
        <div class="flex-center gap-8px">
          {!row.isRead && (
            <ButtonIcon
              text
              type="primary"
              tooltipContent="标记已读"
              icon="material-symbols:mark-email-read-outline"
              onClick={() => handleRead(row)}
            />
          )}
          <ButtonIcon
            text
            tooltipContent="查看详情"
            icon="material-symbols:visibility-outline"
            onClick={() => handleView(row)}
          />
          <ButtonIcon
            text
            type="error"
            icon="material-symbols:delete-outline"
            tooltipContent={$t('common.delete')}
            popconfirmContent={$t('common.confirmDelete')}
            onPositiveClick={() => handleDelete(row.id!)}
          />
        </div>
      )
    }
  ]
});

const { drawerVisible, operateType, editingData, handleAdd, onDeleted } = useTableOperate(data, getData);

async function handleDelete(id: number) {
  try {
    await fetchDeleteMessage(id);
    onDeleted();
  } catch (error) {}
}

async function handleRead(row: Api.System.MessageVo) {
  try {
    await fetchReadMessage(row.id);
    getData();
  } catch (err) {}
}

function handleView(row: NaiveUI.TableDataWithIndex<Api.System.MessageVo>) {
  operateType.value = 'edit'; // Using 'edit' mode to view details in drawer
  editingData.value = row;
  drawerVisible.value = true;
}

// Manually trigger add for testing
function handleCreateTest() {
  operateType.value = 'add';
  drawerVisible.value = true;
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard :bordered="false" class="h-full flex-col-stretch card-wrapper sm:flex-1-hidden">
      <MessageSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />

      <div class="flex-1 overflow-hidden">
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="true"
          @add="handleCreateTest"
          @refresh="getData"
        >
          <template #default>
            <!-- Left side content if any -->
          </template>
        </TableHeaderOperation>

        <NDataTable
          :columns="columns"
          :data="data"
          :loading="loading"
          :pagination="mobilePagination"
          :row-key="row => row.id"
          flex-height
          class="h-full"
        />
      </div>

      <MessageOperateDrawer
        v-model:visible="drawerVisible"
        :operate-type="operateType"
        :row-data="editingData"
        @submitted="getData"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
