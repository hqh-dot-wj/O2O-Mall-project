<script setup lang="tsx">
import { NAvatar, NButton, NPopconfirm, NSpace, NTag } from 'naive-ui';
import {
  fetchDeleteStoreConfig,
  fetchGetStoreConfigList,
  fetchUpdateStoreConfigStatus
} from '@/service/api/marketing-config';
import { useAuthStore } from '@/store/modules/auth';
import { useTable, useTableOperate } from '@/hooks/common/table';
import ConfigSearch from './modules/config-search.vue';
import ConfigOperateDrawer from './modules/config-operate-drawer.vue';

/**
 * 营销商品配置列表 (门店端)
 *
 * @description
 * 门店运营人员在此页面创建和管理具体的营销活动。
 * 核心功能:
 * 1. 列表展示: 查看本店所有营销商品及其状态。
 * 2. 状态管理: 快速上架/下架。
 * 3. 配置入口: 打开配置抽屉，进行具体参数设置。
 */

const authStore = useAuthStore();

// 开启表格功能
const { data, loading, getData, columns, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetStoreConfigList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    storeId: undefined, // 不传 StoreId，则默认查询本租户下所有配置
    templateCode: null,
    status: null
  },
  columns: () => [
    {
      key: 'ruleName',
      title: '活动名称',
      align: 'left',
      width: 180,
      render: (row: any) => (
        <div class="flex-col">
          <span class="text-md font-bold">{row.ruleName}</span>
          <NTag type="info" bordered={false} size="small" class="mt-1 w-fit">
            {row.templateCode}
          </NTag>
        </div>
      )
    },
    {
      key: 'productName',
      title: '关联商品',
      align: 'left',
      minWidth: 200,
      render: (row: any) => (
        <div class="flex items-center gap-2">
          <NAvatar
            src={row.productImage}
            fallback-src="https://via.placeholder.com/64"
            size={48}
            class="flex-shrink-0"
          />
          <div class="flex-col">
            <span class="font-bold">{row.productName}</span>
            <div class="mt-1 flex items-center gap-1">
              <span class="text-xs text-gray-400">ID: {row.serviceId}</span>
              {row.productStatus === 'ON_SHELF' ? (
                <NTag type="success" size="small" class="origin-left scale-75">
                  已上架
                </NTag>
              ) : (
                <NTag type="error" size="small" class="origin-left scale-75">
                  已下架
                </NTag>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'config',
      title: '活动配置',
      align: 'left',
      minWidth: 160,
      render: (row: any) => {
        const rules = row.rules || {};
        return (
          <div class="flex-col gap-1 text-xs">
            {/* 价格信息 */}
            {rules.price !== undefined && (
              <div class="flex items-center">
                <span class="mr-1 text-gray-500">价格:</span>
                <span class="text-sm text-error font-bold">¥{Number(rules.price).toFixed(2)}</span>
              </div>
            )}

            {/* 时间信息 */}
            {(rules.startTime || rules.endTime) && (
              <div class="mt-1 flex-col text-gray-500">
                {rules.startTime && <div>起: {rules.startTime.split(' ')[0]}</div>}
                {rules.endTime && <div>止: {rules.endTime.split(' ')[0]}</div>}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: row => (
        <NTag type={row.status === 'ON_SHELF' ? 'success' : 'default'}>
          {row.status === 'ON_SHELF' ? '已上架' : '已下架'}
        </NTag>
      )
    },
    {
      key: 'operate',
      title: '操作',
      align: 'center',
      width: 200,
      render: row => (
        <div class="flex-center gap-8px">
          {/* 上下架切换按钮 */}
          {row.status === 'OFF_SHELF' ? (
            <NButton type="success" ghost size="small" onClick={() => handleStatus(row.id, 'ON_SHELF')}>
              上架
            </NButton>
          ) : (
            <NButton type="warning" ghost size="small" onClick={() => handleStatus(row.id, 'OFF_SHELF')}>
              下架
            </NButton>
          )}

          {/* 配置按钮 */}
          <NButton type="primary" ghost size="small" onClick={() => edit(row.id)}>
            配置
          </NButton>

          {/* 删除按钮 */}
          <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => '确认删除该商品配置吗？',
              trigger: () => (
                <NButton type="error" ghost size="small">
                  删除
                </NButton>
              )
            }}
          </NPopconfirm>
        </div>
      )
    }
  ]
});

// 表格操作 Hooks
const { handleAdd, handleEdit, drawerVisible, operateType, editingData, onDeleted } = useTableOperate(data, getData);

async function edit(id: string) {
  handleEdit('id', id);
}

async function handleDelete(id: string) {
  await fetchDeleteStoreConfig(id);
  onDeleted();
}

/**
 * 切换上架/下架状态
 */
async function handleStatus(id: string, status: string) {
  await fetchUpdateStoreConfigStatus(id, status);
  window.$message?.success(status === 'ON_SHELF' ? '上架成功' : '下架成功');
  // 刷新列表
  getData();
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard title="营销商品管理 (门店端)" :bordered="false" class="h-full">
      <div class="h-full flex-col">
        <!-- 搜索 -->
        <ConfigSearch v-model:model="searchParams" @search="getData" @reset="resetSearchParams" />

        <!-- 头部按钮 -->
        <NSpace class="mb-4">
          <NButton type="primary" @click="handleAdd">
            <template #icon>
              <icon-ic-round-plus class="text-20px" />
            </template>
            生产营销商品
          </NButton>
        </NSpace>

        <!-- 表格 -->
        <NDataTable :columns="columns" :data="data" :loading="loading" flex-height class="flex-1-hidden" />

        <!-- 配置器抽屉 -->
        <ConfigOperateDrawer
          v-model:visible="drawerVisible"
          :operate-type="operateType"
          :row-data="editingData"
          @submitted="getData"
        />
      </div>
    </NCard>
  </div>
</template>
