<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { NCard, NCheckboxGroup, NCheckbox, NInput, NInputNumber, NDataTable, NButton, NTag, NDivider, NDynamicTags, NSelect, NSpace, useMessage } from 'naive-ui';
// 引入 h 函数，用于在 TypeScript 中编写渲染逻辑 (如 NDataTable 的 render 选项)
import { h } from 'vue';
import type { ProductForm } from '../model';

defineOptions({ name: 'Step3Sku' });

/**
 * DefineProps: 定义组件接收的属性
 * @property formModel - 表单数据模型，双向绑定用于存储生成的 SKU 数据
 * @property attributes - 从父组件传递过来的所有属性列表，用于筛选规格属性
 */
const props = defineProps<{
  formModel: ProductForm;
  attributes: Api.Pms.AttributeItem[]; 
}>();

/**
 * DefineEmits: 定义组件触发的事件
 * @event prev - 返回上一步
 * @event next - 进入下一步
 */
const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();

/**
 * 计算属性: 筛选规格属性
 * 从所有属性中过滤出 usageType 为 'SPEC' (规格) 的属性
 * 这些属性将用于构建 SKU 的不同维度 (如颜色、尺寸)
 */
const specAttributes = computed(() => {
  return props.attributes.filter(attr => attr.usageType === 'SPEC');
});

/**
 * 响应式状态: SelectedSpecs
 * 用于存储用户在界面上选中的规格值
 * 结构: { [规格名称]: [选中的值1, 选中的值2] }
 * 例如: { "颜色": ["红色", "蓝色"], "尺寸": ["M", "L"] }
 */
const selectedSpecs = ref<Record<string, string[]>>({});
const message = useMessage();

// Initialize selectedSpecs from formModel.specDef if returning to this step
// formModel.specDef: [{ name: 'Color', values: ['Red'] }]
// We should sync them.
// TODO: 如果需要支持从上一步返回并回显已选规格，需要在此处初始化 selectedSpecs

/**
 * 监听 selectedSpecs 的变化
 * 当用户修改选中的规格时，自动重新生成 SKU 列表
 * @param {object} val - 变化后的规格选择对象
 * @param {object} old - 旧值
 */
watch(selectedSpecs, () => {
  generateSkus();
}, { deep: true });

/**
 * 核心方法: 生成 SKU 列表
 * 基于选中的规格属性及其值，计算笛卡尔积，生成所有可能的 SKU 组合
 */
function generateSkus() {
  // 1. 将 selectedSpecs 对象转换为 entries 数组，并过滤掉未选择值的规格
  // 结果示例: [['颜色', ['红色', '蓝色']], ['尺寸', ['M', 'L']]]
  const entries = Object.entries(selectedSpecs.value)
    .filter(([_, values]) => values && values.length > 0);
  
  // 更新表单模型中的 specDef，记录当前的规格定义
  props.formModel.specDef = entries.map(([name, values]) => ({ name, values }));

  // 如果没有有效选择，清空 SKU 列表并返回
  if (entries.length === 0) {
    props.formModel.skus = [];
    return;
  }

  // 2. 准备进行笛卡尔积计算的数据
  // names: ['颜色', '尺寸']
  // valueLists: [['红色', '蓝色'], ['M', 'L']]
  const names = entries.map(e => e[0]);
  const valueLists = entries.map(e => e[1]);

  const combinations = cartesian(valueLists);

  // 3. 生成最终的 SKU 对象列表
  // 为了保留用户之前输入的数据 (如价格、库存)，我们需要对比新旧 SKU
  const oldSkusMap = new Map<string, any>();
  props.formModel.skus.forEach((sku: any) => {
    // 使用规格值的 JSON 字符串作为 Key 来标识 SKU
    oldSkusMap.set(JSON.stringify(sku.specValues), sku);
  });

  const newSkus = combinations.map(comboValues => {
    const specValues: Record<string, any> = {};
    // 将组合值映射回规格名称
    // comboValues: ['红色', 'M'] -> specValues: { '颜色': '红色', '尺寸': 'M' }
    comboValues.forEach((val: string, idx: number) => {
      specValues[names[idx]] = val;
    });

    // 检查是否已存在相同的 SKU (保留原有数据)
    const key = JSON.stringify(specValues);
    const existing = oldSkusMap.get(key);

    if (existing) {
      return existing;
    }
    
    // 如果是新组合，初始化一个 SKU 对象
    return {
      specValues,
      guidePrice: 0, // 指导价
      stock: 0,      // 库存
      guideRate: 0,  // 导购费率
      minDistRate: 0, // 最低比例
      maxDistRate: 50, // 最高比例
      distMode: 'NONE', // 分销模式
      skuCode: '',   // SKU 编码
      pic: '',       // 图片
      costPrice: 0   // 成本价
    };
  });

  // 更新表单模型的 SKU 列表
  props.formModel.skus = newSkus;
}

/**
 * 算法辅助函数: 笛卡尔积
 * 输入: [['A', 'B'], ['1', '2']]
 * 输出: [['A', '1'], ['A', '2'], ['B', '1'], ['B', '2']]
 * 用于生成多规格的所有组合
 */
function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce((acc, curr) => {
    return acc.flatMap(x => curr.map(y => [...x, y]));
  }, [[]] as string[][]);
}

/**
 * 辅助函数: 获取属性的可选项
 * 处理从后端获取的 inputList 字符串 (逗号分隔)
 */
function getAttrOptions(attr: Api.Pms.AttributeItem): string[] {
  if (attr.inputList) {
    return attr.inputList.split(',').filter(Boolean);
  }
  return [];
}

const distModeOptions = [
  { label: '不分销', value: 'NONE' },
  { label: '按比例(%)', value: 'RATIO' },
  { label: '固定金额(元)', value: 'FIXED' } // Fixed amount
];

const batchMinRate = ref(0);
const batchMaxRate = ref(50);

function applyBatchMin() {
  if (props.formModel.skus.length === 0) return;
  props.formModel.skus.forEach(sku => {
    sku.minDistRate = batchMinRate.value;
  });
  message.success('已批量设置最低分佣');
}

function applyBatchMax() {
  if (props.formModel.skus.length === 0) return;
  props.formModel.skus.forEach(sku => {
    sku.maxDistRate = batchMaxRate.value;
  });
  message.success('已批量设置最高分佣');
}

function handleNext() {
    for (const sku of props.formModel.skus) {
        if (sku.distMode === 'NONE') continue;
        
        const specName = Object.values(sku.specValues).join('/');
        
        if (Number(sku.guideRate) < Number(sku.minDistRate)) {
            message.error(`SKU [${specName}] 指导分佣 (${sku.guideRate}) 不能低于下限 (${sku.minDistRate})`);
            return;
        }
        if (Number(sku.guideRate) > Number(sku.maxDistRate)) {
            message.error(`SKU [${specName}] 指导分佣 (${sku.guideRate}) 不能高于上限 (${sku.maxDistRate})`);
            return;
        }
    }
    emit('next');
}

/**
 * 计算属性: 表格列定义
 * 根据当前的规格定义动态生成表格列，同时加上固定的编辑列
 */
const columns = computed(() => {
    const cols: any[] = [];
    // 1. 动态生成规格列
    // 根据 specDef 中的规格名生成列
    const rawSpecDef = props.formModel.specDef;
    const specList = Array.isArray(rawSpecDef) ? rawSpecDef : [];
    const specKeys = specList.map(d => d.name);
    
    specKeys.forEach(key => {
        cols.push({
            title: key,
            key: key,
            // 渲染该行对应的规格值
            render: (row: any) => row.specValues[key]
        });
    });

    // 2. 添加静态固定列: 指导价、库存、SKU编号
    cols.push(
        { title: '指导价', key: 'guidePrice', render(row: any, idx: number) {
             // 使用 h 函数渲染 NInputNumber 组件
             return h(NInputNumber, { 
                value: row.guidePrice, 
                // 直接更新 formModel 中的数据
                onUpdateValue: (v: number | null) => props.formModel.skus[idx].guidePrice = v || 0,
                min: 0, precision: 2, size: 'small', showButton: false
            });
        }},
        { title: '库存', key: 'stock', render(row: any, idx: number) {
             return h(NInputNumber, { 
                value: row.stock, 
                onUpdateValue: (v: number | null) => props.formModel.skus[idx].stock = v || 0,
                min: 0, size: 'small', showButton: false
            });
        }},
         { title: 'SKU编号', key: 'skuCode', render(row: any, idx: number) {
             return h(NInput, { 
                value: row.skuCode, 
                onUpdateValue: (v: string) => props.formModel.skus[idx].skuCode = v,
                size: 'small'
            });
        }},
        { title: '分销模式', key: 'distMode', width: 140, render(row: any, idx: number) {
             return h(NSelect, {
                value: row.distMode,
                options: distModeOptions,
                onUpdateValue: (v: any) => props.formModel.skus[idx].distMode = v,
                size: 'small'
            });
        }},
        { title: '分佣下限', key: 'minDistRate', width: 110, render(row: any, idx: number) {
             const isRatio = row.distMode === 'RATIO';
             const isFixed = row.distMode === 'FIXED';
             const isNone = row.distMode === 'NONE';
             return h(NInputNumber, {
                value: row.minDistRate,
                onUpdateValue: (v: number | null) => props.formModel.skus[idx].minDistRate = v || 0,
                min: 0,
                disabled: isNone,
                precision: 2,
                size: 'small',
                showButton: false,
                placeholder: '下限',
                suffix: () => isRatio ? '%' : (isFixed ? '元' : '')
            });
        }},
        { title: '指导分佣', key: 'guideRate', width: 110, render(row: any, idx: number) {
             const isRatio = row.distMode === 'RATIO';
             const isFixed = row.distMode === 'FIXED';
             const isNone = row.distMode === 'NONE';
             return h(NInputNumber, {
                value: row.guideRate,
                onUpdateValue: (v: number | null) => props.formModel.skus[idx].guideRate = v || 0,
                min: 0,
                disabled: isNone,
                precision: 2,
                size: 'small',
                showButton: false,
                placeholder: '建议',
                status: (row.guideRate < row.minDistRate || row.guideRate > row.maxDistRate) ? 'error' : 'success',
                suffix: () => isRatio ? '%' : (isFixed ? '元' : '')
            });
        }},
        { title: '分佣上限', key: 'maxDistRate', width: 110, render(row: any, idx: number) {
             const isRatio = row.distMode === 'RATIO';
             const isFixed = row.distMode === 'FIXED';
             const isNone = row.distMode === 'NONE';
             return h(NInputNumber, {
                value: row.maxDistRate,
                onUpdateValue: (v: number | null) => props.formModel.skus[idx].maxDistRate = v || 0,
                min: 0,
                disabled: isNone,
                precision: 2,
                size: 'small',
                showButton: false,
                placeholder: '上限',
                suffix: () => isRatio ? '%' : (isFixed ? '元' : '')
            });
        }}
    );
    return cols;
});

</script>

<template>
  <div class="max-w-5xl mx-auto p-6">
    <NCard title="规格设置" bordered class="mb-4">
      <!-- 遍历所有规格属性，生成选择区域 -->
      <div v-for="attr in specAttributes" :key="attr.attrId" class="mb-6">
        <h4 class="font-bold mb-2">{{ attr.name }}</h4>
        
        <!-- 输入类型 1: 从列表中选择 -->
        <div v-if="attr.inputType === 1">
           <NCheckboxGroup v-model:value="selectedSpecs[attr.name]">
              <div class="flex gap-4 flex-wrap">
                  <NCheckbox v-for="opt in getAttrOptions(attr)" :key="opt" :value="opt" :label="opt" />
              </div>
           </NCheckboxGroup>
        </div>
        
        <!-- 输入类型 2: 手工录入 (使用动态标签组件) -->
        <div v-else>
           <NDynamicTags v-model:value="selectedSpecs[attr.name]" />
        </div>
        <NDivider />
      </div>

      <!-- SKU 列表展示区域 -->
      <div v-if="formModel.skus.length > 0" class="mt-4">
         <div class="flex items-center justify-between mb-2">
            <h4 class="font-bold">详细列表 (共 {{ formModel.skus.length }} 个)</h4>
            <NSpace>
                <NInputNumber v-model:value="batchMinRate" size="small" placeholder="批量下限" :min="0" :precision="2" :show-button="false">
                    <template #prefix>Min:</template>
                </NInputNumber>
                <NButton size="small" @click="applyBatchMin">应用下限</NButton>
                
                <NInputNumber v-model:value="batchMaxRate" size="small" placeholder="批量上限" :min="0" :precision="2" :show-button="false">
                      <template #prefix>Max:</template>
                </NInputNumber>
                <NButton size="small" @click="applyBatchMax">应用上限</NButton>
            </NSpace>
         </div>
         <!-- 动态表格，列由 columns 计算属性定义 -->
         <NDataTable :columns="columns" :data="formModel.skus" :pagination="false" size="small" />
      </div>
      <div v-else class="text-gray-400">
        请勾选上方规格生成 SKU 列表
      </div>

      <!-- 底部操作按钮 -->
      <div class="flex justify-between mt-6">
        <NButton @click="emit('prev')">上一步</NButton>
        <NButton type="primary" @click="handleNext" :disabled="formModel.skus.length === 0">下一步，详细参数</NButton>
      </div>
    </NCard>
  </div>
</template>
