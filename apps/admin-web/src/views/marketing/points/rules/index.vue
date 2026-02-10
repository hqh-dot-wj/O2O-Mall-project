<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { fetchGetPointsRuleConfig, fetchUpdatePointsRuleConfig } from '@/service/api/marketing-points';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'PointsRules',
});

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = reactive<Api.Marketing.PointsRule>({
  orderPointsEnabled: true,
  orderPointsRatio: 1,
  orderPointsBase: 1,
  signinPointsEnabled: true,
  signinPointsAmount: 10,
  pointsValidityEnabled: false,
  pointsValidityDays: null,
  pointsRedemptionEnabled: true,
  pointsRedemptionRatio: 100,
  pointsRedemptionBase: 1,
  maxPointsPerOrder: null,
  maxDiscountPercentOrder: 50,
  systemEnabled: true,
});

/** 数字必填校验：用 validator 避免 NInputNumber 与 required 的兼容问题 */
function numberRequired(message: string) {
  return {
    trigger: 'blur' as const,
    validator(_rule: unknown, value: unknown) {
      if (value === undefined || value === null || value === '') {
        return new Error(message);
      }
      const n = Number(value);
      if (Number.isNaN(n)) {
        return new Error(message);
      }
      return true;
    },
  };
}

/** 仅对当前启用区块的字段做必填校验，避免未展示的项被误判 */
const rules = computed(() => {
  const r: Record<string, Array<{ trigger: string; validator: (rule: unknown, value: unknown) => Error | true }>> = {};
  if (model.orderPointsEnabled) {
    r.orderPointsRatio = [numberRequired('请输入消费积分比例')];
    r.orderPointsBase = [numberRequired('请输入消费积分基数')];
  }
  if (model.signinPointsEnabled) {
    r.signinPointsAmount = [numberRequired('请输入签到积分数量')];
  }
  if (model.pointsRedemptionEnabled) {
    r.pointsRedemptionRatio = [numberRequired('请输入积分抵扣比例')];
    r.pointsRedemptionBase = [numberRequired('请输入积分抵扣基数')];
    r.maxDiscountPercentOrder = [numberRequired('请输入最高抵扣百分比')];
  }
  return r;
});

const loading = ref(false);

/** 必填数字字段的默认值，避免 API 返回 null 时触发校验 */
const numberDefaults = {
  orderPointsRatio: 1,
  orderPointsBase: 1,
  signinPointsAmount: 10,
  pointsRedemptionRatio: 100,
  pointsRedemptionBase: 1,
  maxDiscountPercentOrder: 50,
};

async function initData() {
  loading.value = true;
  try {
    const { data } = await fetchGetPointsRuleConfig();
    if (data) {
      Object.assign(model, data);
      // 确保必填数字字段不为 null（API 可能返回 null 或 NInputNumber 期望 number 而非 string）
      (Object.keys(numberDefaults) as Array<keyof typeof numberDefaults>).forEach((k) => {
        const v = model[k];
        if (v == null || v === '' || (typeof v === 'number' && Number.isNaN(v))) {
          model[k] = numberDefaults[k] as never;
        } else if (typeof v === 'string') {
          const n = Number(v);
          model[k] = (Number.isNaN(n) ? numberDefaults[k] : n) as never;
        }
      });
    }
    restoreValidation();
  } finally {
    loading.value = false;
  }
}

/** 更新接口只接受配置字段，不能带 id/tenantId/createBy/createTime/updateBy/updateTime */
const UPDATE_KEYS: (keyof Api.Marketing.PointsRuleUpdate)[] = [
  'orderPointsEnabled',
  'orderPointsRatio',
  'orderPointsBase',
  'signinPointsEnabled',
  'signinPointsAmount',
  'pointsValidityEnabled',
  'pointsValidityDays',
  'pointsRedemptionEnabled',
  'pointsRedemptionRatio',
  'pointsRedemptionBase',
  'maxPointsPerOrder',
  'maxDiscountPercentOrder',
  'systemEnabled',
];

async function handleSubmit() {
  await validate();
  loading.value = true;
  try {
    const payload = UPDATE_KEYS.reduce((acc, key) => {
      acc[key] = model[key];
      return acc;
    }, {} as Api.Marketing.PointsRuleUpdate);
    await fetchUpdatePointsRuleConfig(payload);
    window.$message?.success($t('common.updateSuccess'));
    initData();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  initData();
});
</script>

<template>
  <div class="h-full overflow-y-auto">
    <NCard title="积分规则配置" :bordered="false" size="small" class="rounded-8px shadow-sm">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="180"
        class="max-w-720px py-20px"
      >
        <NDivider title-placement="left">积分获取规则</NDivider>
        <NFormItem label="启用消费积分" path="orderPointsEnabled">
          <NSwitch v-model:value="model.orderPointsEnabled" />
        </NFormItem>
        <NFormItem v-if="model.orderPointsEnabled" label="消费积分规则">
          <NSpace align="center">
            <NFormItem path="orderPointsRatio" :show-label="false" class="!mb-0">
              <NInputNumber v-model:value="model.orderPointsRatio" :min="0" placeholder="M" style="width: 100px" />
            </NFormItem>
            <span class="text-gray-500">积分 / 每消费</span>
            <NFormItem path="orderPointsBase" :show-label="false" class="!mb-0">
              <NInputNumber v-model:value="model.orderPointsBase" :min="0.01" placeholder="N" style="width: 100px" />
            </NFormItem>
            <span class="text-gray-500">元</span>
          </NSpace>
        </NFormItem>
        <NFormItem label="启用签到积分" path="signinPointsEnabled">
          <NSwitch v-model:value="model.signinPointsEnabled" />
        </NFormItem>
        <NFormItem v-if="model.signinPointsEnabled" label="签到赠送积分" path="signinPointsAmount">
          <NSpace align="center">
            <NInputNumber v-model:value="model.signinPointsAmount" :min="1" style="width: 120px" />
            <span class="text-gray-500">积分/天</span>
          </NSpace>
        </NFormItem>

        <NDivider title-placement="left">积分有效期</NDivider>
        <NFormItem label="启用积分有效期" path="pointsValidityEnabled">
          <NSwitch v-model:value="model.pointsValidityEnabled" />
        </NFormItem>
        <NFormItem v-if="model.pointsValidityEnabled" label="积分有效天数" path="pointsValidityDays">
          <NInputNumber
            v-model:value="model.pointsValidityDays"
            :min="1"
            style="width: 120px"
            placeholder="null表示永久有效"
          />
        </NFormItem>

        <NDivider title-placement="left">积分使用规则</NDivider>
        <NFormItem label="启用积分抵扣" path="pointsRedemptionEnabled">
          <NSwitch v-model:value="model.pointsRedemptionEnabled" />
        </NFormItem>
        <NFormItem v-if="model.pointsRedemptionEnabled" label="积分抵扣规则">
          <NSpace align="center">
            <NFormItem path="pointsRedemptionRatio" :show-label="false" class="!mb-0">
              <NInputNumber v-model:value="model.pointsRedemptionRatio" :min="0" placeholder="N" style="width: 100px" />
            </NFormItem>
            <span class="text-gray-500">积分 抵扣</span>
            <NFormItem path="pointsRedemptionBase" :show-label="false" class="!mb-0">
              <NInputNumber
                v-model:value="model.pointsRedemptionBase"
                :min="0.01"
                placeholder="M"
                style="width: 100px"
              />
            </NFormItem>
            <span class="text-gray-500">元</span>
          </NSpace>
        </NFormItem>
        <NFormItem v-if="model.pointsRedemptionEnabled" label="单笔最多使用积分" path="maxPointsPerOrder">
          <NInputNumber
            v-model:value="model.maxPointsPerOrder"
            :min="0"
            style="width: 120px"
            placeholder="不填表示不限制"
          />
        </NFormItem>
        <NFormItem v-if="model.pointsRedemptionEnabled" label="单笔最高抵扣比例" path="maxDiscountPercentOrder">
          <NInputNumber v-model:value="model.maxDiscountPercentOrder" :min="1" :max="100" style="width: 120px">
            <template #suffix>%</template>
          </NInputNumber>
        </NFormItem>

        <NDivider title-placement="left">系统开关</NDivider>
        <NFormItem label="积分系统总开关" path="systemEnabled">
          <NSwitch v-model:value="model.systemEnabled" />
        </NFormItem>

        <NFormItem>
          <NButton type="primary" :loading="loading" @click="handleSubmit">保存配置</NButton>
        </NFormItem>
      </NForm>
    </NCard>
  </div>
</template>
