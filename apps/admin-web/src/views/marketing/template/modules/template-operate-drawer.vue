<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  NButton,
  NCard,
  NDrawer,
  NDrawerContent,
  NDynamicInput,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui';
import { fetchCreateTemplate, fetchUpdateTemplate } from '@/service/api/marketing';
import { useNaiveForm } from '@/hooks/common/form';
import ProductSelectModal from '@/components/business/product-select-modal.vue';

defineOptions({ name: 'TemplateOperateDrawer' });

/**
 * 模板操作抽屉组件
 *
 * @description
 * 包含两个核心部分：
 * 1. 基础信息表单 (名称、编码、单位)
 * 2. 规则定义器 (Schema Builder): 允许动态添加/删除规则字段。
 *    这些字段定义了门店在配置此玩法时，必须填写的参数 (如: 拼团人数)。
 */

interface Props {
  /** 操作类型: 新增 | 编辑 */
  operateType: NaiveUI.TableOperateType;
  /** 编辑时的数据对象 */
  rowData?: Api.Marketing.PlayTemplate | null;
}

const props = defineProps<Props>();

interface Emits {
  /** 提交成功后触发 */
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

// 抽屉可见性 (双向绑定)
const visible = defineModel<boolean>('visible', { default: false });

// 表单 Hooks
const { formRef, validate, restoreValidation } = useNaiveForm();

// 动态标题
const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增玩法模板',
    edit: '编辑玩法模板'
  };
  return titles[props.operateType];
});

// 表单数据模型
const model = reactive<Api.Marketing.PlayTemplateCreate>({
  code: '',
  name: '',
  unitName: '',
  ruleSchema: {
    fields: []
  },
  uiComponentId: ''
});

// 动态表单项列表 (Schema Builder 的数据源)
const schemaFields = reactive<Api.Marketing.SchemaField[]>([]);

// 支持的字段类型选项
const fieldTypeOptions = [
  { label: '数字 (Number)', value: 'number' },
  { label: '文本 (String)', value: 'string' },
  { label: '布尔 (Boolean)', value: 'boolean' },
  { label: '日期时间 (Datetime)', value: 'datetime' },
  { label: '日期 (Date)', value: 'date' },
  { label: '时间 (Time)', value: 'time' },
  { label: '地址 (Address)', value: 'address' },
  { label: '日期范围 (DateRange)', value: 'daterange' },
  { label: '日期时间范围 (DateTimeRange)', value: 'datetimerange' }
];

// 商品选择模态框
const productModalVisible = ref(false);
const selectedProduct = ref<any>(null);

/**
 * 打开商品选择模态框
 */
function openProductModal() {
  productModalVisible.value = true;
}

/**
 * 处理商品选择
 */
function handleProductSelect(product: any) {
  selectedProduct.value = product;
  window.$message?.success(`已选择: ${product.name}`);
}

// 监听抽屉打开，初始化数据
watch(visible, () => {
  if (visible.value) {
    handleInit();
  }
});

/**
 * 初始化表单数据
 */
function handleInit() {
  restoreValidation(); // 重置校验状态

  if (props.operateType === 'edit' && props.rowData) {
    // 编辑模式：回填数据
    Object.assign(model, props.rowData);

    // 回填 Schema 字段列表
    if (props.rowData.ruleSchema?.fields) {
      // 清空旧数组并填入新数据 (保持 reactive 引用)
      schemaFields.splice(0, schemaFields.length, ...props.rowData.ruleSchema.fields);
    } else {
      schemaFields.splice(0, schemaFields.length);
    }

    // 回填已选择的商品/规格
    if (props.rowData.productId || props.rowData.skuId) {
      selectedProduct.value = {
        id: props.rowData.skuId || props.rowData.productId,
        name: props.rowData.productName || '已选择的商品',
        productId: props.rowData.productId,
        skuId: props.rowData.skuId
      };
    } else {
      selectedProduct.value = null;
    }
  } else {
    // 新增模式：重置为空
    Object.assign(model, {
      code: '',
      name: '',
      unitName: '个',
      ruleSchema: { fields: [] },
      uiComponentId: ''
    });
    schemaFields.splice(0, schemaFields.length);
    selectedProduct.value = null;
  }
}

/**
 * 提交表单
 */
async function handleSubmit() {
  // 1. 校验基础表单
  await validate();

  // 2. 组装 Schema 数据
  model.ruleSchema = {
    fields: schemaFields
  };

  // 3. 组装商品/规格数据
  if (selectedProduct.value) {
    Object.assign(model, {
      productId: selectedProduct.value.productId,
      skuId: selectedProduct.value.skuId,
      productName: selectedProduct.value.name
    });
  } else {
    // 清空商品相关字段
    Object.assign(model, {
      productId: undefined,
      skuId: undefined,
      productName: undefined
    });
  }

  // 4. 调用 API
  if (props.operateType === 'add') {
    await fetchCreateTemplate(model);
  } else {
    if (!props.rowData?.id) return;
    await fetchUpdateTemplate(props.rowData.id, model);
  }

  // 5. 反馈与关闭
  window.$message?.success(props.operateType === 'add' ? '新增成功' : '修改成功');
  visible.value = false;
  emit('submitted');
}
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="600">
    <NDrawerContent :title="title" :native-scrollbar="false">
      <NForm ref="formRef" :model="model">
        <!-- 基础信息卡片 -->
        <NCard title="基础信息" class="mb-4" size="small">
          <NFormItem label="玩法编码" path="code" rule-path="required">
            <NInput
              v-model:value="model.code"
              placeholder="系统唯一标识，如 GROUP_BUY"
              :disabled="operateType === 'edit'"
            />
          </NFormItem>
          <NFormItem label="玩法名称" path="name" rule-path="required">
            <NInput v-model:value="model.name" placeholder="如：三人成团" />
          </NFormItem>
          <NFormItem label="计量单位" path="unitName" rule-path="required">
            <NInput v-model:value="model.unitName" placeholder="如：人、件、小时" />
          </NFormItem>
        </NCard>

        <!-- 商品/规格选择卡片 -->
        <NCard title="关联商品/规格" class="mb-4" size="small">
          <div class="mb-2 text-xs text-gray-500">选择此玩法模板关联的商品或服务规格（可选）</div>

          <NSpace vertical>
            <NButton type="primary" ghost @click="openProductModal">
              <template #icon>
                <icon-ic-round-add class="text-16px" />
              </template>
              选择商品/规格
            </NButton>

            <div v-if="selectedProduct" class="flex items-center gap-2 rounded bg-gray-50 p-2">
              <NTag type="success" size="small">已选择</NTag>
              <span class="text-sm">{{ selectedProduct.name }}</span>
              <NButton text type="error" size="tiny" @click="selectedProduct = null">移除</NButton>
            </div>
          </NSpace>
        </NCard>

        <!-- 规则定义卡片 (Schema Builder) -->
        <NCard title="规则定义 (Schema Builder)" class="mb-4" size="small">
          <div class="mb-2 text-xs text-gray-500">
            此处定义
            <span class="text-primary font-bold">门店端</span>
            在配置此玩法时，需要填写的参数。
          </div>

          <!-- 动态输入列表 -->
          <NDynamicInput
            v-model:value="schemaFields"
            :on-create="() => ({ key: '', label: '', type: 'number', required: true })"
          >
            <template #default="{ value }">
              <div class="w-full flex items-center gap-2">
                <NInput v-model:value="value.key" placeholder="Key (e.g. targetCount)" class="flex-1" />
                <NInput v-model:value="value.label" placeholder="标签 (e.g. 成团人数)" class="flex-1" />
                <NSelect v-model:value="value.type" :options="fieldTypeOptions" class="w-120px" />
              </div>
            </template>
          </NDynamicInput>
        </NCard>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">确认</NButton>
        </NSpace>
      </template>
    </NDrawerContent>

    <!-- 商品选择模态框 -->
    <ProductSelectModal v-model:visible="productModalVisible" @select="handleProductSelect" />
  </NDrawer>
</template>
