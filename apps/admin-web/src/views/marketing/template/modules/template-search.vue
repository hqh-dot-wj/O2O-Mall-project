<script setup lang="ts">
import { NButton, NCollapse, NCollapseItem, NForm, NFormItemGi, NGrid, NInput } from 'naive-ui';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({ name: 'TemplateSearch' });

interface Emits {
  (e: 'search'): void;
  (e: 'reset'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.Marketing.PlayTemplateSearchParams>('model', { required: true });

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
  <NCollapse :default-expanded-names="['search']" class="mb-4">
    <NCollapseItem title="筛选查询" name="search">
      <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
        <NGrid :cols="24" :x-gap="24">
          <NFormItemGi :span="6" label="玩法编码" path="code">
            <NInput v-model:value="model.code" placeholder="如: GROUP_BUY" />
          </NFormItemGi>
          <NFormItemGi :span="6" label="玩法名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入名称" />
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
