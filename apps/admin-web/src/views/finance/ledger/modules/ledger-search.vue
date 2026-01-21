<script setup lang="ts">
import { NCollapse, NCollapseItem, NForm, NFormItem, NGrid, NGridItem, NSelect, NButton } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'LedgerSearch',
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
  { label: '余额支付', value: 'CONSUME_PAY' },
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
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive :x-gap="16" :y-gap="16">
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="交易类型" path="type">
                <NSelect v-model:value="model.type" :options="typeOptions" placeholder="请选择" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:6">
              <NFormItem>
                <div class="flex gap-12px w-full justify-end">
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
