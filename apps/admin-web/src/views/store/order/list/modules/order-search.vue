<script setup lang="ts">
import { NButton, NCollapse, NCollapseItem, NForm, NFormItem, NGrid, NGridItem, NInput, NSelect } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'OrderSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();
const model = defineModel<Api.Order.SearchParams>('model', { required: true });

// 订单状态选项
const statusOptions = [
  { label: '待支付', value: 'PENDING_PAY' },
  { label: '已支付', value: 'PAID' },
  { label: '已发货', value: 'SHIPPED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
  { label: '已退款', value: 'REFUNDED' }
];

// 订单类型选项
const orderTypeOptions = [
  { label: '实物商品', value: 'PRODUCT' },
  { label: '服务类', value: 'SERVICE' }
];

function handleReset() {
  emit('reset');
}

function handleSearch() {
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="order-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive :x-gap="16" :y-gap="16">
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="订单号" path="orderSn">
                <NInput v-model:value="model.orderSn" placeholder="请输入订单号" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="手机号" path="receiverPhone">
                <NInput v-model:value="model.receiverPhone" placeholder="请输入收货人手机号" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="订单状态" path="status">
                <NSelect v-model:value="model.status" :options="statusOptions" placeholder="请选择" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="订单类型" path="orderType">
                <NSelect v-model:value="model.orderType" :options="orderTypeOptions" placeholder="请选择" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:24 m:24">
              <NFormItem>
                <div class="w-full flex justify-end gap-12px">
                  <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
                  <NButton type="primary" ghost @click="handleSearch">{{ $t('common.search') }}</NButton>
                </div>
              </NFormItem>
            </NGridItem>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>
