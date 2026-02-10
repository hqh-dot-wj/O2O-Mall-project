<script setup lang="tsx">
import { NButton, NCard, NDataTable, NPopconfirm, NTag } from 'naive-ui';
import { fetchConsumeAsset, fetchGetUserAssetList } from '@/service/api/marketing-finance';
import { useTable } from '@/hooks/common/table';

/**
 * 营销资产列表 (履约管理)
 *
 * @description
 * 查看所有发放给用户的营销资产 (如: 三人餐卷、洗车次卡)。
 * 支持手动模拟核销。
 */

const { data, loading, getData, columns } = useTable({
  apiFn: fetchGetUserAssetList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    memberId: null,
    status: null,
  },
  columns: () => [
    {
      key: 'memberId',
      title: '所属会员',
      align: 'center',
    },
    {
      key: 'assetName',
      title: '资产名称',
      align: 'center',
    },
    {
      key: 'balance',
      title: '剩余权益',
      align: 'center',
      render: (row) => <span class="text-primary font-bold">{row.balance}</span>,
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (row) => {
        const map: Record<string, { type: NaiveUI.ThemeColor; label: string }> = {
          UNUSED: { type: 'success', label: '未使用' },
          USED: { type: 'default', label: '已用完' },
          EXPIRED: { type: 'error', label: '已过期' },
          FROZEN: { type: 'warning', label: '已冻结' },
        };
        const item = map[row.status] || { type: 'default', label: row.status };
        return <NTag type={item.type}>{item.label}</NTag>;
      },
    },
    {
      key: 'expireTime',
      title: '有效期至',
      align: 'center',
      render: (row) => row.expireTime || '永久有效',
    },
    {
      key: 'operate',
      title: '操作',
      align: 'center',
      render: (row) => (
        <NPopconfirm onPositiveClick={() => handleConsume(row.id)}>
          {{
            default: () => '确定要核销 1 个单位的权益吗？',
            trigger: () => (
              <NButton type="primary" size="small" ghost disabled={row.status !== 'UNUSED'}>
                去核销
              </NButton>
            ),
          }}
        </NPopconfirm>
      ),
    },
  ],
});

async function handleConsume(id: string) {
  await fetchConsumeAsset(id, 1);
  window.$message?.success('核销成功');
  getData();
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard title="用户权益/资产管理" :bordered="false" class="h-full">
      <div class="h-full flex-col">
        <!-- TODO: Add Asset Search -->

        <NDataTable :columns="columns" :data="data" :loading="loading" flex-height class="flex-1-hidden" />
      </div>
    </NCard>
  </div>
</template>
