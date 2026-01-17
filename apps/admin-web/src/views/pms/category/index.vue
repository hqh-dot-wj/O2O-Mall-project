<script setup lang="tsx">
import { computed, ref, watch } from 'vue';
import type { DataTableColumns, TreeOption } from 'naive-ui';
import { NButton, NCard, NDataTable, NDescriptions, NDescriptionsItem, NEmpty, NImage, NInput, NPopconfirm, NSpace, NSpin, NTag, NTree } from 'naive-ui';
import { useBoolean, useLoading } from '@sa/hooks';
import { fetchGetCategoryTree, fetchGetCategoryList, fetchDeleteCategory } from '@/service/api/pms/category';
import { useAppStore } from '@/store/modules/app';
import { useTableProps } from '@/hooks/common/table';
import { $t } from '@/locales';
import SvgIcon from '@/components/custom/svg-icon.vue';
import ButtonIcon from '@/components/custom/button-icon.vue';
import CategoryOperateDrawer from './modules/category-operate-drawer.vue';

defineOptions({
  name: 'PmsCategory',
});

const appStore = useAppStore();
const tableProps = useTableProps();

const { loading, startLoading, endLoading } = useLoading();
const { loading: subLoading, startLoading: startSubLoading, endLoading: endSubLoading } = useLoading();
const { bool: drawerVisible, setTrue: openDrawer } = useBoolean();

const name = ref<string>();
const treeData = ref<Api.Pms.Category[]>([]);
const currentCategory = ref<Api.Pms.Category>();
const subCategories = ref<Api.Pms.Category[]>([]);
const operateType = ref<NaiveUI.TableOperateType>('add');
const editingData = ref<Api.Pms.Category | null>(null);

const expandedKeys = ref<CommonType.IdType[]>([]);
const selectedKeys = ref<CommonType.IdType[]>([]);

async function getCategoryTree() {
  startLoading();
  try {
    const { data } = await fetchGetCategoryTree();
    treeData.value = [
      {
        catId: 0,
        name: $t('page.pms.category.title'),
        level: 0,
        sort: 0,
        children: data || []
      }
    ] as any;
    // Default expand root
    if (expandedKeys.value.length === 0) {
      expandedKeys.value = [0];
    }
  } catch (error) {
    // handled by interceptor
  } finally {
    endLoading();
  }
}

async function getSubCategories() {
  if (currentCategory.value === undefined) {
    subCategories.value = [];
    return;
  }
  startSubLoading();
  try {
    const { data } = await fetchGetCategoryList({ parentId: currentCategory.value.catId });
    subCategories.value = data?.rows || [];
  } catch (error) {
    // handled by interceptor
  } finally {
    endSubLoading();
  }
}

function handleClickTree(keys: CommonType.IdType[], options: Array<TreeOption | null>) {
  const option = options[0] as unknown as Api.Pms.Category;
  if (!option || option.catId === 0) {
    currentCategory.value = undefined;
    selectedKeys.value = [];
    return;
  }
  currentCategory.value = option;
  selectedKeys.value = [option.catId];
  getSubCategories();
}

function handleAddRoot() {
  operateType.value = 'add';
  editingData.value = null;
  openDrawer();
}

function handleAddSub(row?: Api.Pms.Category) {
  operateType.value = 'add';
  editingData.value = row || currentCategory.value || null;
  openDrawer();
}

function handleEdit(row?: Api.Pms.Category) {
  operateType.value = 'edit';
  editingData.value = row || currentCategory.value || null;
  openDrawer();
}

async function handleDelete(id?: number) {
  const targetId = id || currentCategory.value?.catId;
  if (!targetId) return;
  
  await fetchDeleteCategory(targetId);
  window.$message?.success($t('common.deleteSuccess'));
  
  if (id) {
    getSubCategories();
  } else {
    currentCategory.value = undefined;
    selectedKeys.value = [];
  }
  getCategoryTree();
}

const columns: DataTableColumns<Api.Pms.Category> = [
  {
    key: 'catId',
    title: 'ID',
    width: 80,
  },
  {
    key: 'name',
    title: $t('page.pms.category.categoryName'),
    minWidth: 150,
  },
  {
    key: 'icon',
    title: $t('page.pms.category.icon'),
    width: 100,
    render: (row) => {
      if (!row.icon) return null;
      return <NImage src={row.icon} width={40} height={40} class="rounded shadow-sm" />;
    },
  },
  {
    key: 'sort',
    title: $t('common.sort'),
    width: 80,
  },
  {
    key: 'bindType',
    title: $t('page.pms.category.bindType'),
    width: 100,
    render: (row) => {
      if (!row.bindType) return null;
      const typeMap: Record<string, 'success' | 'info'> = {
        REAL: 'success',
        SERVICE: 'info',
      };
      const labelMap: Record<string, string> = {
        REAL: $t('page.pms.category.realProduct'),
        SERVICE: $t('page.pms.category.serviceProduct'),
      };
      return <NTag type={typeMap[row.bindType]}>{labelMap[row.bindType]}</NTag>;
    },
  },
  {
    key: 'attrTemplate',
    title: $t('page.pms.category.attributeTemplate'),
    width: 150,
    render: (row) => row.attrTemplate?.name || '-'
  },
  {
    key: 'operate',
    title: $t('common.operate'),
    align: 'center',
    width: 150,
    render: (row) => (
      <NSpace justify="center">
        <ButtonIcon
          text
          type="primary"
          icon="material-symbols:drive-file-rename-outline-outline"
          tooltipContent={$t('common.edit')}
          onClick={() => handleEdit(row)}
        />
        <ButtonIcon
          text
          type="error"
          icon="material-symbols:delete-outline"
          tooltipContent={$t('common.delete')}
          popconfirmContent={$t('common.confirmDelete')}
          onPositiveClick={() => handleDelete(row.catId)}
        />
      </NSpace>
    ),
  },
];

const categoryTreeRef = ref();

getCategoryTree();

function handleSubmitted() {
  getCategoryTree();
  if (currentCategory.value) {
    if (operateType.value === 'edit') {
      // Find the updated category in the tree if it's the current one
      // Simplified: we can just re-fetch if we had a getCategoryDetail, 
      // but since we have the data in tree, we'll just update from tree or let user re-click.
      // For now, let's just refresh subcategories if it was an add-sub.
    }
    getSubCategories();
  }
}
</script>

<template>
  <TableSiderLayout :sider-title="$t('page.pms.category.title')">
    <template #header-extra>
      <ButtonIcon
        size="small"
        icon="material-symbols:add-rounded"
        class="h-28px text-icon color-primary"
        :tooltip-content="$t('page.pms.category.addCategory')"
        @click.stop="handleAddRoot"
      />
      <ButtonIcon
        size="small"
        icon="material-symbols:refresh-rounded"
        class="h-28px text-icon"
        :tooltip-content="$t('common.refresh')"
        @click.stop="getCategoryTree"
      />
    </template>
    <template #sider>
      <NInput v-model:value="name" clearable :placeholder="$t('common.keywordSearch')" />
      <NSpin :show="loading" class="category-spin">
        <NTree
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          block-node
          show-line
          :data="treeData as []"
          :show-irrelevant-nodes="false"
          :pattern="name"
          class="category-tree h-full min-h-200px py-3"
          key-field="catId"
          label-field="name"
          selectable
          @update:selected-keys="handleClickTree"
        >
          <template #empty>
            <NEmpty :description="$t('common.noData')" class="h-full min-h-200px justify-center" />
          </template>
        </NTree>
      </NSpin>
    </template>

    <div class="h-full flex-col-stretch gap-16px overflow-hidden">
      <template v-if="currentCategory">
        <NCard
          :title="$t('page.pms.category.categoryDetail')"
          :bordered="false"
          size="small"
          class="card-wrapper"
        >
          <template #header-extra>
            <NSpace>
              <NButton size="small" ghost type="primary" @click="handleAddSub()">
                <template #icon>
                  <icon-material-symbols-add-rounded />
                </template>
                {{ $t('page.pms.category.addSubCategory') }}
              </NButton>
              <NButton size="small" ghost type="primary" @click="handleEdit()">
                <template #icon>
                  <icon-material-symbols-drive-file-rename-outline-outline />
                </template>
                {{ $t('common.edit') }}
              </NButton>
              <NPopconfirm @positive-click="() => handleDelete()">
                <template #trigger>
                  <NButton size="small" ghost type="error" :disabled="subCategories.length > 0">
                    <template #icon>
                      <icon-material-symbols-delete-outline />
                    </template>
                    {{ $t('common.delete') }}
                  </NButton>
                </template>
                {{ $t('common.confirmDelete') }}
              </NPopconfirm>
            </NSpace>
          </template>
          <NDescriptions bordered label-placement="left" :column="appStore.isMobile ? 1 : 2">
            <NDescriptionsItem label="ID">{{ currentCategory.catId }}</NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.pms.category.categoryName')">{{ currentCategory.name }}</NDescriptionsItem>
            <NDescriptionsItem :label="$t('common.sort')">{{ currentCategory.sort }}</NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.pms.category.bindType')">
              <NTag v-if="currentCategory.bindType" :type="currentCategory.bindType === 'REAL' ? 'success' : 'info'">
                {{ currentCategory.bindType === 'REAL' ? $t('page.pms.category.realProduct') : $t('page.pms.category.serviceProduct') }}
              </NTag>
              <span v-else>-</span>
            </NDescriptionsItem>
            <NDescriptionsItem :label="$t('page.pms.category.attributeTemplate')">
              {{ currentCategory.attrTemplate?.name || '-' }}
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <NCard
          :title="$t('page.pms.category.subCategoryList')"
          :bordered="false"
          size="small"
          class="h-0 flex-1 card-wrapper"
        >
          <template #header-extra>
            <ButtonIcon
              size="small"
              icon="material-symbols:refresh-rounded"
              class="h-28px text-icon"
              :tooltip-content="$t('common.refresh')"
              @click.stop="getSubCategories"
            />
          </template>
          <NDataTable
            :loading="subLoading"
            :columns="columns"
            :data="subCategories"
            v-bind="tableProps"
            flex-height
            class="h-full"
            :row-key="(row) => row.catId"
          />
        </NCard>
      </template>
      <NCard v-else :bordered="false" size="small" class="h-full card-wrapper">
        <NEmpty class="h-full flex-center" size="large" />
      </NCard>
    </div>

    <CategoryOperateDrawer
      v-model:visible="drawerVisible"
      :operate-type="operateType"
      :row-data="editingData"
      @submitted="handleSubmitted"
    />
  </TableSiderLayout>
</template>

<style scoped lang="scss">
.category-spin {
  height: calc(100vh - 228px - var(--calc-footer-height, 0px)) !important;
  :deep(.n-spin-content) {
    height: 100%;
  }
}
</style>
