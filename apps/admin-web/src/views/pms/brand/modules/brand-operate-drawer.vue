<script setup lang="tsx">
import { computed, reactive, watch } from 'vue';
import { fetchAddBrand, fetchUpdateBrand } from '@/service/api/pms/brand';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'BrandOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.Pms.Brand | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.pms.brand.addBrand'),
    edit: $t('page.pms.brand.editBrand')
  };
  return titles[props.operateType];
});

type Model = Api.Pms.BrandOperateParams;

const model: Model = reactive(createDefaultModel());

function createDefaultModel(): Model {
  return {
    name: '',
    logo: ''
  };
}

type RuleKey = Extract<keyof Model, 'name'>;

const rules: Record<RuleKey, App.Global.FormRule[]> = {
  name: [defaultRequiredRule]
};

async function handleSubmit() {
  await validate();
  if (props.operateType === 'add') {
    await fetchAddBrand(model);
  } else {
    await fetchUpdateBrand(model);
  }
  window.$message?.success($t('common.updateSuccess'));
  close();
  emit('submitted');
}

function close() {
  visible.value = false;
}

watch(visible, () => {
  if (visible.value) {
    handleInit();
    restoreValidation();
  }
});

function handleInit() {
  Object.assign(model, createDefaultModel());
  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, props.rowData);
  }
}
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.pms.brand.brandName')" path="name">
          <NInput v-model:value="model.name" :placeholder="$t('page.pms.brand.form.brandName.required')" />
        </NFormItem>
        <NFormItem :label="$t('page.pms.brand.brandLogo')" path="logo">
          <NInput v-model:value="model.logo" :placeholder="$t('page.pms.brand.form.logo.required')" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="close">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
