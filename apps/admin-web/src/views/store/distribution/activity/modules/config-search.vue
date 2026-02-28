<script setup lang="ts">
import { NButton, NCollapse, NCollapseItem, NForm, NFormItemGi, NGrid, NInput, NSelect } from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({ name: 'ConfigSearch' });

/**
 * 营销配置搜索栏
 */

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

// 绑定搜索模型
const model = defineModel<Api.Marketing.StoreConfigSearchParams>('model', { required: true });

async function reset() {
  await restoreValidation();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}

// 状态字典
const statusOptions = [
  { label: '已上架', value: 'ON_SHELF' },
  { label: '已下架', value: 'OFF_SHELF' }
];
</script>

<template>
  <NCollapse :default-expanded-names="['search']" class="mb-4">
    <NCollapseItem title="筛选查询" name="search">
      <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
        <NGrid :cols="24" :x-gap="24">
          <NFormItemGi :span="6" label="模板类型" path="templateCode">
            <NInput v-model:value="model.templateCode" placeholder="如: GROUP_BUY" />
          </NFormItemGi>
          <NFormItemGi :span="6" label="状态" path="status">
            <NSelect v-model:value="model.status" :options="statusOptions" clearable />
          </NFormItemGi>
          <NFormItemGi :span="6">
            <div class="flex gap-12px">
              <NButton type="primary" @click="search">
                <icon-ic-round-search class="mr-4px text-20px" />
                查询
              </NButton>
              <NButton @click="reset">
                <icon-ic-round-refresh class="mr-4px text-20px" />
                重置
              </NButton>
            </div>
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NCollapseItem>
  </NCollapse>
</template>
