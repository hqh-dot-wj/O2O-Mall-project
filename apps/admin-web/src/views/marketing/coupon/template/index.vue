<script setup lang="tsx">
import { ref } from 'vue';
import { NButton, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import {
  fetchDeleteCouponTemplate,
  fetchGetCouponTemplateList,
  fetchUpdateCouponTemplateStatus,
} from '@/service/api/marketing-coupon';
import { useAppStore } from '@/store/modules/app';
import { useTable, useTableOperate, useTableProps } from '@/hooks/common/table';
import { $t } from '@/locales';
import ButtonIcon from '@/components/custom/button-icon.vue';
import StatusSwitch from '@/components/custom/status-switch.vue';
import TemplateSearch from './modules/template-search.vue';
import TemplateModal from './modules/template-modal.vue';

defineOptions({
  name: 'CouponTemplateList',
});

const appStore = useAppStore();
const { bool: visible, setTrue: openModal, setFalse: closeModal } = useBoolean();
const operateType = ref<'add' | 'edit'>('add');
const rowData = ref<Api.Marketing.CouponTemplate | null>(null);

const { columns, data, getData, getDataByPage, loading, mobilePagination, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetCouponTemplateList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    name: null,
    type: null,
    status: null,
  },
  columns: () => [
    {
      key: 'name',
      title: '模板名称',
      align: 'center',
      width: 150,
    },
    {
      key: 'type',
      title: '类型',
      align: 'center',
      width: 100,
      render: (row) => {
        const tagType = row.type === 'DISCOUNT' ? 'warning' : 'info';
        const label = row.type === 'DISCOUNT' ? '代金券' : row.type === 'PERCENTAGE' ? '折扣券' : '兑换券';
        return <NTag type={tagType}>{label}</NTag>;
      },
    },
    {
      key: 'value',
      title: '面值',
      align: 'center',
      width: 100,
      render: (row) => {
        const val = row.discountAmount ?? row.discountPercent;
        if (row.type === 'DISCOUNT' && val != null) return `¥${val}`;
        if (row.type === 'PERCENTAGE' && val != null) return `${val}%`;
        return '-';
      },
    },
    {
      key: 'minOrderAmount',
      title: '门槛',
      align: 'center',
      render: (row) => {
        const min = row.minOrderAmount ?? 0;
        return min > 0 ? `满${min}可用` : '无门槛';
      },
    },
    {
      key: 'count',
      title: '发放/领取/使用',
      align: 'center',
      width: 180,
      render: (row) => (
        <span>
          {row.totalStock === -1 ? '无限' : row.totalStock} / {row.distributedCount ?? 0} / {row.usedCount ?? 0}
        </span>
      ),
    },
    {
      key: 'validity',
      title: '有效期',
      align: 'center',
      width: 200,
      render: (row) => {
        if (row.validDays) {
          return `领取后 ${row.validDays} 天有效`;
        }
        const start = row.startTime;
        const end = row.endTime;
        if (start && end) {
          const s = typeof start === 'string' ? start.split(' ')[0] : start;
          const e = typeof end === 'string' ? end.split(' ')[0] : end;
          return (
            <div class="flex-col-center">
              <span>{s}</span>
              <span>至</span>
              <span>{e}</span>
            </div>
          );
        }
        return '-';
      },
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      width: 100,
      render: (row) => (
        <StatusSwitch
          value={row.status === 'ACTIVE' ? '0' : '1'}
          onSubmitted={(val, callback) => handleStatusChange(row, val, callback)}
        />
      ),
    },
    {
      key: 'operate',
      title: $t('common.operate'),
      align: 'center',
      width: 120,
      render: (row) => (
        <div class="flex-center gap-8px">
          <ButtonIcon
            type="primary"
            class="text-primary"
            tooltipContent={$t('common.edit')}
            icon="material-symbols:edit-square-outline"
            onClick={() => handleEdit(row)}
          />
          <ButtonIcon
            type="error"
            class="text-error"
            tooltipContent={$t('common.delete')}
            icon="material-symbols:delete-outline"
            onClick={() => handleDelete(row.id)}
          />
        </div>
      ),
    },
  ],
});

async function handleStatusChange(
  row: Api.Marketing.CouponTemplate,
  val: Api.Common.EnableStatus,
  callback: (flag: boolean) => void,
) {
  try {
    const status = val === '0' ? 'ACTIVE' : 'INACTIVE';
    await fetchUpdateCouponTemplateStatus(row.id, status);
    window.$message?.success($t('common.updateSuccess'));
    callback(true);
    getData();
  } catch (error) {
    callback(false);
  }
}

function handleEdit(row: Api.Marketing.CouponTemplate & Record<string, unknown>) {
  operateType.value = 'edit';
  rowData.value = row as Api.Marketing.CouponTemplate;
  openModal();
}

async function handleDelete(id: string) {
  window.$dialog?.warning({
    title: $t('common.tip'),
    content: $t('common.confirmDelete'),
    positiveText: $t('common.confirm'),
    negativeText: $t('common.cancel'),
    onPositiveClick: async () => {
      await fetchDeleteCouponTemplate(id);
      window.$message?.success($t('common.deleteSuccess'));
      getData();
    },
  });
}

function handleAdd() {
  operateType.value = 'add';
  rowData.value = null;
  openModal();
}
</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <TemplateSearch v-model:model="searchParams" @reset="resetSearchParams" @search="getDataByPage" />
    <NCard title="优惠券模板列表" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
      <template #header-extra>
        <NButton type="primary" ghost size="small" @click="handleAdd">
          <template #icon>
            <icon-ic-round-plus class="text-icon" />
          </template>
          新增模板
        </NButton>
      </template>
      <NDataTable
        :columns="columns"
        :data="data"
        :loading="loading"
        :pagination="mobilePagination"
        remote
        :flex-height="!appStore.isMobile"
        class="sm:h-full"
      />
      <TemplateModal v-model:visible="visible" :operate-type="operateType" :row-data="rowData" @submitted="getData" />
    </NCard>
  </div>
</template>

<style scoped></style>
