<script setup lang="tsx">
import { ref, watch } from 'vue';
import { NTag, NTabs, NTabPane, NButton, NSpace, NPopconfirm, NModal, NInput, NForm, NFormItem } from 'naive-ui';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableProps } from '@/hooks/common/table';
import { useBoolean } from '@sa/hooks';
import { $t } from '@/locales';
import { fetchGetWithdrawalList, fetchAuditWithdrawal } from '@/service/api/finance';
import WithdrawalSearch from './modules/withdrawal-search.vue';

defineOptions({
  name: 'FinanceWithdrawal',
});

const appStore = useAppStore();
const tableProps = useTableProps();

// 当前选中的 Tab
const activeTab = ref<string>('PENDING');

// 审核弹窗
const { bool: auditModalVisible, setTrue: openAuditModal, setFalse: closeAuditModal } = useBoolean(false);
const currentWithdrawal = ref<any>(null);
const auditAction = ref<'APPROVE' | 'REJECT'>('APPROVE');
const auditRemark = ref('');

// 状态映射
const statusRecord: Record<string, { label: string; type: NaiveUI.ThemeColor }> = {
  PENDING: { label: '待审核', type: 'warning' },
  APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已驳回', type: 'error' },
  FAILED: { label: '打款失败', type: 'error' },
};

const {
  columns,
  columnChecks,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
} = useTable({
  apiFn: fetchGetWithdrawalList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    status: 'PENDING',
  },
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 64,
    },
    {
      key: 'member',
      title: '申请人',
      align: 'center',
      minWidth: 120,
      render: (row) => (
        <div class="flex items-center gap-4px justify-center">
          {row.member?.avatar && (
            <img src={row.member.avatar} class="w-24px h-24px rounded-full" />
          )}
          <span>{row.member?.nickname || row.memberId}</span>
        </div>
      ),
    },
    {
      key: 'member',
      title: '手机号',
      align: 'center',
      minWidth: 120,
      render: (row) => row.member?.mobile || '-',
    },
    {
      key: 'amount',
      title: '提现金额',
      align: 'center',
      minWidth: 100,
      render: (row) => <span class="text-error font-bold">¥{row.amount}</span>,
    },
    {
      key: 'method',
      title: '提现方式',
      align: 'center',
      minWidth: 100,
      render: (row) => (row.method === 'WECHAT_WALLET' ? '微信钱包' : '银行卡'),
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      minWidth: 100,
      render: (row) => {
        const status = statusRecord[row.status];
        return status ? <NTag type={status.type}>{status.label}</NTag> : row.status;
      },
    },
    {
      key: 'createTime',
      title: '申请时间',
      align: 'center',
      minWidth: 160,
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 180,
      render: (row) => {
        if (row.status !== 'PENDING') {
          return <span class="text-gray-400">已处理</span>;
        }
        return (
          <NSpace justify="center">
            <NButton type="primary" size="small" onClick={() => handleAudit(row, 'APPROVE')}>
              通过
            </NButton>
            <NButton type="error" size="small" onClick={() => handleAudit(row, 'REJECT')}>
              驳回
            </NButton>
          </NSpace>
        );
      },
    },
  ],
});

// Tab 切换时更新查询参数
watch(activeTab, (val: any) => {
  searchParams.status = val;
  getDataByPage();
});

// 打开审核弹窗
function handleAudit(row: any, action: 'APPROVE' | 'REJECT') {
  currentWithdrawal.value = row;
  auditAction.value = action;
  auditRemark.value = '';
  openAuditModal();
}

// 提交审核
async function submitAudit() {
  if (!currentWithdrawal.value) return;

  try {
    await fetchAuditWithdrawal({
      withdrawalId: currentWithdrawal.value.id,
      action: auditAction.value,
      remark: auditRemark.value,
    });
    window.$message?.success(auditAction.value === 'APPROVE' ? '已通过' : '已驳回');
    closeAuditModal();
    getData();
  } catch {
    // error handled in request
  }
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <WithdrawalSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />

    <NCard :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane name="PENDING" tab="待审核">
          <!-- Table shown below -->
        </NTabPane>
        <NTabPane name="APPROVED" tab="已通过">
          <!-- Table shown below -->
        </NTabPane>
        <NTabPane name="REJECTED" tab="已驳回">
          <!-- Table shown below -->
        </NTabPane>
      </NTabs>

      <template #header-extra>
        <TableHeaderOperation
          v-model:columns="columnChecks"
          :loading="loading"
          :show-add="false"
          :show-delete="false"
          @refresh="getData"
        />
      </template>

      <NDataTable
        :columns="columns"
        :data="data"
        v-bind="tableProps"
        :flex-height="!appStore.isMobile"
        :scroll-x="1200"
        :loading="loading"
        remote
        :row-key="(row) => row.id"
        :pagination="mobilePagination"
        class="sm:h-full"
      />
    </NCard>

    <!-- 审核弹窗 -->
    <NModal
      v-model:show="auditModalVisible"
      preset="dialog"
      :title="auditAction === 'APPROVE' ? '确认通过' : '确认驳回'"
      positive-text="确认"
      negative-text="取消"
      @positive-click="submitAudit"
    >
      <div class="py-16px">
        <p class="mb-8px">
          申请人: <strong>{{ currentWithdrawal?.member?.nickname }}</strong>
        </p>
        <p class="mb-16px">
          提现金额: <strong class="text-error">¥{{ currentWithdrawal?.amount }}</strong>
        </p>
        <NForm>
          <NFormItem label="审核备注" path="remark">
            <NInput
              v-model:value="auditRemark"
              type="textarea"
              :placeholder="auditAction === 'APPROVE' ? '可选，备注信息' : '请输入驳回原因'"
              :rows="3"
            />
          </NFormItem>
        </NForm>
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.text-error {
  color: #d03050;
}
</style>
