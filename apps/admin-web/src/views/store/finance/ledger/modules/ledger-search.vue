<script setup lang="ts">
import {
  NButton,
  NCollapse,
  NCollapseItem,
  NDatePicker,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NSelect
} from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'LedgerSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();
const model = defineModel<Api.Finance.LedgerSearchParams>('model', { required: true });

// 交易类型选项
const typeOptions = [
  { label: '佣金入账', value: 'COMMISSION_IN' },
  { label: '提现支出', value: 'WITHDRAW_OUT' },
  { label: '退款倒扣', value: 'REFUND_DEDUCT' },
  { label: '余额支付', value: 'CONSUME_PAY' }
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
      <NCollapseItem :title="$t('common.search')" name="ledger-search">
        <NForm :model="model" label-placement="left" :label-width="100">
          <NGrid responsive="screen" item-responsive :x-gap="16" :y-gap="16">
            <NGridItem span="24 s:12 m:8 l:6">
              <NFormItem label="交易时间" path="createTime">
                <NDatePicker
                  v-model:formatted-value="model.createTime"
                  type="daterange"
                  clearable
                  placeholder="选择日期范围"
                  value-format="yyyy-MM-dd"
                  class="w-full"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:8 l:6">
              <NFormItem label="交易类型" path="type">
                <NSelect v-model:value="model.type" :options="typeOptions" placeholder="请选择" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:8 l:6">
              <NFormItem label="订单号/交易ID" path="relatedId">
                <NInput v-model:value="model.relatedId" placeholder="输入订单号或交易ID" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:8 l:6">
              <NFormItem label="用户搜索" path="keyword">
                <NInput v-model:value="model.keyword" placeholder="姓名或手机号" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:8 l:6">
              <NFormItem label="最小金额" path="minAmount">
                <NInputNumber
                  v-model:value="model.minAmount"
                  placeholder="最小金额"
                  :min="0"
                  :precision="2"
                  clearable
                  class="w-full"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:8 l:6">
              <NFormItem label="最大金额" path="maxAmount">
                <NInputNumber
                  v-model:value="model.maxAmount"
                  placeholder="最大金额"
                  :min="0"
                  :precision="2"
                  clearable
                  class="w-full"
                />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:24 m:16 l:12">
              <NFormItem>
                <div class="w-full flex justify-end gap-12px">
                  <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
                  <NButton type="primary" @click="handleSearch">{{ $t('common.search') }}</NButton>
                </div>
              </NFormItem>
            </NGridItem>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>
