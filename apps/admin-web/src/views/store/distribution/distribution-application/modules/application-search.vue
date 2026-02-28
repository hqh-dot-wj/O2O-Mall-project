<script setup lang="ts">
import { reactive } from 'vue';
import { $t } from '@/locales';

defineOptions({
  name: 'ApplicationSearch'
});

const model = defineModel<Api.Store.ListApplicationDto>('model', { required: true });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

function handleSearch() {
  emit('search');
}

function handleReset() {
  emit('reset');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NForm :model="model" label-placement="left" :label-width="80">
      <NGrid :x-gap="24" :y-gap="16" responsive="screen" item-responsive>
        <NFormItemGi span="24 s:12 m:6" label="会员ID" path="memberId">
          <NInput v-model:value="model.memberId" placeholder="请输入会员ID" clearable />
        </NFormItemGi>
        <NFormItemGi span="24 s:12 m:6" label="审核状态" path="status">
          <NSelect
            v-model:value="model.status"
            placeholder="请选择状态"
            :options="[
              { label: '待审核', value: 'PENDING' },
              { label: '已通过', value: 'APPROVED' },
              { label: '已驳回', value: 'REJECTED' }
            ]"
            clearable
          />
        </NFormItemGi>
        <NFormItemGi span="24 s:24 m:12">
          <NSpace justify="end" class="w-full">
            <NButton @click="handleReset">
              <template #icon>
                <icon-ic-round-refresh class="text-icon" />
              </template>
              重置
            </NButton>
            <NButton type="primary" @click="handleSearch">
              <template #icon>
                <icon-ic-round-search class="text-icon" />
              </template>
              查询
            </NButton>
          </NSpace>
        </NFormItemGi>
      </NGrid>
    </NForm>
  </NCard>
</template>

<style scoped></style>
