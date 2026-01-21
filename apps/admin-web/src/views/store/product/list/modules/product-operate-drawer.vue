<script setup lang="tsx">
import { computed, reactive, watch, h } from 'vue';
import { NDrawer, NDrawerContent, NForm, NFormItem, NInput, NInputNumber, NSwitch, NDataTable, NTag, NSpace, NAlert, NButton, useMessage } from 'naive-ui';
import { fetchUpdateStoreProductPrice, fetchUpdateStoreProductBase } from '@/service/api/store/product';
import { useNaiveForm } from '@/hooks/common/form';

defineOptions({
  name: 'ProductOperateDrawer',
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.Store.TenantProduct | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const message = useMessage();

const model = reactive<Api.Store.TenantProduct>(createDefaultModel());

function createDefaultModel(): Api.Store.TenantProduct {
  return {
    id: '',
    productId: '',
    name: '',
    albumPics: '',
    type: 'REAL',
    status: 'OFF_SHELF',
    isHot: false,
    price: 0,
    customTitle: '',
    overrideRadius: undefined,
    skus: [],
  };
}

function handleInitModel() {
  Object.assign(model, createDefaultModel());

  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, JSON.parse(JSON.stringify(props.rowData)));
  }
}

watch(visible, () => {
  if (visible.value) {
    handleInitModel();
    restoreValidation();
  }
});

function calculateProfit(row: Api.Store.TenantSku) {
  const cost = Number(row.costPrice || 0);
  const price = Number(row.price || 0);
  const distRate = Number(row.distRate || 0);
  let commission = 0;
  if (row.distMode === 'RATIO') {
      commission = price * distRate;
  } else {
      commission = distRate;
  }
  return price - cost - commission;
}

async function handleSaveSku(row: Api.Store.TenantSku) {
    const profit = calculateProfit(row);
    if (profit < 0) {
        message.error(`SKU [${specsToString(row.specValues)}] 存在亏本风险，请调整！`);
        return;
    }

    try {
        await fetchUpdateStoreProductPrice({
            tenantSkuId: row.id,
            price: row.price,
            stock: row.stock,
            distRate: row.distRate,
            distMode: row.distMode
        });
        message.success('SKU 配置更新成功');
    } catch (error) {
        console.error(error);
    }
}

function specsToString(specs: any) {
    if (!specs) return '默认';
    if (typeof specs === 'object') return Object.values(specs).join(' / ');
    return String(specs);
}

const columns = [
  {
      title: '规格项',
      key: 'specValues',
      render: (row: Api.Store.TenantSku) => specsToString(row.specValues)
  },
  {
      title: '总部成本',
      key: 'costPrice',
      render: (row: Api.Store.TenantSku) => `¥${row.costPrice}`
  },
  {
      title: '售价',
      key: 'price',
      render: (row: Api.Store.TenantSku) => h(NInputNumber, {
          value: row.price,
          onUpdateValue: (v) => { row.price = v || 0 },
          size: 'small',
          style: { width: '100px' }
      })
  },
  {
      title: '库存/日限',
      key: 'stock',
      render: (row: Api.Store.TenantSku) => h(NInputNumber, {
          value: row.stock,
          onUpdateValue: (v) => { row.stock = v || 0 },
          size: 'small',
          style: { width: '80px' }
      })
  },
  {
      title: '分佣模式/额',
      key: 'distConfig',
      render: (row: Api.Store.TenantSku) => h(NSpace, { align: 'center' }, {
          default: () => [
              h(NTag, { size: 'small' }, { default: () => row.distMode }),
              h(NInputNumber, {
                  value: row.distRate,
                  onUpdateValue: (v) => { row.distRate = v || 0 },
                  size: 'small',
                  style: { width: '80px' }
              })
          ]
      })
  },
  {
      title: '利润预估',
      key: 'profit',
      render: (row: Api.Store.TenantSku) => {
          const profit = calculateProfit(row);
          return h('span', { class: profit < 0 ? 'text-red font-bold' : 'text-green font-bold' }, profit.toFixed(2));
      }
  },
  {
      title: '操作',
      key: 'action',
      render: (row: Api.Store.TenantSku) => h(NButton, {
          size: 'small',
          ghost: true,
          type: 'primary',
          onClick: () => handleSaveSku(row)
      }, { default: () => '保存SKU' })
  }
];

async function handleSubmit() {
  await validate();
  
  try {
      await fetchUpdateStoreProductBase({
          id: model.id,
          status: model.status,
          customTitle: model.customTitle || undefined,
          overrideRadius: model.overrideRadius
      });
      message.success('基础配置更新成功');
      visible.value = false;
      emit('submitted');
  } catch (error) {
      console.error(error);
  }
}

function closeDrawer() {
  visible.value = false;
}
</script>

<template>
  <NDrawer v-model:show="visible" :width="800" display-directive="show">
    <NDrawerContent :title="operateType === 'edit' ? '经营配置' : '查看商品'" native-scrollbar>
      <div class="flex flex-col gap-6">
        <!-- HQ Info -->
        <NAlert title="总部基础信息 (不可修改)" type="info">
          <div class="flex gap-4">
             <img :src="model.albumPics.split(',')[0]" class="w-20 h-20 object-cover rounded shadow" />
             <div class="flex flex-col justify-around">
                 <div class="text-lg font-bold">{{ model.name }}</div>
                 <div class="text-gray-500">类型：{{ model.type === 'REAL' ? '实物' : '服务' }}</div>
             </div>
          </div>
        </NAlert>

        <NForm ref="formRef" :model="model" label-placement="left" :label-width="100">
           <NFormItem label="门店自定义标题" path="customTitle">
             <NInput v-model:value="model.customTitle" placeholder="留空则使用总部标题" />
           </NFormItem>
           
           <NFormItem label="上架状态" path="status">
             <NSpace align="center">
                 <NSwitch 
                    v-model:value="model.status" 
                    checked-value="ON_SHELF" 
                    unchecked-value="OFF_SHELF" 
                 />
                 <NTag :type="model.status === 'ON_SHELF' ? 'success' : 'default'">
                    {{ model.status === 'ON_SHELF' ? '经营中' : '已下架' }}
                 </NTag>
             </NSpace>
           </NFormItem>

           <NFormItem label="服务半径" v-if="model.type === 'SERVICE'" path="overrideRadius">
              <NInputNumber v-model:value="model.overrideRadius" :min="0">
                  <template #suffix>米</template>
              </NInputNumber>
           </NFormItem>

           <div class="mt-4">
               <div class="font-bold mb-2">SKU 经营详情 (单独保存)</div>
               <NDataTable :columns="columns" :data="model.skus" :row-key="(row) => row.id" />
           </div>
        </NForm>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
