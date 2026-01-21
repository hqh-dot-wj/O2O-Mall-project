<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchUpdateMemberReferrer, fetchUpdateMemberTenant } from '@/service/api/member';
import { $t } from '@/locales';

defineOptions({
  name: 'MemberOperateDrawer',
});

interface Props {
  /** the type of operation */
  operateType: 'editReferrer' | 'editTenant';
  /** the edit row data */
  rowData?: Api.Member.Member | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  if (props.operateType === 'editReferrer') return $t('page.member.editReferrer');
  return $t('page.member.editTenant');
});

type Model = {
  referrerId: string;
  tenantId: string;
};

const model = reactive<Model>(createDefaultModel());

function createDefaultModel(): Model {
  return {
    referrerId: '',
    tenantId: '',
  };
}

const rules = computed<Record<string, App.Global.FormRule[]>>(() => {
  return {};
});

function handleInitModel() {
  if (props.rowData) {
    model.referrerId = props.rowData.referrerId || '';
    model.tenantId = props.rowData.tenantId || '';
  }
}

watch(visible, (val) => {
  if (val) {
    handleInitModel();
    restoreValidation();
  }
});

async function handleSubmit() {
  await validate();

  if (props.operateType === 'editReferrer') {
    if (props.rowData?.memberId) {
      await fetchUpdateMemberReferrer({ memberId: props.rowData.memberId, referrerId: model.referrerId });
      window.$message?.success($t('page.member.confirm.updateSuccess'));
      closeDrawer();
      emit('submitted');
    }
  } else if (props.operateType === 'editTenant') {
    if (props.rowData?.memberId) {
      await fetchUpdateMemberTenant({ memberId: props.rowData.memberId, tenantId: model.tenantId });
      window.$message?.success($t('page.member.confirm.updateSuccess'));
      closeDrawer();
      emit('submitted');
    }
  }
}

function closeDrawer() {
  visible.value = false;
}
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem v-if="operateType === 'editReferrer'" :label="$t('page.member.form.referrerId')" path="referrerId">
          <NInput v-model:value="model.referrerId" :placeholder="$t('page.member.form.referrerId')" />
        </NFormItem>
        <NFormItem v-if="operateType === 'editTenant'" :label="$t('page.member.form.tenantId')" path="tenantId">
          <NInput v-model:value="model.tenantId" :placeholder="$t('page.member.form.tenantId')" />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end" :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
