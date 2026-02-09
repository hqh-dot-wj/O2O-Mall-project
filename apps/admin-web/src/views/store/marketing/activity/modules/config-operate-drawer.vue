<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDatePicker,
  NDivider,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NInputGroup,
  NInputNumber,
  NModal,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTimePicker
} from 'naive-ui';
import { fetchCreateStoreConfig, fetchUpdateStoreConfig } from '@/service/api/marketing-config';
import { fetchGetTemplateList } from '@/service/api/marketing';
import { useNaiveForm } from '@/hooks/common/form';
import { usePreview } from '@/hooks/business/usePreview';
import { useAuthStore } from '@/store/modules/auth';
import MapPointPicker from '@/components/custom/MapPointPicker.vue';

// --- 选品弹窗逻辑 ---
import ProductSelectModal from '@/components/business/product-select-modal.vue';

defineOptions({ name: 'ConfigOperateDrawer' });

/**
 * 营销商品配置器 (Split Pane With Iframe)
 *
 * @description
 * 这是系统中最复杂的表单组件。
 * 布局: 左右分栏 (Split Pane)
 * - 左侧: 动态配置表单。根据选择的"玩法模板"，解析 RuleSchema 动态渲染输入框。
 * - 右侧: 手机端实时预览 (Iframe)。
 *
 * 交互:
 * - 监听左侧表单数据的变化 (watch)。
 * - 通过 usePreview Hook 发送 postMessage 给右侧 Iframe。
 */

const authStore = useAuthStore();
interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Marketing.StoreConfig | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();

// --- 预览核心逻辑 ---
const iframeRef = ref<HTMLIFrameElement | null>(null);
// 预览模式：card（卡片预览）或 product（商品详情预览）
const previewMode = ref<'card' | 'product'>('card');
// 预览页地址：根据模式动态切换
const previewUrl = computed(() => {
  const baseUrl = import.meta.env.DEV ? 'http://localhost:9000/#/pages/preview' : '/pages/preview';
  return previewMode.value === 'card' ? `${baseUrl}/card` : `${baseUrl}/product-detail`;
});
// 引入通信 Hook
const { syncForm } = usePreview(iframeRef, previewUrl.value);
const showProductModal = ref(false);

// SKU 选项相关
const skuOptions = ref<{ label: string; value: string }[]>([]);
const selectedSkuIds = ref<string[]>([]);

// 监听选中的 SKU IDs，同步到 model.rules.skus
watch(selectedSkuIds, val => {
  if (val.length > 0) {
    model.rules.skus = val.map(id => ({ skuId: id }));
  } else {
    // 如果清空，删除 rules.skus 字段，表示全选
    delete model.rules.skus;
  }
});

function openProductModal() {
  showProductModal.value = true;
}

function handleProductSelect(row: any) {
  model.serviceId = row.productId || row.id;

  // 处理 SKU 选项
  const skus = row.skus || row.globalSkus || [];
  if (skus.length > 0) {
    skuOptions.value = skus.map((s: any) => {
      const spec = typeof s.specValues === 'string' ? JSON.parse(s.specValues) : s.specValues;
      const specStr = Object.values(spec || {}).join('/');
      return {
        label: specStr || '默认规格',
        value: s.skuId || s.id
      };
    });
  } else {
    skuOptions.value = [];
  }

  // 重置选中
  selectedSkuIds.value = [];

  // 保存商品信息用于预览
  model.product = {
    name: row.name || row.productName,
    subTitle: row.subTitle,
    mainImages: row.mainImages || [row.coverImage] || [],
    price: row.price || row.guidePrice || 0,
    skus: skus.map((s: any) => ({
      skuId: s.skuId || s.id,
      specValues: typeof s.specValues === 'string' ? JSON.parse(s.specValues) : s.specValues,
      price: s.price || s.guidePrice
    }))
  };
}

// --- 表单数据 ---
const model = reactive<Api.Marketing.StoreConfigCreate & { product?: any }>({
  serviceId: '',
  serviceType: 'SERVICE',
  templateCode: '',
  rules: {},
  stockMode: 'LAZY_CHECK',
  product: undefined // 用于预览的商品信息
});

// 模板选项缓存 (包含 Schema)
const templateOptions = ref<{ label: string; value: string; schema: any }[]>([]);

// 当前选中模板的 Schema 定义 (Computed)
const currentSchema = computed(() => {
  const t = templateOptions.value.find(i => i.value === model.templateCode);
  return t ? t.schema : null;
});

// --- 生命周期与交互 ---

// 1. 打开抽屉时初始化
watch(visible, async () => {
  if (visible.value) {
    await loadTemplates(); // 每次打开都尝试加载，防止首次加载失败
    handleInit();
    // 初始化后立即发送数据到预览
    setTimeout(() => {
      syncForm(JSON.parse(JSON.stringify(model)));
    }, 500);
  }
});

// 2. 核心：监听数据变化，实时同步给预览 Iframe
watch(
  model,
  val => {
    // 深拷贝防止引用问题，通过 syncForm 发送
    syncForm(JSON.parse(JSON.stringify(val)));
  },
  { deep: true }
);

// 3. 监听预览模式切换，切换后立即发送数据
watch(previewMode, () => {
  // 等待 iframe 加载完成后发送数据
  setTimeout(() => {
    syncForm(JSON.parse(JSON.stringify(model)));
  }, 500);
});

// 4. iframe 加载完成后发送数据
function handleIframeLoad() {
  // 等待一小段时间确保 iframe 内的 Vue 应用已经挂载
  setTimeout(() => {
    syncForm(JSON.parse(JSON.stringify(model)));
  }, 300);
}

// 加载模板 API
async function loadTemplates() {
  try {
    const { data, error } = await fetchGetTemplateList();
    if (!error && data) {
      // 兼容分页结构或直接列表
      const list = Array.isArray(data) ? data : data.rows || [];
      templateOptions.value = list.map((t: any) => ({
        label: t.name,
        value: t.code,
        schema: t.ruleSchema
      }));
    }
  } catch (err) {
    console.error('Failed to load templates', err);
  }
}

// --- 地图选点逻辑 ---
const showMapModal = ref(false);
const currentMapKey = ref('');
const tempMapPoint = ref<{ lat: number; lng: number } | undefined>(undefined);
const tempMapAddress = ref('');

function openMapPicker(key: string) {
  currentMapKey.value = key;
  const val = model.rules[key];
  // 假设存储格式为 { address: string, location: { lat, lng } }
  if (val && val.location) {
    tempMapPoint.value = val.location;
    tempMapAddress.value = val.address;
  } else {
    tempMapPoint.value = undefined;
    tempMapAddress.value = '';
  }
  showMapModal.value = true;
}

function handleMapConfirm() {
  if (!tempMapPoint.value) {
    window.$message?.warning('请选择地点');
    return;
  }
  model.rules[currentMapKey.value] = {
    address: tempMapAddress.value,
    location: {
      lat: tempMapPoint.value.lat,
      lng: tempMapPoint.value.lng
    }
  };
  showMapModal.value = false;
}
// 初始化表单值
async function handleInit() {
  restoreValidation();
  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, props.rowData);
    
    // 如果是编辑模式，需要加载商品信息用于预览
    if (model.serviceId) {
      try {
        // 这里需要调用商品详情API获取商品信息
        // 暂时使用占位数据，实际应该调用 API
        model.product = {
          name: props.rowData.productName || '商品名称',
          subTitle: '',
          mainImages: [props.rowData.productImage] || [],
          price: 0,
          skus: []
        };
      } catch (err) {
        console.error('Failed to load product info', err);
      }
    }
  } else {
    // 重置表单
    model.serviceId = '';
    model.templateCode = '';
    model.rules = {};
    model.stockMode = 'LAZY_CHECK';
    model.product = undefined;
  }
}

// 提交保存
async function handleSubmit() {
  await validate();

  // 准备提交数据，移除 product 字段（仅用于预览）和 storeId（后端自动获取）
  const submitData = {
    serviceId: model.serviceId,
    serviceType: model.serviceType,
    templateCode: model.templateCode,
    rules: model.rules,
    stockMode: model.stockMode,
    status: model.status
  };

  if (props.operateType === 'add') {
    await fetchCreateStoreConfig(submitData);
  } else {
    if (!props.rowData?.id) return;
    await fetchUpdateStoreConfig(props.rowData.id, submitData);
  }

  window.$message?.success(props.operateType === 'add' ? '创建成功' : '修改成功');
  visible.value = false;
  emit('submitted');
}
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="1000">
    <NDrawerContent title="营销商品配置器 (所见即所得)" :native-scrollbar="false">
      <!-- Split Pane 布局 -->
      <div class="h-full flex gap-4">
        <!-- Left: 配置面板 (50%) -->
        <div class="w-1/2 overflow-y-auto border-r border-gray-200 pr-4">
          <NForm ref="formRef" :model="model">
            <NCard title="1. 选择玩法" size="small" class="mb-4">
              <NFormItem label="玩法模板" path="templateCode" rule-path="required">
                <NSelect v-model:value="model.templateCode" :options="templateOptions" placeholder="请选择玩法" />
              </NFormItem>
            </NCard>

            <NCard title="2. 选择商品/服务" size="small" class="mb-4">
              <NFormItem label="类型" path="serviceType">
                <NRadioGroup v-model:value="model.serviceType" name="serviceType">
                  <NRadioButton value="SERVICE">服务(Service)</NRadioButton>
                  <NRadioButton value="REAL">实物(Real)</NRadioButton>
                </NRadioGroup>
              </NFormItem>

              <NFormItem label="SKU 选择" path="serviceId" rule-path="required">
                <NInputGroup>
                  <NInput v-model:value="model.serviceId" placeholder="请选择关联商品" readonly class="flex-1" />
                  <NButton type="primary" ghost @click="openProductModal">选择</NButton>
                </NInputGroup>
              </NFormItem>

              <!-- 参与规格多选 -->
              <NFormItem v-if="skuOptions.length > 0" label="参与规格" path="rules.skus">
                <div class="w-full flex flex-col gap-2">
                  <NCheckboxGroup v-model:value="selectedSkuIds">
                    <NSpace item-style="display: flex;">
                      <NCheckbox v-for="sku in skuOptions" :key="sku.value" :value="sku.value" :label="sku.label" />
                    </NSpace>
                  </NCheckboxGroup>
                  <span class="text-xs text-gray-400">如果不选，默认所有规格都参与活动</span>
                </div>
              </NFormItem>
            </NCard>

            <!--- 关键：动态渲染规则表单 -->
            <NCard v-if="currentSchema" title="3. 规则参数配置" size="small" class="mb-4">
              <template v-for="field in currentSchema.fields" :key="field.key">
                <NFormItem :label="field.label" :path="`rules.${field.key}`" :required="field.required">
                  <!-- 根据 Schema 类型渲染不同控件 -->
                  <NInputNumber v-if="field.type === 'number'" v-model:value="model.rules[field.key]" class="w-full" />

                  <NSwitch v-else-if="field.type === 'boolean'" v-model:value="model.rules[field.key]" />

                  <!-- 地址选点 -->
                  <div v-else-if="field.type === 'address'" class="w-full flex gap-2">
                    <NInput :value="model.rules[field.key]?.address" placeholder="请选择地点" readonly class="flex-1" />
                    <NButton @click="openMapPicker(field.key)">选择位置</NButton>
                  </div>

                  <!-- 时间/日期选择 -->
                  <NDatePicker
                    v-else-if="
                      ['date', 'datetime', 'daterange', 'datetimerange', 'month', 'year', 'quarter'].includes(
                        field.type
                      )
                    "
                    v-model:formatted-value="model.rules[field.key]"
                    :type="field.type"
                    value-format="yyyy-MM-dd HH:mm:ss"
                    class="w-full"
                    clearable
                  />

                  <NTimePicker
                    v-else-if="field.type === 'time'"
                    v-model:formatted-value="model.rules[field.key]"
                    value-format="HH:mm:ss"
                    class="w-full"
                    clearable
                  />

                  <NInput v-else v-model:value="model.rules[field.key]" />
                </NFormItem>
              </template>
            </NCard>
          </NForm>
        </div>

        <!-- Right: 手机模拟预览 (50%) -->
        <div class="w-1/2 flex flex-col items-center rounded-lg bg-gray-50 py-4">
          <!-- 预览模式切换 -->
          <div class="mb-4 flex gap-2">
            <NButton
              :type="previewMode === 'card' ? 'primary' : 'default'"
              size="small"
              @click="previewMode = 'card'"
            >
              卡片预览
            </NButton>
            <NButton
              :type="previewMode === 'product' ? 'primary' : 'default'"
              size="small"
              :disabled="!model.serviceId"
              @click="previewMode = 'product'"
            >
              商品详情预览
            </NButton>
          </div>

          <!-- 手机外壳 -->
          <div
            class="relative h-[667px] w-[375px] overflow-hidden border-8 border-gray-800 rounded-[30px] bg-white shadow-2xl"
          >
            <!-- 刘海 -->
            <div
              class="absolute left-1/2 top-0 z-20 h-[25px] w-[120px] rounded-b-xl bg-gray-800 -translate-x-1/2"
            ></div>

            <!-- 嵌入 Iframe -->
            <iframe
              :key="previewMode"
              ref="iframeRef"
              :src="previewUrl"
              class="h-full w-full border-none"
              scrolling="yes"
              title="Preview"
              @load="handleIframeLoad"
            ></iframe>

            <!-- 底部导航条 -->
            <div
              class="absolute bottom-1 left-1/2 h-1 w-[100px] rounded-full bg-black opacity-20 -translate-x-1/2"
            ></div>
          </div>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="visible = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">确认生产</NButton>
        </NSpace>
      </template>
    </NDrawerContent>

    <ProductSelectModal
      v-model:visible="showProductModal"
      :type="model.serviceType as any"
      @select="handleProductSelect"
    />
    <NModal v-model:show="showMapModal" preset="card" title="选择位置" class="h-[600px] w-[800px]">
      <MapPointPicker v-model:model-value="tempMapPoint" v-model:address="tempMapAddress" />
      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showMapModal = false">取消</NButton>
          <NButton type="primary" @click="handleMapConfirm">确定</NButton>
        </div>
      </template>
    </NModal>
  </NDrawer>
</template>
