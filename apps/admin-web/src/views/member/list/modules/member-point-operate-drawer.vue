<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { fetchAdjustMemberPoints } from '@/service/api/member';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'MemberPointOperateDrawer'
});

interface Props {
  /** Member ID */
  memberId: string;
}

const props = defineProps<Props>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const message = useMessage();

const model = reactive({
  type: 'ADD' as 'ADD' | 'SUB',
  amount: 0,
  remark: ''
});

const rules = {
  amount: defaultRequiredRule,
  remark: defaultRequiredRule
};

watch(visible, val => {
  if (val) {
    model.type = 'ADD';
    model.amount = 0;
    model.remark = '';
    restoreValidation();
  }
});

async function handleSubmit() {
  await validate();

  const adjustAmount = model.type === 'ADD' ? model.amount : -model.amount;

  try {
    await fetchAdjustMemberPoints({
      memberId: props.memberId,
      amount: adjustAmount,
      remark: model.remark
    });

    message.success('积分调整成功');
    visible.value = false;
    emit('submitted');
  } catch (error) {
    console.error(error);
  }
}

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();
</script>

<template>
  <NDrawer v-model:show="visible" :width="400" title="人工调整积分">
    <NDrawerContent>
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
        <NFormItem label="调整类型" path="type">
          <NRadioGroup v-model:value="model.type">
            <NRadioButton value="ADD">增加</NRadioButton>
            <NRadioButton value="SUB">扣减</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <NFormItem label="调整数量" path="amount">
          <NInputNumber v-model:value="model.amount" :min="1" :precision="0" class="w-full" />
        </NFormItem>

        <NFormItem label="调整原因" path="remark">
          <NInput v-model:value="model.remark" type="textarea" placeholder="请输入调整原因..." />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">确认提交</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
