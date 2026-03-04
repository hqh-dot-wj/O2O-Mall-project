<script setup lang="tsx">
import { useRouter } from 'vue-router';
import { NButton, NInputNumber, NModal, NTag } from 'naive-ui';
import { ref } from 'vue';
import { fetchGetDispatchList, fetchReassignWorker } from '@/service/api/store/order';
import { useAuth } from '@/hooks/business/auth';
import { useTable, useTableProps } from '@/hooks/common/table';
import { useBoolean } from '@sa/hooks';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';

defineOptions({
  name: 'OrderDispatch'
});

const router = useRouter();
const { hasAuth } = useAuth();

const { bool: reassignModalVisible, setTrue: openReassignModal, setFalse: closeReassignModal } = useBoolean(false);
const currentOrderId = ref('');
const newWorkerId = ref<number | null>(null);
const reassignLoading = ref(false);

const tableProps = useTableProps();
const {
  columns,
  columnChecks,
  data,
  getData,
  loading,
  mobilePagination
} = useTable({
  apiFn: fetchGetDispatchList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    orderSn: null,
    receiverPhone: null,
    orderType: 'SERVICE'
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64
    },
    {
      key: 'orderSn',
      title: '订单号',
      align: 'center',
      minWidth: 180
    },
    {
      key: 'receiverName',
      title: '收货人',
      align: 'center',
      minWidth: 100
    },
    {
      key: 'receiverPhone',
      title: '联系电话',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'payAmount',
      title: '支付金额',
      align: 'center',
      minWidth: 100,
      render: row => `¥${row.payAmount}`
    },
    {
      key: 'status',
      title: '订单状态',
      align: 'center',
      minWidth: 100,
      render: row => <NTag type="info">待派单</NTag>
    },
    {
      key: 'createTime',
      title: '下单时间',
      align: 'center',
      minWidth: 160
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 160,
      render: row => (
        <div class="flex-center gap-8px">
          {hasAuth('store:order:query') && (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:visibility-outline"
              tooltipContent="查看详情"
              onClick={() => handleViewDetail(row.id)}
            />
          )}
          {hasAuth('store:order:dispatch') && (
            <ButtonIcon
              text
              type="primary"
              icon="material-symbols:person-add-outline"
              tooltipContent="派单/改派"
              onClick={() => handleReassign(row.id)}
            />
          )}
        </div>
      )
    }
  ]
});

function handleViewDetail(orderId: string) {
  router.push({ name: 'store_order_detail', query: { id: orderId } });
}

function handleReassign(orderId: string) {
  currentOrderId.value = orderId;
  newWorkerId.value = null;
  openReassignModal();
}

async function submitReassign() {
  if (!currentOrderId.value || newWorkerId.value == null || newWorkerId.value <= 0) {
    window.$message?.warning('请输入有效的技师 ID');
    return;
  }
  reassignLoading.value = true;
  try {
    await fetchReassignWorker({
      orderId: currentOrderId.value,
      newWorkerId: newWorkerId.value
    });
    window.$message?.success('派单成功');
    closeReassignModal();
    getData();
  } catch {
    throw new Error();
  } finally {
    reassignLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="待派单列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        />
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        v-bind="tableProps"
        :scroll-x="900"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <NModal
      v-model:show="reassignModalVisible"
      title="派单 / 改派技师"
      preset="dialog"
      positive-text="确认派单"
      :loading="reassignLoading"
      @positive-click="submitReassign"
    >
      <p class="text-gray-600 text-14px mb-8px">请输入技师的 ID（可在技师管理中查看）：</p>
      <NInputNumber v-model:value="newWorkerId" placeholder="技师 ID" :min="1" class="w-full" />
    </NModal>
  </div>
</template>
