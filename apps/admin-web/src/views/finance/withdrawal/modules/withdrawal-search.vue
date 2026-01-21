<script setup lang="ts">
import { NCard } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'WithdrawalSearch',
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();
const model = defineModel<Api.Finance.WithdrawalSearchParams>('model', { required: true });

// 提现状态通过 Tab 控制，这里暂不需要额外搜索条件
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <div class="text-gray-500">
      {{ $t('common.tips') }}: 使用上方标签页切换不同状态的提现申请
    </div>
  </NCard>
</template>
