<script setup lang="ts">
import { computed } from 'vue';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'UpgradeSearch'
});

interface Emits {
  (e: 'reset'): void;
  (e: 'search'): void;
}

const emit = defineEmits<Emits>();

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = defineModel<Api.Member.UpgradeApplySearchParams>('model', { required: true });

async function reset() {
  await restoreValidation();
  emit('reset');
}

async function search() {
  await validate();
  emit('search');
}

const statusOptions = [
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
];

const applyTypeOptions = [
  { label: '商品购买', value: 'PRODUCT_PURCHASE' },
  { label: '推荐码扫码', value: 'REFERRAL_CODE' },
  { label: '手动调整', value: 'MANUAL_ADJUST' }
];
</script>

<template>
  <NCard :bordered="false" class="card-wrapper" size="small">
    <NCollapse>
      <NCollapseItem :title="$t('common.search')" name="search">
        <NForm ref="formRef" :model="model" label-placement="left" :label-width="80">
          <NGrid responsive="screen" item-responsive>
            <NFormItemGi span="24 s:12 m:6" label="会员ID" path="memberId" class="pr-24px">
              <NInput v-model:value="model.memberId" placeholder="请输入会员ID" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="状态" path="status" class="pr-24px">
              <NSelect v-model:value="model.status" :options="statusOptions" clearable placeholder="请选择状态" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6" label="申请类型" path="applyType" class="pr-24px">
              <NSelect v-model:value="model.applyType" :options="applyTypeOptions" clearable placeholder="请选择类型" />
            </NFormItemGi>
            <NFormItemGi span="24 s:12 m:6">
              <NSpace class="w-full justify-end" :wrap="false">
                <NButton @click="reset">
                  <template #icon>
                    <icon-ic-round-refresh />
                  </template>
                  {{ $t('common.reset') }}
                </NButton>
                <NButton type="primary" ghost @click="search">
                  <template #icon>
                    <icon-ic-round-search />
                  </template>
                  {{ $t('common.search') }}
                </NButton>
              </NSpace>
            </NFormItemGi>
          </NGrid>
        </NForm>
      </NCollapseItem>
    </NCollapse>
  </NCard>
</template>

<style scoped></style>
