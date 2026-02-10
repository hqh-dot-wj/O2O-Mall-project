<script setup lang="tsx">
import { NButton, NCard, NDataTable, NDatePicker, NForm, NFormItem, NGrid, NGridItem, NInput, NSpace } from 'naive-ui';
import { fetchGetCouponUsageRecords } from '@/service/api/marketing-coupon';
import { useAppStore } from '@/store/modules/app';
import { useTable } from '@/hooks/common/table';
import { useDownload } from '@/hooks/business/download';

defineOptions({
  name: 'CouponUsage',
});

const appStore = useAppStore();

const { getDownload } = useDownload();
const { columns, data, getData, getDataByPage, loading, searchParams, resetSearchParams, mobilePagination } = useTable({
  apiFn: fetchGetCouponUsageRecords,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: null,
    templateId: null,
    startTime: null,
    endTime: null,
  },
  columns: () => [
    { key: 'index', title: '序号', align: 'center', width: 64, render: (_: any, index: number) => index + 1 },
    { key: 'usedTime', title: '使用时间', align: 'center', width: 170 },
    { key: 'memberId', title: '会员ID', align: 'center', width: 120 },
    { key: 'nickname', title: '昵称', align: 'center', width: 100 },
    { key: 'templateName', title: '优惠券名称', align: 'center', minWidth: 140 },
    { key: 'orderId', title: '订单号', align: 'center', minWidth: 180 },
  ],
});

function handleExport() {
  const params: Record<string, any> = {};
  if (searchParams.memberId) params.memberId = searchParams.memberId;
  if (searchParams.templateId) params.templateId = searchParams.templateId;
  if (searchParams.startTime) params.startTime = searchParams.startTime;
  if (searchParams.endTime) params.endTime = searchParams.endTime;
  getDownload('/admin/marketing/coupon/export', params, `优惠券使用记录_${Date.now()}.xlsx`);
}
</script>

<template>
  <!-- 与布局一致：main 为 flex flex-col flex-grow overflow-y-auto，页面根带 flex-grow 占满 main，故根用 h-full 承接高度；卡片 sm:flex-1-hidden 占满剩余并形成滚动区 -->
  <div class="h-full flex flex-col gap-16px overflow-hidden lt-sm:overflow-auto">
    <NCard
      title="优惠券使用记录"
      :bordered="false"
      size="small"
      class="card-wrapper sm:flex-1 sm:min-h-0 sm:flex sm:flex-col sm:overflow-hidden"
    >
      <NForm inline class="mb-16px flex-shrink-0" label-placement="left" :label-width="80">
        <NGrid :cols="24" :x-gap="12">
          <NGridItem :span="6">
            <NFormItem label="会员ID">
              <NInput v-model:value="searchParams.memberId" placeholder="会员ID" clearable />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="6">
            <NFormItem label="模板ID">
              <NInput v-model:value="searchParams.templateId" placeholder="模板ID" clearable />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="6">
            <NFormItem label="时间范围">
              <NDatePicker
                v-model:value="searchParams.startTime"
                type="datetime"
                clearable
                placeholder="开始"
                value-format="x"
                style="width: 100%"
              />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="6">
            <NFormItem label="至">
              <NDatePicker
                v-model:value="searchParams.endTime"
                type="datetime"
                clearable
                placeholder="结束"
                value-format="x"
                style="width: 100%"
              />
            </NFormItem>
          </NGridItem>
        </NGrid>
        <NSpace>
          <NButton type="primary" @click="getData">查询</NButton>
          <NButton @click="resetSearchParams">重置</NButton>
          <NButton @click="handleExport">导出</NButton>
        </NSpace>
      </NForm>
      <div class="sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
        <NDataTable
          :columns="columns"
          :data="data"
          :flex-height="!appStore.isMobile"
          :loading="loading"
          :pagination="mobilePagination"
          :row-key="(row: any) => row.id"
          remote
          class="sm:h-full"
          @update:page="getDataByPage"
        />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.card-wrapper {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
/* 卡片内容区参与 flex，表格区域才能正确收缩并出现内部滚动 */
.card-wrapper :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
</style>
