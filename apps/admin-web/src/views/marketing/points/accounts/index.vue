<script setup lang="tsx">
import { ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSpace,
  useMessage
} from 'naive-ui';
import { fetchAdjustPoints, fetchGetPointsAccounts } from '@/service/api/marketing-points';
import { useTable } from '@/hooks/common/table';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'PointsAccounts'
});

const message = useMessage();
const { formRef, validate } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();
const drawerVisible = ref(false);
const adjustMemberId = ref('');
const adjustModel = ref({ amount: 0, remark: '' });

const { columns, data, getData, getDataByPage, loading, searchParams, resetSearchParams, mobilePagination } = useTable({
  apiFn: fetchGetPointsAccounts,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: null
  },
  columns: () => [
    { key: 'index', title: '序号', align: 'center', width: 64, render: (_: any, index: number) => index + 1 },
    { key: 'memberId', title: '会员ID', align: 'center', width: 120 },
    {
      key: 'member',
      title: '昵称/手机',
      align: 'center',
      width: 160,
      render: (row: any) =>
        row.member ? `${row.member.nickname || '-'} / ${row.member.mobile || '-'}` : '-'
    },
    { key: 'availablePoints', title: '可用积分', align: 'center', width: 100 },
    { key: 'totalPoints', title: '累计获得', align: 'center', width: 100 },
    { key: 'usedPoints', title: '已使用', align: 'center', width: 90 },
    { key: 'createTime', title: '创建时间', align: 'center', width: 170 },
    {
      key: 'actions',
      title: '操作',
      align: 'center',
      width: 100,
      fixed: 'right',
      render: (row: any) => (
        <NButton size="small" type="primary" onClick={() => openAdjust(row)}>
          调整
        </NButton>
      )
    }
  ]
});

function openAdjust(row: any) {
  adjustMemberId.value = row.memberId;
  adjustModel.value = { amount: 0, remark: '' };
  drawerVisible.value = true;
}

const submitLoading = ref(false);
async function handleAdjustSubmit() {
  await validate();
  submitLoading.value = true;
  try {
    await fetchAdjustPoints({
      memberId: adjustMemberId.value,
      amount: adjustModel.value.amount,
      type: 'EARN_ADMIN',
      remark: adjustModel.value.remark || undefined
    });
    message.success('调整成功');
    drawerVisible.value = false;
    getData();
  } catch (e) {
    // message handled by request
  } finally {
    submitLoading.value = false;
  }
}

const rules = {
  amount: defaultRequiredRule
};
</script>

<template>
  <div class="h-full flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="积分账户" :bordered="false" size="small" class="card-wrapper">
      <NForm inline class="mb-16px" label-placement="left" :label-width="80">
        <NFormItem label="会员ID">
          <NInput v-model:value="searchParams.memberId" placeholder="会员ID" clearable style="width: 200px" />
        </NFormItem>
        <NSpace>
          <NButton type="primary" @click="getData">查询</NButton>
          <NButton @click="resetSearchParams">重置</NButton>
        </NSpace>
      </NForm>
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="mobilePagination"
        :row-key="(row: any) => row.id"
        remote
        @update:page="getDataByPage"
      />
    </NCard>

    <NDrawer v-model:show="drawerVisible" :width="400">
      <NDrawerContent title="调整积分" closable>
        <NForm
          ref="formRef"
          :model="adjustModel"
          :rules="rules"
          label-placement="left"
          label-width="80"
          class="mt-16px"
        >
          <NFormItem label="会员ID">
            <NInput :value="adjustMemberId" disabled />
          </NFormItem>
          <NFormItem label="调整数量" path="amount" required>
            <NInputNumber v-model:value="adjustModel.amount" :min="1" placeholder="增加积分数量" class="w-full" />
          </NFormItem>
          <NFormItem label="备注" path="remark">
            <NInput v-model:value="adjustModel.remark" type="textarea" placeholder="选填" />
          </NFormItem>
          <NFormItem>
            <NButton type="primary" :loading="submitLoading" @click="handleAdjustSubmit">确定</NButton>
          </NFormItem>
        </NForm>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
