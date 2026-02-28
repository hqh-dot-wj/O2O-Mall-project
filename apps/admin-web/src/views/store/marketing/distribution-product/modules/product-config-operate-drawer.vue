<script setup lang="ts">
import { reactive, watch } from 'vue';
import { fetchCreateProductConfig, fetchUpdateProductConfig } from '@/service/api/distribution';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'ProductConfigOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Store.ProductConfig | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = reactive<Api.Store.CreateProductConfigDto>(createDefaultModel());

function createDefaultModel(): Api.Store.CreateProductConfigDto {
  return {
    productId: '',
    level1Rate: 0,
    level2Rate: 0,
    commissionBaseType: 'ORIGINAL_PRICE'
  };
}

const commissionBaseTypeOptions = [
  { label: '原价', value: 'ORIGINAL_PRICE' },
  { label: '实付', value: 'ACTUAL_PAID' },
  { label: '不分佣', value: 'ZERO' }
];

async function handleInit() {
  restoreValidation();
  Object.assign(model, createDefaultModel());

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, {
      productId: props.rowData.productId,
      level1Rate: props.rowData.level1Rate,
      level2Rate: props.rowData.level2Rate,
      commissionBaseType: props.rowData.commissionBaseType
    });
  }
}

async function handleSubmit() {
  await validate();
  try {
    if (props.operateType === 'add') {
      await fetchCreateProductConfig(model);
      window.$message?.success($t('common.addSuccess'));
    } else if (props.operateType === 'edit' && props.rowData) {
      await fetchUpdateProductConfig(props.rowData.id, model);
      window.$message?.success($t('common.updateSuccess'));
    }
    visible.value = false;
    emit('submitted');
  } catch (error) {
    console.error(error);
  }
}

watch(visible, val => {
  if (val) {
    handleInit();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :title="operateType === 'add' ? '新增商品分佣' : '编辑商品分佣'" :width="500">
    <NDrawerContent :closable="true">
      <NForm ref="formRef" :model="model" label-placement="left" :label-width="120">
        <NFormItem label="商品ID" path="productId">
          <NInput v-model:value="model.productId" placeholder="请输入商品ID" :disabled="operateType === 'edit'" />
        </NFormItem>
        <NFormItem label="一级分佣比例" path="level1Rate">
          <NInputNumber v-model:value="model.level1Rate" :min="0" :max="100" class="w-full">
            <template #suffix>%</template>
          </NInputNumber>
        </NFormItem>
        <NFormItem label="二级分佣比例" path="level2Rate">
          <NInputNumber v-model:value="model.level2Rate" :min="0" :max="100" class="w-full">
            <template #suffix>%</template>
          </NInputNumber>
        </NFormItem>
        <NFormItem label="基数类型" path="commissionBaseType">
          <NSelect v-model:value="model.commissionBaseType" :options="commissionBaseTypeOptions" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
