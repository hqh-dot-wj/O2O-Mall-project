<script setup lang="tsx">
import { NButton, NPopconfirm, NSpace, NTag } from 'naive-ui';
import { fetchDeleteTemplate, fetchGetTemplateList } from '@/service/api/marketing';
import { useTable, useTableOperate } from '@/hooks/common/table';
import TemplateSearch from './modules/template-search.vue';
import TemplateOperateDrawer from './modules/template-operate-drawer.vue';

/**
 * 营销玩法模板列表页
 *
 * @description
 * 总部运营人员在此管理所有的营销玩法模板 (如: 拼团、砍价)。
 * 主要功能:
 * 1. 列表展示: 查看所有已定义的模板。
 * 2. 增删改查: 通过抽屉组件进行操作。
 * 3. 规则定义: 每个模板包含一个 JSON Schema 用于定义门店配置时的表单结构。
 */

// 开启表格功能 (Hooks)
const { data, loading, getData, columns, searchParams, resetSearchParams } = useTable({
  apiFn: fetchGetTemplateList,
  apiParams: {
    pageNum: 1,
    pageSize: 10,
    code: null,
    name: null
  },
  columns: () => [
    {
      type: 'selection',
      align: 'center',
      width: 48
    },
    {
      key: 'code',
      title: '玩法编码',
      align: 'center',
      // 显示为代码块风格
      render: row => (
        <NTag type="info" bordered={false} class="font-mono">
          {row.code}
        </NTag>
      )
    },
    {
      key: 'name',
      title: '玩法名称',
      align: 'center'
    },
    {
      key: 'unitName',
      title: '计量单位',
      align: 'center',
      render: row => (
        <NTag type="success" size="small">
          {row.unitName}
        </NTag>
      )
    },
    {
      key: 'createTime',
      title: '创建时间',
      align: 'center'
    },
    {
      key: 'operate',
      title: '操作',
      align: 'center',
      width: 130,
      render: row => (
        <div class="flex-center gap-8px">
          {/* 编辑按钮 */}
          <NButton type="primary" ghost size="small" onClick={() => edit(row.id)}>
            编辑
          </NButton>

          {/* 删除确认 */}
          <NPopconfirm onPositiveClick={() => handleDelete(row.id)}>
            {{
              default: () => '确认要删除该模板吗？删除后关联的门店配置可能无法正常工作。',
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

// 开启表格操作 Hooks (增删改逻辑封装)
const { handleAdd, handleEdit, drawerVisible, operateType, editingData, onDeleted } = useTableOperate(data, getData);

async function edit(id: string) {
  handleEdit('id', id);
}

async function handleDelete(id: string) {
  await fetchDeleteTemplate(id);
  onDeleted();
}
</script>

<template>
  <div class="h-full overflow-hidden">
    <NCard title="玩法模板管理" :bordered="false" class="h-full">
      <div class="h-full flex-col">
        <!-- 顶部搜索栏 -->
        <TemplateSearch v-model:model="searchParams" @search="getData" @reset="resetSearchParams" />

        <!-- 操作工具栏 -->
        <NSpace class="mb-4">
          <NButton type="primary" @click="handleAdd">
            <template #icon>
              <icon-ic-round-plus class="text-20px" />
            </template>
            新增模板
          </NButton>
        </NSpace>

        <!--主要数据表格 -->
        <NDataTable :columns="columns" :data="data" :loading="loading" flex-height class="flex-1-hidden" />

        <!-- 编辑/新增 抽屉 -->
        <TemplateOperateDrawer
          v-model:visible="drawerVisible"
          :operate-type="operateType"
          :row-data="editingData"
          @submitted="getData"
        />
      </div>
    </NCard>
  </div>
</template>
