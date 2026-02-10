<script setup lang="tsx">
import { computed, reactive } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NSelect,
  NSpace,
  useMessage,
} from 'naive-ui';
import {
  fetchCouponDistributeManual,
  fetchGetCouponTemplateList,
  fetchGetUserCoupons,
} from '@/service/api/marketing-coupon';
import { fetchGetMemberList } from '@/service/api/member';
import { useTable } from '@/hooks/common/table';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'CouponDistribution',
});

const message = useMessage();
const { formRef, validate } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const model = reactive({
  templateId: null as string | null,
  memberIds: [] as string[],
});

const rules = {
  templateId: defaultRequiredRule,
  memberIds: [
    {
      required: true,
      type: 'array' as const,
      trigger: ['blur', 'change'],
      message: '请至少选择一个会员',
    },
  ],
};

// 优惠券模板列表（仅用于下拉）
const { data: templateData, loading: templateLoading } = useTable({
  apiFn: fetchGetCouponTemplateList,
  apiParams: {
    pageNum: 1,
    pageSize: 100,
    status: 'ACTIVE',
  },
  columns: () => [],
});

// 会员列表（仅用于下拉）
const { data: memberData, loading: memberLoading } = useTable({
  apiFn: fetchGetMemberList,
  apiParams: {
    pageNum: 1,
    pageSize: 100,
  },
  columns: () => [],
});

const templateOptions = computed(() => {
  return (templateData.value || []).map((t) => ({
    label: `${t.name} (面值: ${t.value}${t.type === 'CASH' ? '元' : '%'})`,
    value: t.id,
  }));
});

const memberOptions = computed(() => {
  return (memberData.value || []).map((m) => ({
    label: `${m.nickname} (${m.mobile})`,
    value: m.memberId,
  }));
});

// 发放记录表格
const {
  columns: recordColumns,
  data: recordData,
  getData: getRecordData,
  getDataByPage,
  loading: recordLoading,
  searchParams,
  resetSearchParams,
  mobilePagination,
} = useTable({
  apiFn: fetchGetUserCoupons,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: undefined as string | undefined,
    status: undefined as string | undefined,
  },
  columns: () => [
    { key: 'index', title: '序号', align: 'center', width: 64, render: (_: any, index: number) => index + 1 },
    {
      key: 'couponName',
      title: '优惠券名称',
      align: 'center',
      minWidth: 140,
      ellipsis: { tooltip: true },
      render: (row: Api.Marketing.UserCoupon) => row.couponName ?? row.templateName ?? '-',
    },
    {
      key: 'typeValue',
      title: '类型/面值',
      align: 'center',
      width: 100,
      render: (row: Api.Marketing.UserCoupon) => {
        const type = row.couponType ?? row.type;
        if (type === 'PERCENTAGE' && row.discountPercent != null) return `${row.discountPercent}%`;
        if (row.discountAmount != null) return `¥${row.discountAmount}`;
        return row.value != null ? `${row.value}` : '-';
      },
    },
    { key: 'memberId', title: '会员ID', align: 'center', width: 120, ellipsis: { tooltip: true } },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 88,
      render: (row: Api.Marketing.UserCoupon) => {
        const map: Record<string, string> = {
          UNUSED: '未使用',
          USED: '已使用',
          EXPIRED: '已过期',
          LOCKED: '已锁定',
        };
        return map[row.status] ?? row.status;
      },
    },
    {
      key: 'distributionType',
      title: '发放方式',
      align: 'center',
      width: 88,
      render: (row: Api.Marketing.UserCoupon) => {
        const map: Record<string, string> = {
          MANUAL: '手动发放',
          ACTIVITY: '活动领取',
          ORDER: '订单赠送',
        };
        return map[row.distributionType ?? ''] ?? '-';
      },
    },
    {
      key: 'receiveTime',
      title: '领取时间',
      align: 'center',
      width: 170,
      render: (row: Api.Marketing.UserCoupon) =>
        (row.receiveTime ?? row.createTime ?? '-').toString().replace('T', ' ').slice(0, 19),
    },
    {
      key: 'usedTime',
      title: '使用时间',
      align: 'center',
      width: 170,
      render: (row: Api.Marketing.UserCoupon) =>
        row.usedTime ? row.usedTime.toString().replace('T', ' ').slice(0, 19) : '-',
    },
  ],
});

async function handleDistribute() {
  await validate();
  if (!model.templateId || model.memberIds.length === 0) return;
  try {
    const res = await fetchCouponDistributeManual({
      templateId: model.templateId,
      memberIds: model.memberIds,
    });
    const list = (res as any)?.data;
    const count = Array.isArray(list) ? list.filter((r: any) => r?.success).length : 0;
    message.success(`成功向 ${count} 名会员发放了优惠券`);
    model.templateId = null;
    model.memberIds = [];
    getRecordData();
  } catch (error) {
    console.error(error);
  }
}
</script>

<template>
  <div class="h-full flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard title="手动发放" :bordered="false" size="small" class="card-wrapper">
      <NForm
        ref="formRef"
        :model="model"
        :rules="rules"
        label-placement="left"
        :label-width="120"
        class="mx-auto mt-24px max-w-800px"
      >
        <NFormItem label="选择优惠券" path="templateId">
          <NSelect
            v-model:value="model.templateId"
            :options="templateOptions"
            :loading="templateLoading"
            placeholder="请选择要发放的优惠券模板"
            filterable
          />
        </NFormItem>

        <NFormItem label="目标会员" path="memberIds">
          <NSelect
            v-model:value="model.memberIds"
            multiple
            :options="memberOptions"
            :loading="memberLoading"
            placeholder="请选择目标会员 (可多选)"
            filterable
            class="min-h-120px"
          />
        </NFormItem>

        <div class="mt-32px flex justify-center">
          <NButton type="primary" size="large" class="px-64px" @click="handleDistribute">开始发放</NButton>
        </div>
      </NForm>
    </NCard>

    <NCard title="发放记录" :bordered="false" size="small" class="card-wrapper mt-16px">
      <NForm inline class="mb-16px" label-placement="left" :label-width="80">
        <NGrid :cols="24" :x-gap="12">
          <NGridItem :span="6">
            <NFormItem label="会员ID">
              <NInput v-model:value="searchParams.memberId" placeholder="可选，不填查全部" clearable />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="6">
            <NFormItem label="状态">
              <NSelect
                v-model:value="searchParams.status"
                placeholder="全部"
                clearable
                :options="[
                  { label: '未使用', value: 'UNUSED' },
                  { label: '已使用', value: 'USED' },
                  { label: '已过期', value: 'EXPIRED' },
                  { label: '已锁定', value: 'LOCKED' },
                ]"
                style="width: 100%"
              />
            </NFormItem>
          </NGridItem>
        </NGrid>
        <NSpace>
          <NButton type="primary" @click="getRecordData">查询</NButton>
          <NButton @click="resetSearchParams">重置</NButton>
        </NSpace>
      </NForm>
      <NDataTable
        :columns="recordColumns"
        :data="recordData"
        :loading="recordLoading"
        :pagination="mobilePagination"
        :row-key="(row: Api.Marketing.UserCoupon) => row.id"
        remote
        @update:page="getDataByPage"
      />
    </NCard>
  </div>
</template>

<style scoped>
.min-h-120px {
  min-height: 120px;
}
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
