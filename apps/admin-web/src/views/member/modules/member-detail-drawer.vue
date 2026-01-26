<script setup lang="ts">
import { computed, watch } from 'vue';
import { useBoolean } from '@sa/hooks';
import { fetchGetOrderList } from '@/service/api/order';
import { fetchGetLedger } from '@/service/api/finance';
import { useTable } from '@/hooks/common/table';

defineOptions({
  name: 'MemberDetailDrawer'
});

interface Props {
  /** the visible state of the drawer */
  visible: boolean;
  /** the row data */
  rowData?: Api.Member.Member | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'update:visible', visible: boolean): void;
}

const emit = defineEmits<Emits>();

const drawerVisible = computed({
  get() {
    return props.visible;
  },
  set(visible) {
    emit('update:visible', visible);
  }
});

// Order Table
const {
  columns: orderColumns,
  data: orderData,
  loading: orderLoading,
  mobilePagination: orderPagination,
  searchParams: orderParams,
  updateSearchParams: updateOrderParams,
  getData: getOrderData
} = useTable({
  apiFn: fetchGetOrderList,
  immediate: false, // Wait for drawer to open
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: ''
  },
  columns: () => [
    {
      key: 'orderSn',
      title: '订单号',
      align: 'center'
    },
    {
      key: 'payAmount',
      title: '支付金额',
      align: 'center'
    },
    {
      key: 'status',
      title: '状态',
      align: 'center'
    },
    {
      key: 'createTime',
      title: '创建时间',
      align: 'center'
    }
  ]
});

// Finance Table
const {
  columns: financeColumns,
  data: financeData,
  loading: financeLoading,
  mobilePagination: financePagination,
  searchParams: financeParams,
  updateSearchParams: updateFinanceParams,
  getData: getFinanceData
} = useTable<typeof fetchGetLedger>({
  apiFn: fetchGetLedger,
  immediate: false,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: ''
  },
  columns: () => [
    {
      key: 'type',
      title: '类型',
      align: 'center',
      render: row => row.typeName || (row.type === 'COMMISSION_IN' ? '分销佣金' : '其他')
    },
    {
      key: 'amount',
      title: '变动金额',
      align: 'center',
      render: row => {
        return row.amount > 0 ? `+${row.amount}` : `${row.amount}`;
      }
    },
    {
      key: 'createTime',
      title: '时间',
      align: 'center'
    }
  ]
});

// Watch visible to refresh data
watch(
  () => props.visible,
  val => {
    if (val && props.rowData) {
      // Reset params with current memberId
      updateOrderParams({ memberId: props.rowData.memberId });
      updateFinanceParams({ memberId: props.rowData.memberId });

      // Fetch Data
      getOrderData();
      getFinanceData();
    }
  }
);
</script>

<template>
  <NDrawer v-model:show="drawerVisible" title="用户详情" :width="800">
    <NDrawerContent class="main-content">
      <NTabs type="line" animated>
        <!-- User Info Tab -->
        <NTabPane name="info" tab="基本信息">
          <div v-if="rowData" class="p-4">
            <div class="mb-6 flex items-center">
              <NAvatar :src="rowData.avatar" :size="80" round class="mr-4" />
              <div>
                <h2 class="text-xl font-bold">{{ rowData.nickname }}</h2>
                <p class="text-gray-500">{{ rowData.mobile }}</p>
              </div>
            </div>

            <NGrid :x-gap="12" :y-gap="12" :cols="3" class="mb-6">
              <NGi>
                <NCard title="累计消费" size="small">
                  <span class="text-2xl text-primary font-bold">¥{{ rowData.totalConsumption }}</span>
                </NCard>
              </NGi>
              <NGi>
                <NCard title="累计佣金" size="small">
                  <span class="text-2xl text-warning font-bold">¥{{ rowData.commission }}</span>
                </NCard>
              </NGi>
              <NGi>
                <NCard title="当前余额" size="small">
                  <span class="text-2xl text-success font-bold">¥{{ rowData.balance }}</span>
                </NCard>
              </NGi>
            </NGrid>

            <NDescriptions label-placement="left" bordered title="详细信息">
              <NDescriptionsItem label="用户ID">{{ rowData.memberId }}</NDescriptionsItem>
              <NDescriptionsItem label="注册时间">{{ rowData.createTime }}</NDescriptionsItem>
              <NDescriptionsItem label="所属租户">{{ rowData.tenantName }}</NDescriptionsItem>
              <NDescriptionsItem label="推荐人">{{ rowData.referrerName || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="推荐人手机">{{ rowData.referrerMobile || '-' }}</NDescriptionsItem>
            </NDescriptions>
          </div>
        </NTabPane>

        <!-- Order List Tab -->
        <NTabPane name="order" tab="订单记录">
          <div class="h-full flex flex-col">
            <NDataTable
              :columns="orderColumns"
              :data="orderData"
              :loading="orderLoading"
              :pagination="orderPagination"
              remote
              class="flex-1-hidden"
            />
          </div>
        </NTabPane>

        <!-- Finance Tab -->
        <NTabPane name="finance" tab="资金记录">
          <div class="h-full flex flex-col">
            <NDataTable
              :columns="financeColumns"
              :data="financeData"
              :loading="financeLoading"
              :pagination="financePagination"
              remote
              class="flex-1-hidden"
            />
          </div>
        </NTabPane>
      </NTabs>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.main-content {
  display: flex;
  flex-direction: column;
}
.flex-1-hidden {
  flex: 1;
  overflow: hidden;
}
</style>
