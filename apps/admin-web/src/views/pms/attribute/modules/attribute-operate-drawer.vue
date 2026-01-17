<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useBoolean } from '@sa/hooks';
import { useNaiveForm } from '@/hooks/common/form';
import { NDrawer, NDrawerContent, NForm, NFormItem, NInput, NDivider, NButton, NTable, NInputNumber, NSelect, NSpace, NPopconfirm } from 'naive-ui';
import type { FormRules } from 'naive-ui';
import { fetchCreateAttribute, fetchUpdateAttribute, fetchGetAttribute } from '@/service/api/pms/attribute';
import { $t } from '@/locales';

defineOptions({
  name: 'AttributeOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit data */
  rowData?: Api.Pms.AttributeTemplate | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean();

// Init model with default attribute
const model = ref<Api.Pms.AttributeOperateParams>({
  name: '',
  attributes: []
});

const rules = computed<FormRules>(() => {
  return {
    name: { required: true, message: $t('form.required'), trigger: 'blur' }
  };
});

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.pms.attribute.addTemplate'),
    edit: $t('page.pms.attribute.editTemplate')
  };
  return titles[props.operateType];
});

// Attribute Options
const usageTypeOptions = computed(() => [
  { label: $t('page.pms.attribute.usage.param'), value: 'PARAM' },
  { label: $t('page.pms.attribute.usage.spec'), value: 'SPEC' }
]);

const inputTypeOptions = computed(() => [
  { label: $t('page.pms.attribute.input.manual'), value: 0 },
  { label: $t('page.pms.attribute.input.select'), value: 1 }
]);

const applyTypeOptions = computed(() => [
  { label: $t('page.pms.attribute.apply.common'), value: 0 },
  { label: $t('page.pms.attribute.apply.real'), value: 1 },
  { label: $t('page.pms.attribute.apply.service'), value: 2 }
]);

async function handleInitModel() {
  if (props.operateType === 'add') {
    model.value = {
      name: '',
      attributes: [] // Start empty or maybe with one empty row?
    };
  } else if (props.rowData) {
    if (props.rowData.templateId) {
      startLoading();
      try {
        const { data, error } = await fetchGetAttribute(props.rowData.templateId);
        if (!error && data) {
           const { templateId, name, attributes } = data;
           model.value = {
              templateId,
              name,
              attributes: attributes || []
           };
        }
      } finally {
        endLoading();
      }
    }
  }
}

function handleAddAttribute() {
  model.value.attributes.push({
    name: '',
    usageType: 'PARAM',
    applyType: 0,
    inputType: 0,
    sort: 0,
    inputList: ''
  });
}

function handleRemoveAttribute(index: number) {
  model.value.attributes.splice(index, 1);
}

async function handleSubmit() {
  await validate();
  
  // Basic validation for attributes names
  if (model.value.attributes.some(attr => !attr.name)) {
    window.$message?.error($t('page.pms.attribute.validate.attributeNameRequired'));
    return;
  }

  startLoading();
  try {
    if (props.operateType === 'add') {
      await fetchCreateAttribute(model.value);
    } else {
      if (!model.value.templateId) return; // Should not happen in edit
      await fetchUpdateAttribute(model.value.templateId, model.value);
    }
    window.$message?.success($t('common.updateSuccess'));
    visible.value = false;
    emit('submitted');
  } finally {
    endLoading();
  }
}

watch(visible, val => {
  if (val) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="1000">
    <NDrawerContent :title="title" :native-scrollbar="false" bordered>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
        <NFormItem :label="$t('common.name' )" path="name">
          <NInput v-model:value="model.name" :placeholder="$t('common.name' )" />
        </NFormItem>

        <NDivider>{{ $t('page.pms.attribute.attributeConfig') }}</NDivider>

        <div class="mb-4">
          <NButton type="primary" dashed block @click="handleAddAttribute">
            <icon-ic-round-plus class="mr-1 text-icon" />
            {{ $t('page.pms.attribute.addAttribute') }}
          </NButton>
        </div>

        <NTable :single-line="false" size="small">
          <thead>
            <tr>
              <th class="w-60px">{{ $t('common.sort') }}</th>
              <th class="w-150px">{{ $t('page.pms.attribute.attributeName') }}</th>
              <th class="w-120px">{{ $t('page.pms.attribute.usageType') }}</th>
              <th class="w-120px">{{ $t('page.pms.attribute.inputType') }}</th>
              <th>{{ $t('page.pms.attribute.inputList') }}</th>
              <th class="w-120px">{{ $t('page.pms.attribute.applyType') }}</th>
              <th class="w-60px">{{ $t('common.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in model.attributes" :key="index">
              <td>
                <NInputNumber v-model:value="item.sort" :show-button="false" size="small" />
              </td>
              <td>
                <NInput v-model:value="item.name" :placeholder="$t('page.pms.attribute.placeholder.attributeName')" size="small" />
              </td>
              <td>
                <NSelect v-model:value="item.usageType" :options="usageTypeOptions" size="small" />
              </td>
              <td>
                <NSelect v-model:value="item.inputType" :options="inputTypeOptions" size="small" />
              </td>
              <td>
                <NInput 
                  v-model:value="item.inputList" 
                  :disabled="item.inputType === 0" 
                  :placeholder="$t('page.pms.attribute.placeholder.inputList')" 
                  size="small" 
                />
              </td>
              <td>
                <NSelect v-model:value="item.applyType" :options="applyTypeOptions" size="small" />
              </td>
              <td>
                <NButton size="tiny" type="error" @click="handleRemoveAttribute(index)">
                  <icon-ic-round-delete class="text-icon" />
                </NButton>
              </td>
            </tr>
          </tbody>
        </NTable>
        
        <!-- Empty state -->
        <div v-if="model.attributes.length === 0" class="py-8 text-center text-gray-400">
          {{ $t('page.pms.attribute.noAttributes') }}
        </div>

      </NForm>
      <template #footer>
        <NSpace justify="end" :size="16">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
