<script setup lang="ts">
import { $t } from '@/locales';
interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.Member.MemberSearchParams>('model', { required: true });

function reset() {
  emit('reset');
}

function search() {
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NForm :model="model" inline label-placement="left" :label-width="80">
      <NFormItem label="用户昵称" path="nickname">
        <NInput v-model:value="model.nickname" placeholder="请输入用户昵称" />
      </NFormItem>
      <NFormItem label="手机号码" path="mobile">
        <NInput v-model:value="model.mobile" placeholder="请输入手机号码" />
      </NFormItem>
      <NFormItem>
        <NSpace class="w-full" justify="end">
          <NButton @click="reset">
            <template #icon>
              <icon-ic-round-refresh class="text-icon" />
            </template>
            {{ $t('common.reset') }}
          </NButton>
          <NButton type="primary" ghost @click="search">
            <template #icon>
              <icon-ic-round-search class="text-icon" />
            </template>
            {{ $t('common.search') }}
          </NButton>
        </NSpace>
      </NFormItem>
    </NForm>
  </NCard>
</template>

<style scoped></style>
