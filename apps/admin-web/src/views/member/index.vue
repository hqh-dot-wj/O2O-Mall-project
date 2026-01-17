<script setup lang="tsx">
import { ref } from 'vue';
import { NAvatar, NTag } from 'naive-ui';
import { useBoolean } from '@sa/hooks';
import { fetchGetMemberList, fetchUpdateMemberStatus } from '@/service/api/member';
import { useTable, useTableOperate, useTableProps } from '@/hooks/common/table';
import { $t } from '@/locales';
import { useAppStore } from '@/store/modules/app';
import MemberOperateDrawer from './modules/member-operate-drawer.vue';
import MemberSearch from './modules/member-search.vue';
import ButtonIcon from '@/components/custom/button-icon.vue';
import StatusSwitch from '@/components/custom/status-switch.vue';

defineOptions({
  name: 'MemberList',
});

const appStore = useAppStore();

const tableProps = useTableProps();

const { bool: drawerVisible, setTrue: openDrawer, setFalse: closeDrawer } = useBoolean();
const operateType = ref<'editReferrer' | 'editTenant'>('editReferrer');
const editingData = ref<Api.Member.Member | null>(null);

const {
  columns,
  data,
  getData,
  getDataByPage,
  loading,
  mobilePagination,
  searchParams,
  resetSearchParams,
} = useTable({
  apiFn: fetchGetMemberList as any,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    nickname: null,
    mobile: null,
  } as any,
  columns: () => [
    {
      key: 'index',
      title: $t('common.index'),
      align: 'center',
      width: 48,
    },
    {
      key: 'userInfo',
      title: $t('page.member.userInfo'),
      align: 'left',
      width: 200,
      render: (row: Api.Member.Member) => {
        return (
          <div class="flex items-center gap-2">
            <NAvatar src={row.avatar} round size="small" />
            <div class="flex flex-col">
              <span>{row.nickname}</span>
              <span class="text-xs text-gray-500">{row.mobile}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'tenantName',
      title: $t('page.member.tenant'),
      align: 'center',
      width: 150,
      render: (row: Api.Member.Member) => (
        <div class="flex items-center justify-center gap-2">
            <span>{row.tenantName}</span>
            <ButtonIcon size="small" type="primary" icon="material-symbols:edit-square-outline" onClick={() => handleEditTenant(row)} />
        </div>
      )
    },
    {
      key: 'referrerName',
      title: $t('page.member.referrer'),
      align: 'center',
      width: 150,
      render: (row: Api.Member.Member) => (
         <div class="flex flex-col items-center">
            <span>{row.referrerName || '-'}</span>
            {row.referrerMobile && <span class="text-xs text-gray-500">{row.referrerMobile}</span>}
             <ButtonIcon size="small" type="primary" icon="material-symbols:edit-square-outline" onClick={() => handleEditReferrer(row)} />
         </div>
      )
    },
    {
      key: 'status',
      title: $t('page.member.status'),
      align: 'center',
      width: 100,
      render: (row: Api.Member.Member) => (
        <StatusSwitch
          value={row.status as any}
          onSubmitted={(val, callback) => handleStatusChange(row, val, callback)}
        />
      ),
    },
    {
      key: 'createTime',
      title: $t('page.member.registerTime'),
      align: 'center',
      width: 150,
    },
  ] as any,
});

function handleEditReferrer(row: Api.Member.Member) {
  operateType.value = 'editReferrer';
  editingData.value = row;
  openDrawer();
}

function handleEditTenant(row: Api.Member.Member) {
  operateType.value = 'editTenant';
  editingData.value = row;
  openDrawer();
}

async function handleStatusChange(row: Api.Member.Member, val: string | number | boolean, callback: (flag: boolean) => void) {
    const statusStr = val as string;
    try {
        await fetchUpdateMemberStatus({ memberId: row.memberId, status: statusStr });
        window.$message?.success($t('page.member.confirm.statusUpdated'));
        callback(true);
        getData();
    } catch (e) {
        callback(false);
    }
}

function handleSubmitted() {
    getData();
}

</script>

<template>
  <div class="min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
    <MemberSearch v-model:model="searchParams as any" @reset="resetSearchParams" @search="() => getDataByPage()" />
    <NCard :title="$t('page.member.title')" :bordered="false" size="small" class="card-wrapper sm:flex-1-hidden">
        <NDataTable
          :columns="columns"
          :data="data"
          :loading="loading"
          :pagination="mobilePagination"
          remote
          :flex-height="!appStore.isMobile"
          :scroll-x="1200"
          v-bind="tableProps"
          class="sm:h-full"
        />
        <MemberOperateDrawer
            v-model:visible="drawerVisible"
            :operate-type="operateType"
            :row-data="editingData"
            @submitted="handleSubmitted"
        />
    </NCard>
  </div>
</template>

