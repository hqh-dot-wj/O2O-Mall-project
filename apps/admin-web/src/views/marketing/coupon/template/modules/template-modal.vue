<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { fetchCreateCouponTemplate, fetchUpdateCouponTemplate } from '@/service/api/marketing-coupon';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'TemplateModal',
});

interface Props {
  /** the type of operation */
  operateType: 'add' | 'edit';
  /** the edit data */
  rowData?: Api.Marketing.CouponTemplate | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<string, string> = {
    add: '新增优惠券模板',
    edit: '编辑优惠券模板',
  };
  return titles[props.operateType];
});

/** 表单 UI 模型（与后端 DTO 在提交时转换） */
type Model = {
  name: string;
  code?: string;
  type: 'CASH' | 'DISCOUNT';
  value: number;
  minAmount: number;
  validDays: number;
  validStartTime: string;
  validEndTime: string;
  totalCount: number;
  limitPerPerson: number;
  description: string;
  timeType: 'days' | 'date-range';
  validTimeRange: [number, number] | null;
};

const model: Model = reactive(createDefaultModel());

function createDefaultModel(): Model {
  return {
    name: '',
    code: '',
    type: 'CASH',
    value: 0,
    minAmount: 0,
    validDays: 30,
    validStartTime: '',
    validEndTime: '',
    totalCount: 100,
    limitPerPerson: 1,
    description: '',
    timeType: 'days',
    validTimeRange: null,
  };
}

const rules = {
  name: defaultRequiredRule,
  type: defaultRequiredRule,
  value: defaultRequiredRule,
  minAmount: defaultRequiredRule,
  totalCount: defaultRequiredRule,
  limitPerPerson: defaultRequiredRule,
};

const typeOptions = [
  { label: '代金券', value: 'CASH' },
  { label: '折扣券', value: 'DISCOUNT' },
];

const timeTypeOptions = [
  { label: '领取后生效天数', value: 'days' },
  { label: '固定时间范围', value: 'date-range' },
];

function handleUpdateModel(modelValue: Model, values: Partial<Model>) {
  Object.assign(modelValue, values);
}

function handleInitModel() {
  Object.assign(model, createDefaultModel());

  if (props.operateType === 'edit' && props.rowData) {
    const row = props.rowData as Record<string, unknown>;
    model.name = (row.name as string) ?? '';
    model.description = (row.description as string) ?? '';
    model.type = row.type === 'PERCENTAGE' ? 'DISCOUNT' : 'CASH';
    model.value = Number(row.discountAmount ?? row.discountPercent ?? row.value ?? 0);
    model.minAmount = Number(row.minOrderAmount ?? row.minAmount ?? 0);
    model.totalCount = Number(row.totalStock ?? row.totalCount ?? 100);
    model.limitPerPerson = Number(row.limitPerUser ?? row.limitPerPerson ?? 1);
    const startTime = row.startTime ?? row.validStartTime;
    const endTime = row.endTime ?? row.validEndTime;
    if (startTime && endTime) {
      model.timeType = 'date-range';
      model.validTimeRange = [new Date(startTime as string).getTime(), new Date(endTime as string).getTime()];
      model.validStartTime = typeof startTime === 'string' ? startTime : new Date(startTime as Date).toISOString();
      model.validEndTime = typeof endTime === 'string' ? endTime : new Date(endTime as Date).toISOString();
    } else {
      model.timeType = 'days';
      model.validDays = Number(row.validDays ?? 30);
    }
  }
}

async function handleSubmit() {
  await validate();

  const isCash = model.type === 'CASH';
  const payload: Record<string, unknown> = {
    name: model.name,
    description: model.description ?? '',
    type: isCash ? 'DISCOUNT' : 'PERCENTAGE',
    discountAmount: isCash ? model.value : undefined,
    discountPercent: !isCash ? model.value : undefined,
    minOrderAmount: model.minAmount,
    validityType: model.timeType === 'days' ? 'RELATIVE' : 'FIXED',
    validDays: model.timeType === 'days' ? model.validDays : undefined,
    startTime:
      model.timeType === 'date-range' && model.validTimeRange
        ? new Date(model.validTimeRange[0]).toISOString()
        : undefined,
    endTime:
      model.timeType === 'date-range' && model.validTimeRange
        ? new Date(model.validTimeRange[1]).toISOString()
        : undefined,
    totalStock: model.totalCount === -1 ? 999999 : model.totalCount,
    limitPerUser: model.limitPerPerson,
    applicableProducts: [],
    applicableCategories: [],
    memberLevels: [],
  };

  if (props.operateType === 'add') {
    await fetchCreateCouponTemplate(payload as unknown as Api.Marketing.CouponTemplateCreate);
  } else if (props.rowData?.id) {
    await fetchUpdateCouponTemplate(props.rowData.id, payload as unknown as Api.Marketing.CouponTemplateUpdate);
  }

  window.$message?.success($t('common.updateSuccess'));
  visible.value = false;
  emit('submitted');
}

watch(visible, (val) => {
  if (val) {
    handleInitModel();
    restoreValidation();
  }
});
</script>

<template>
  <NModal v-model:show="visible" :title="title" preset="card" class="w-800px">
    <NScrollbar class="h-480px pr-20px">
      <NForm ref="formRef" :model="model" :rules="rules" label-placement="left" :label-width="100">
        <NGrid :cols="2" :x-gap="24">
          <NFormItemGi label="模板名称" path="name">
            <NInput v-model:value="model.name" placeholder="请输入模板名称" />
          </NFormItemGi>
          <NFormItemGi label="优惠券类型" path="type">
            <NSelect v-model:value="model.type" :options="typeOptions" />
          </NFormItemGi>

          <NFormItemGi label="面值" path="value">
            <NInputNumber v-model:value="model.value" :min="0" class="w-full">
              <template #suffix>
                {{ model.type === 'CASH' ? '元' : '%' }}
              </template>
            </NInputNumber>
          </NFormItemGi>
          <NFormItemGi label="最低消费" path="minAmount">
            <NInputNumber v-model:value="model.minAmount" :min="0" class="w-full">
              <template #suffix>元</template>
            </NInputNumber>
          </NFormItemGi>

          <NFormItemGi label="发放总量" path="totalCount">
            <NInputNumber v-model:value="model.totalCount" :min="-1" class="w-full" placeholder="-1表示不限" />
          </NFormItemGi>
          <NFormItemGi label="每人限领" path="limitPerPerson">
            <NInputNumber v-model:value="model.limitPerPerson" :min="1" class="w-full" />
          </NFormItemGi>

          <NFormItemGi span="2" label="有效期类型" path="timeType">
            <NRadioGroup v-model:value="model.timeType">
              <NSpace>
                <NRadio v-for="item in timeTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </NRadio>
              </NSpace>
            </NRadioGroup>
          </NFormItemGi>

          <NFormItemGi v-if="model.timeType === 'days'" span="2" label="有效天数" path="validDays">
            <NInputNumber v-model:value="model.validDays" :min="1" class="w-full">
              <template #suffix>天</template>
            </NInputNumber>
          </NFormItemGi>
          <NFormItemGi v-if="model.timeType === 'date-range'" span="2" label="有效时间" path="validTimeRange">
            <NDatePicker v-model:value="model.validTimeRange" type="datetimerange" clearable class="w-full" />
          </NFormItemGi>

          <NFormItemGi span="2" label="描述" path="description">
            <NInput v-model:value="model.description" type="textarea" placeholder="请输入描述" />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </NScrollbar>
    <template #footer>
      <NSpace justify="end">
        <NButton @click="visible = false">取消</NButton>
        <NButton type="primary" @click="handleSubmit">确定</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped></style>
