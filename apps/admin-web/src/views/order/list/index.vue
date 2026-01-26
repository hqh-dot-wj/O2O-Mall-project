<script setup lang="tsx">
import { useRouter } from 'vue-router';
import { NDivider, NTag } from 'naive-ui';
import { fetchGetOrderList } from '@/service/api/order';
import { useAppStore } from '@/store/modules/app';
import { useAuth } from '@/hooks/business/auth';
import { useTable, useTableOperate, useTableProps } from '@/hooks/common/table';
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
      title: '分佣金额',
      align: 'center',
      minWidth: 100,
      render: row => `¥${row.commissionAmount}`
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

/** 查看订单详情 */
function handleViewDetail(orderId: string) {
  router.push({ path: 'order_detail', query: { id: orderId } });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <OrderSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard title="订单列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
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
  </div>
</template>

<style scoped></style>
