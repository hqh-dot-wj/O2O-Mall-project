<script setup lang="tsx">
import { h, ref } from 'vue';
import { NAvatar, NButton, NSpace, NTag } from 'naive-ui';
import { fetchApproveUpgrade, fetchGetUpgradeApplyList } from '@/service/api/member-upgrade';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate } from '@/hooks/common/table';
import { $t } from '@/locales';
import UpgradeSearch from './modules/upgrade-search.vue';

defineOptions({
  name: 'UpgradeApplyList'
});

const appStore = useAppStore();

const { columns, data, getData, getDataByPage, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetUpgradeApplyList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: undefined,
    status: undefined,
    applyType: undefined
  },
  columns: () => [
    {
      key: 'member',
      title: '申请人',
      align: 'left',
      width: 180,
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
      key: 'fromLevel',
      title: '等级变更',
      align: 'center',
      width: 150,
      render: row => (
        <div class="flex items-center justify-center gap-2">
          <NTag size="small">{row.fromLevelName}</NTag>
          <icon-mdi-arrow-right class="text-gray-400" />
          <NTag type="success" size="small">
            {row.toLevelName}
          </NTag>
        </div>
      )
    },
    {
      key: 'applyType',
      title: '申请类型',
      align: 'center',
      width: 120,
      render: row => {
        const map: Record<string, string> = {
          PRODUCT_PURCHASE: '商品购买',
          REFERRAL_CODE: '扫码申请',
          MANUAL_ADJUST: '手动调整'
        };
        return <NTag bordered={false}>{map[row.applyType] || row.applyType}</NTag>;
      }
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
          PENDING: '待审批',
          APPROVED: '已通过',
          REJECTED: '已驳回'
        };
        return <NTag type={typeMap[row.status]}>{labelMap[row.status]}</NTag>;
      }
    },
    {
      key: 'createTime',
      title: '申请时间',
      align: 'center',
      width: 160
    },
    {
      key: 'operate',
      title: '操作',
      align: 'center',
      width: 180,
      render: row => {
        if (row.status !== 'PENDING') return null;
        return (
          <NSpace justify="center">
            <NButton type="primary" size="small" ghost onClick={() => handleApprove(row)}>
              通过
            </NButton>
            <NButton type="error" size="small" ghost onClick={() => handleReject(row)}>
              驳回
            </NButton>
          </NSpace>
        );
      }
    }
  ]
});

async function handleApprove(row: Api.Member.UpgradeApply) {
  window.$dialog?.warning({
    title: '审批通过',
    content: `确认将会员 ${row.member?.nickname} 升级为 ${row.toLevelName}?`,
    positiveText: '确认通过',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await fetchApproveUpgrade(row.id, { action: 'approve' });
        window.$message?.success('操作成功');
        getData();
      } catch (error) {
        // error handled by request interceptor
      }
    }
  });
}

function handleReject(row: Api.Member.UpgradeApply) {
  // Simple prompt for reason, or could be a modal
  window.$dialog?.warning({
    title: '审批驳回',
    content: '确认驳回该申请吗？',
    positiveText: '确认驳回',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await fetchApproveUpgrade(row.id, { action: 'reject', reason: '管理员驳回' });
        window.$message?.success('已驳回');
        getData();
      } catch (error) {
        // error handled
      }
    }
  });
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <UpgradeSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard title="升级申请列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="mobilePagination"
        remote
        :flex-height="!appStore.isMobile"
        :scroll-x="1000"
        class="sm:h-full"
      />
    </NCard>
  </div>
</template>
