<script setup lang="tsx">
import { useRouter } from 'vue-router';
import { NButton, NDivider, NInput, NModal, NSpace, NTag } from 'naive-ui';
import { ref } from 'vue';
import {
  fetchBatchRefund,
  fetchBatchVerify,
  fetchGetOrderList
} from '@/service/api/store/order';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useDownload } from '@/hooks/business/download';
import { useTable, useTableOperate, useTableProps } from '@/hooks/common/table';
import { useBoolean } from '@sa/hooks';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import OrderSearch from './modules/order-search.vue';

defineOptions({
  name: 'OrderList'
});

const router = useRouter();
const appStore = useAppStore();
const { hasAuth } = useAuth();
const tableProps = useTableProps();
const { getDownload } = useDownload();

// 批量核销/退款弹窗
const { bool: batchVerifyVisible, setTrue: openBatchVerify, setFalse: closeBatchVerify } = useBoolean(false);
const { bool: batchRefundVisible, setTrue: openBatchRefund, setFalse: closeBatchRefund } = useBoolean(false);
const batchRemark = ref('');
const batchLoading = ref(false);

// 订单状态映射
const orderStatusRecord: Record<string, { label: string; type: NaiveUI.ThemeColor }> = {
  PENDING_PAY: { label: '待支付', type: 'warning' },
  PAID: { label: '已支付', type: 'info' },
  SHIPPED: { label: '已发货', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'default' },
  REFUNDED: { label: '已退款', type: 'error' }
};

// 订单类型映射
const orderTypeRecord: Record<string, string> = {
  PRODUCT: '实物商品',
  SERVICE: '服务类'
};

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
  apiFn: fetchGetOrderList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    orderSn: null,
    receiverPhone: null,
    status: null,
    orderType: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
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
      key: 'orderType',
      title: '订单类型',
      align: 'center',
      minWidth: 100,
      render: row => orderTypeRecord[row.orderType] || row.orderType
    },
    {
      key: 'receiverName',
      title: '收货人',
      align: 'center',
      minWidth: 100
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
      render: row => {
        const status = orderStatusRecord[row.status];
        return status ? <NTag type={status.type}>{status.label}</NTag> : row.status;
      }
    },
    {
      key: 'productImg',
      title: '商品图片',
      align: 'center',
      width: 80,
      render: row => (
        <div class="h-40px w-40px flex-center overflow-hidden rounded-4px bg-gray-100">
          {row.productImg ? <img src={row.productImg} class="h-full w-full object-cover" /> : <span>无</span>}
        </div>
      )
    },
    {
      key: 'receiverPhone',
      title: '联系电话',
      align: 'center',
      minWidth: 120
    },
    {
      key: 'commissionAmount',
      title: '佣金扣除',
      align: 'center',
      minWidth: 100,
      render: row => {
        const amount = Number(row.commissionAmount || 0);
        if (amount === 0) {
          return <span class="text-gray">-¥0.00</span>;
        }
        return <span class="text-error font-medium">-¥{amount.toFixed(2)}</span>;
      }
    },
    {
      key: 'remainingAmount',
      title: '商户收款',
      align: 'center',
      minWidth: 100,
      render: row => {
        const amount = Number(row.remainingAmount || row.payAmount || 0);
        return <span class="text-success font-medium">¥{amount.toFixed(2)}</span>;
      }
    },
    {
      key: 'receiverAddress',
      title: '收货地址',
      align: 'center',
      minWidth: 200,
      ellipsis: {
        tooltip: true
      }
    },
    {
      key: 'tenantName',
      title: '所属租户',
      align: 'center',
      minWidth: 120
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
      width: 120,
      render: row => {
        return (
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
          </div>
        );
      }
    }
  ]
});

const { checkedRowKeys } = useTableOperate(data, getData);

const selectedOrderIds = () => {
  if (!checkedRowKeys.value.length) return [];
  return data.value.filter(row => checkedRowKeys.value.includes(row.id)).map(r => r.id);
};

/** 查看订单详情 */
function handleViewDetail(orderId: string) {
  router.push({ name: 'store_order_detail', query: { id: orderId } });
}

/** 导出订单 */
function handleExport() {
  const params: Record<string, string | number | null | undefined> = {
    orderSn: searchParams.orderSn ?? '',
    receiverPhone: searchParams.receiverPhone ?? '',
    status: searchParams.status ?? '',
    orderType: searchParams.orderType ?? ''
  };
  getDownload(
    '/store/order/export',
    params,
    `订单数据_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

/** 批量核销 */
function handleBatchVerify() {
  const ids = selectedOrderIds();
  if (ids.length === 0) {
    window.$message?.warning('请先选择要核销的订单');
    return;
  }
  batchRemark.value = '';
  openBatchVerify();
}

/** 提交批量核销 */
async function submitBatchVerify() {
  const ids = selectedOrderIds();
  if (ids.length === 0) return;
  batchLoading.value = true;
  try {
    const res = await fetchBatchVerify({ orderIds: ids, remark: batchRemark.value || undefined });
    window.$message?.success(`批量核销完成：成功 ${res.successCount} 笔，失败 ${res.failCount} 笔`);
    closeBatchVerify();
    checkedRowKeys.value = [];
    getData();
  } catch {
    throw new Error(); // 保持弹窗打开，错误已由 request 层提示
  } finally {
    batchLoading.value = false;
  }
}

/** 批量退款 */
function handleBatchRefund() {
  const ids = selectedOrderIds();
  if (ids.length === 0) {
    window.$message?.warning('请先选择要退款的订单');
    return;
  }
  batchRemark.value = '';
  openBatchRefund();
}

/** 提交批量退款 */
async function submitBatchRefund() {
  const ids = selectedOrderIds();
  if (ids.length === 0) return;
  batchLoading.value = true;
  try {
    const res = await fetchBatchRefund({ orderIds: ids, remark: batchRemark.value || undefined });
    window.$message?.success(`批量退款完成：成功 ${res.successCount} 笔，失败 ${res.failCount} 笔`);
    closeBatchRefund();
    checkedRowKeys.value = [];
    getData();
  } catch {
    throw new Error(); // 保持弹窗打开，错误已由 request 层提示
  } finally {
    batchLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <OrderSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard title="订单列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NSpace>
          <NButton v-if="hasAuth('store:order:export')" @click="handleExport">导出</NButton>
          <NButton
            v-if="hasAuth('store:order:verify')"
            :disabled="selectedOrderIds().length === 0"
            @click="handleBatchVerify"
          >
            批量核销
            <template v-if="selectedOrderIds().length">({{ selectedOrderIds().length }})</template>
          </NButton>
          <NButton
            v-if="hasAuth('store:order:refund')"
            :disabled="selectedOrderIds().length === 0"
            type="error"
            @click="handleBatchRefund"
          >
            批量退款
            <template v-if="selectedOrderIds().length">({{ selectedOrderIds().length }})</template>
          </NButton>
          <TableHeaderOperation
            v-model:columns="columnChecks"
            :loading="loading"
            :show-add="false"
            :show-delete="false"
            @refresh="getData"
          />
        </NSpace>
      </template>
      <NDataTable
        v-model:checked-row-keys="checkedRowKeys"
        :columns="columns"
        :data="data"
        v-bind="tableProps"
        :flex-height="!appStore.isMobile"
        :scroll-x="1200"
        :loading="loading"
        remote
        :row-key="row => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <!-- 批量核销弹窗 -->
    <NModal
      v-model:show="batchVerifyVisible"
      title="批量核销"
      preset="dialog"
      positive-text="确认核销"
      :loading="batchLoading"
      @positive-click="submitBatchVerify"
    >
      <NInput
        v-model:value="batchRemark"
        type="textarea"
        placeholder="核销备注（选填）"
        :rows="3"
        class="mt-12px"
      />
    </NModal>

    <!-- 批量退款弹窗 -->
    <NModal
      v-model:show="batchRefundVisible"
      title="批量退款"
      preset="dialog"
      positive-text="确认退款"
      :loading="batchLoading"
      @positive-click="submitBatchRefund"
    >
      <NInput
        v-model:value="batchRemark"
        type="textarea"
        placeholder="退款原因（选填）"
        :rows="3"
        class="mt-12px"
      />
    </NModal>
  </div>
</template>

<style scoped>
.text-success {
  color: #18a058;
  font-weight: 500;
}
.text-error {
  color: #d03050;
  font-weight: 500;
}
.text-gray {
  color: #999;
}
.font-medium {
  font-weight: 500;
}
</style>
