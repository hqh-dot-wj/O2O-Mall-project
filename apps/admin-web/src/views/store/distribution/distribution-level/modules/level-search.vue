<script setup lang="ts">
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'LevelSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.Store.LevelSearchParams>('model', { required: true });

const statusOptions: Array<{ label: string; value: 1 | 0 }> = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 }
];

function onStatusChange(v: 1 | 0 | null): void {
  model.value.isActive = v === 1 ? true : v === 0 ? false : undefined;
}

async function reset() {
  await restoreValidation();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}
</script>

<template>
  <NCard :bordered="false" size="small" class="card-wrapper">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="level-search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="状态" path="isActive" class="pr-24px">
              <NSelect
                :value="model.isActive === true ? 1 : model.isActive === false ? 0 : null"
                placeholder="请选择状态"
                :options="statusOptions"
                clearable
                @update:value="onStatusChange"
              />
            </NFormItemGi>
            <NFormItemGi span="24" class="pr-24px">
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
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>

<style scoped></style>
