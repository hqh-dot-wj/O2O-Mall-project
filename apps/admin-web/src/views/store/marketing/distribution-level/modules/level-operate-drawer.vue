<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { FormInst, FormRules } from 'naive-ui';
import { fetchCreateLevel, fetchUpdateLevel } from '@/service/api/distribution';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'LevelOperateDrawer'
});

interface Props {
  /** 操作类型: add-新增, edit-编辑 */
  operateType: NaiveUI.TableOperateType;
  /** 编辑时的行数据 */
  rowData?: Api.Store.Level | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();

type Model = Api.Store.CreateLevelDto;

const model = reactive<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    levelName: '',
    levelWeight: 0,
    level1Rate: 0,
    level2Rate: 0,
    upgradeCondition: {},
    status: '1'
  };
}

const rules: FormRules = {
  levelName: [{ required: true, message: '请输入等级名称', trigger: 'blur' }],
  levelWeight: [{ required: true, type: 'number', message: '请输入等级权重', trigger: 'blur' }],
  level1Rate: [{ required: true, type: 'number', message: '请输入一级分佣比例', trigger: 'blur' }],
  level2Rate: [{ required: true, type: 'number', message: '请输入二级分佣比例', trigger: 'blur' }]
};

function handleInit() {
  restoreValidation();
  Object.assign(model, createDefaultModel());

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, {
      levelName: props.rowData.levelName,
      levelWeight: props.rowData.levelWeight,
      level1Rate: props.rowData.level1Rate,
      level2Rate: props.rowData.level2Rate,
      upgradeCondition: props.rowData.upgradeCondition || {},
      status: props.rowData.status
    });
  }
}

async function handleSubmit() {
  await validate();
  try {
    if (props.operateType === 'add') {
      await fetchCreateLevel(model);
      window.$message?.success($t('common.addSuccess'));
    } else if (props.operateType === 'edit' && props.rowData) {
      await fetchUpdateLevel(props.rowData.id, model);
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
  <NDrawer v-model:show="visible" :title="operateType === 'add' ? '新增等级' : '编辑等级'" :width="500">
    <NDrawerContent :closable="true">
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="120">
        <NFormItem label="等级名称" path="levelName">
          <NInput v-model:value="model.levelName" placeholder="请输入等级名称" />
        </NFormItem>
        <NFormItem label="等级权重" path="levelWeight">
          <NInputNumber v-model:value="model.levelWeight" :min="0" class="w-full" placeholder="权重越高等级越高" />
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
        <NFormItem label="状态" path="status">
          <NRadioGroup v-model:value="model.status">
            <NSpace>
              <NRadio value="1">启用</NRadio>
              <NRadio value="0">禁用</NRadio>
            </NSpace>
          </NRadioGroup>
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
