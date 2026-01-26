<script setup lang="ts">
import { NButton, NCard, NForm, NFormItemGi, NGrid, NInput, NSpace } from 'naive-ui';
import { $t } from '@/locales';

defineOptions({
  name: 'WithdrawalSearch'
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
    <NForm :model="model" label-placement="left" :label-width="80" inline>
      <NGrid :cols="24" :x-gap="18">
        <NFormItemGi :span="6" label="关键词">
          <NInput
            v-model:value="model.keyword"
            placeholder="搜索昵称/手机号"
            clearable
            @keypress.enter="emit('search')"
          />
        </NFormItemGi>
        <NFormItemGi :span="6">
          <NSpace>
            <NButton type="primary" @click="emit('search')">
              <template #icon>
                <icon-ic-round-search />
              </template>
              {{ $t('common.search') }}
            </NButton>
            <NButton @click="emit('reset')">
              <template #icon>
                <icon-ic-round-refresh />
              </template>
              {{ $t('common.reset') }}
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>
