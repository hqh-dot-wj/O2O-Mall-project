<script setup lang="ts">
import { $t } from '@/locales';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'ProductSearch',
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const model = defineModel<Api.Store.ListStoreProductParams>('model', { required: true });

const { formRef, validate, restoreValidation } = useNaiveForm();

async function reset() {
  await restoreValidation();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}

const typeOptions = [
  { label: '全部', value: null },
  { label: '实物', value: 'REAL' },
  { label: '服务', value: 'SERVICE' },
] as any[];

const statusOptions = [
  { label: '全部', value: null },
  { label: '已上架', value: 'ON_SHELF' },
  { label: '已下架', value: 'OFF_SHELF' },
] as any[];
</script>

<template>
  <NCard :bordered="false" size="small" class="rounded-8px shadow-sm">
    <NCollapse :default-expanded-names="['search']">
      <NCollapseItem :title="$t('common.search')" name="search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="商品名称" path="name" class="pr-24px">
              <NInput v-model:value="model.name" placeholder="搜索名称/标题" clearable @keyup.enter="search" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="商品类型" path="type" class="pr-24px">
              <NSelect v-model:value="model.type" placeholder="选择类型" :options="typeOptions" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="商品状态" path="status" class="pr-24px">
              <NSelect v-model:value="model.status" placeholder="选择状态" :options="statusOptions" clearable />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6">
              <NSpace class="w-full" justify="end">
                <NButton @click="reset">
                  <template #icon>
                    <div class="i-js-sync" />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <div class="i-js-search" />
                  </template>
                  {{ $t('common.search') }}
                </NButton>
              </NSpace>
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>

<style scoped></style>
