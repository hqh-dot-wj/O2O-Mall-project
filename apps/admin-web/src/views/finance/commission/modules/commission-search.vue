<script setup lang="ts">
import { NButton, NCollapse, NCollapseItem, NForm, NFormItem, NGrid, NGridItem, NInput, NSelect } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'CommissionSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();
const model = defineModel<Api.Finance.CommissionSearchParams>('model', { required: true });

// 状态选项
const statusOptions = [
  { label: '冻结中', value: 'FROZEN' },
  { label: '已结算', value: 'SETTLED' },
  { label: '已取消', value: 'CANCELLED' }
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
      <NCollapseItem :title="$t('common.search')" name="commission-search">
        <NForm :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive :x-gap="16" :y-gap="16">
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="订单号" path="orderSn">
                <NInput v-model:value="model.orderSn" placeholder="请输入订单号" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="手机号" path="phone">
                <NInput v-model:value="model.phone" placeholder="请输入用户手机号" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:6">
              <NFormItem label="状态" path="status">
                <NSelect v-model:value="model.status" :options="statusOptions" placeholder="请选择" clearable />
              </NFormItem>
            </NGridItem>
            <NGridItem span="24 s:12 m:6">
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
