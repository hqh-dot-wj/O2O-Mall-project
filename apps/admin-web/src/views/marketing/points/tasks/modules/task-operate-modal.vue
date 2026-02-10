<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { fetchCreatePointTask, fetchUpdatePointTask } from '@/service/api/marketing-points';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'TaskOperateModal',
});

interface Props {
  operateType: 'add' | 'edit';
  rowData?: Api.Marketing.PointTask | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{ submitted: [] }>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => (props.operateType === 'add' ? '创建积分任务' : '编辑积分任务'));

const model = reactive<{
  taskKey: string;
  taskName: string;
  taskDescription: string;
  pointsReward: number;
  isRepeatable: boolean;
  maxCompletions: number | null;
  isEnabled: boolean;
}>({
  taskKey: '',
  taskName: '',
  taskDescription: '',
  pointsReward: 10,
  isRepeatable: false,
  maxCompletions: null,
  isEnabled: true,
});

const rules = {
  taskKey: defaultRequiredRule,
  taskName: defaultRequiredRule,
  pointsReward: [
    { required: true, message: '请输入积分奖励', trigger: 'blur' },
    { type: 'number', min: 1, message: '至少 1 积分', trigger: 'blur' },
  ],
};

function getDefaultModel() {
  return {
    taskKey: '',
    taskName: '',
    taskDescription: '',
    pointsReward: 10,
    isRepeatable: false,
    maxCompletions: null as number | null,
    isEnabled: true,
  };
}

function initModel() {
  Object.assign(model, getDefaultModel());
  if (props.operateType === 'edit' && props.rowData) {
    const row = props.rowData;
    model.taskKey = row.taskKey ?? '';
    model.taskName = row.taskName ?? '';
    model.taskDescription = row.taskDescription ?? '';
    model.pointsReward = row.pointsReward ?? 10;
    model.isRepeatable = row.isRepeatable ?? false;
    model.maxCompletions = row.maxCompletions ?? null;
    model.isEnabled = row.isEnabled ?? true;
  }
}

async function handleSubmit() {
  await validate();
  if (props.operateType === 'add') {
    await fetchCreatePointTask({
      taskKey: model.taskKey.trim(),
      taskName: model.taskName.trim(),
      taskDescription: model.taskDescription.trim() || undefined,
      pointsReward: model.pointsReward,
      isRepeatable: model.isRepeatable,
      maxCompletions: model.maxCompletions ?? undefined,
      isEnabled: model.isEnabled,
    });
  } else if (props.rowData?.id) {
    await fetchUpdatePointTask(props.rowData.id, {
      taskName: model.taskName.trim(),
      taskDescription: model.taskDescription.trim() || undefined,
      pointsReward: model.pointsReward,
      isRepeatable: model.isRepeatable,
      maxCompletions: model.maxCompletions ?? undefined,
      isEnabled: model.isEnabled,
    });
  }
  window.$message?.success($t('common.updateSuccess'));
  visible.value = false;
  emit('submitted');
}

watch(visible, (val) => {
  if (val) {
    initModel();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-600px">
    <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="120">
      <NFormItem label="任务标识" path="taskKey">
        <NInput
          v-model:value="model.taskKey"
          placeholder="如 COMPLETE_PROFILE、SIGN_IN"
          :disabled="operateType === 'edit'"
        />
        <template #feedback>
          <span class="text-12px text-gray-500">英文唯一标识，创建后不可修改</span>
        </template>
      </NFormItem>
      <NFormItem label="任务名称" path="taskName">
        <NInput v-model:value="model.taskName" placeholder="如：完善个人资料" />
      </NFormItem>
      <NFormItem label="任务描述" path="taskDescription">
        <NInput v-model:value="model.taskDescription" type="textarea" placeholder="选填" :rows="2" />
      </NFormItem>
      <NFormItem label="积分奖励" path="pointsReward">
        <NInputNumber v-model:value="model.pointsReward" :min="1" class="w-full" />
      </NFormItem>
      <NFormItem label="可重复完成" path="isRepeatable">
        <NSwitch v-model:value="model.isRepeatable" />
      </NFormItem>
      <NFormItem v-if="model.isRepeatable" label="最多完成次数" path="maxCompletions">
        <NInputNumber
          v-model:value="model.maxCompletions"
          :min="1"
          class="w-full"
          placeholder="不填表示不限制"
          clearable
        />
      </NFormItem>
      <NFormItem label="启用" path="isEnabled">
        <NSwitch v-model:value="model.isEnabled" />
      </NFormItem>
    </NForm>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="visible = false">取消</NButton>
        <NButton type="primary" @click="handleSubmit">确定</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
