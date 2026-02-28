<script setup lang="tsx">
import { h } from 'vue';
import { NAvatar, NButton, NCard, NDataTable, NSpace, NTag } from 'naive-ui';
import { fetchGetApplicationList, reviewApplication } from '@/service/api/distribution';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import ApplicationSearch from './modules/application-search.vue';

defineOptions({
  name: 'DistributionApplication'
});

const { columns, data, getData, getDataByPage, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetApplicationList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: undefined,
    status: undefined
  },
  columns: () => [
    {
      key: 'member',
      title: '申请人',
      align: 'left',
      width: 200,
      render: row => (
        <div class="flex items-center gap-2">
          <NAvatar src={row.member?.avatar} round size="small" />
          <div class="flex flex-col">
            <span>{row.member?.nickname || row.memberId}</span>
            <span class="text-xs text-gray-500">{row.member?.mobile}</span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 100,
      render: row => {
        const typeMap: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
          PENDING: 'warning',
          APPROVED: 'success',
          REJECTED: 'error'
        };
        const labelMap: Record<string, string> = {
          PENDING: '待审核',
          APPROVED: '已通过',
          REJECTED: '已驳回'
        };
        return <NTag type={typeMap[row.status]}>{labelMap[row.status]}</NTag>;
      }
    },
    {
      key: 'reason',
      title: '审核备注',
      align: 'center',
      minWidth: 150
    },
    {
      key: 'createTime',
      title: '申请时间',
      align: 'center',
      width: 170
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 160,
      render: row => {
        if (row.status !== 'PENDING') return null;
        return (
          <NSpace justify="center">
            <NButton type="primary" ghost size="small" onClick={() => handleReview(row, 'approve')}>
              通过
            </NButton>
            <NButton type="error" ghost size="small" onClick={() => handleReview(row, 'reject')}>
              驳回
            </NButton>
          </NSpace>
        );
      }
    }
  ]
});

async function handleReview(row: Api.Store.Application, action: 'approve' | 'reject') {
  const isApprove = action === 'approve';
  window.$dialog?.warning({
    title: isApprove ? '通过申请' : '驳回申请',
    content: isApprove ? `确认通过会员 ${row.member?.nickname} 的分销员申请吗？` : '请确认是否驳回该申请？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await reviewApplication(row.id, {
          status: isApprove ? 'APPROVED' : 'REJECTED',
          reason: isApprove ? '审核通过' : '不符合要求'
        });
        window.$message?.success('操作成功');
        getData();
      } catch (error) {
        console.error(error);
      }
    }
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <ApplicationSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard title="分销员申请列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="mobilePagination"
        remote
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>

<style scoped></style>
