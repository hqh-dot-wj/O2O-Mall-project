<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NStep, NSteps, useMessage } from 'naive-ui';
import { fetchCreateGlobalProduct, fetchGetGlobalProduct, fetchUpdateGlobalProduct } from '@/service/api/pms/product';
import { fetchGetAttributesByCategory } from '@/service/api/pms/attribute';
import { useTabStore } from '@/store/modules/tab';
import { createFormModel } from './model';
import Step1Category from './components/Step1Category.vue';
import Step2Info from './components/Step2Info.vue';
import Step3Sku from './components/Step3Sku.vue';
import Step4Attr from './components/Step4Attr.vue';

defineOptions({ name: 'GlobalProductCreate' });

const router = useRouter();
const route = useRoute();
const message = useMessage();
const tabStore = useTabStore();

const currentStep = ref(1);
const formModel = createFormModel();
const attributes = ref<Api.Pms.AttributeItem[]>([]);
const loading = ref(false);

const isEdit = computed(() => Boolean(route.query.id));
const productId = computed(() => route.query.id as string);

const currentStatus = computed(() => {
  return 'process' as const; // process, finish, error, wait
});

async function handleCategoryNext(categoryId: number) {
  formModel.categoryId = categoryId;
  await fetchAttributes(categoryId);
  currentStep.value = 2;
}

async function fetchAttributes(categoryId: number) {
  loading.value = true;
  try {
    const { data, error } = await fetchGetAttributesByCategory(categoryId);
    if (!error && data) {
      attributes.value = data;
    }
  } finally {
    loading.value = false;
  }
}

function nextStep() {
  if (currentStep.value < 4) {
    currentStep.value += 1;
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value -= 1;
  }
}

async function handleSubmit() {
  loading.value = true;
  try {
    if (!formModel.categoryId) {
      message.error('请选择分类');
      return;
    }

    // Filter out fields not in CreateProductDto
    const {
      description: _description,
      pic: _pic,
      albumPics,
      sort: _sort,
      productId: _productId,
      needBooking: _needBooking,
      delFlag: _delFlag,
      createTime: _createTime,
      category: _category,
      brand: _brand,
      globalSkus: _globalSkus,
      attrValues: _attrValues,
      ...validFormData
    } = formModel;

    // Map formModel to DTO requirements
    const submitData = {
      ...validFormData,
      // map albumPics to mainImages
      mainImages: albumPics || [],
      // ensure skus have numbers and remove read-only fields
      skus: formModel.skus.map(s => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { productId: _skuProductId, costPrice: _costPrice, ...validSkuData } = s;
        return {
          ...validSkuData,
          guidePrice: Number(validSkuData.guidePrice),
          guideRate: Number(validSkuData.guideRate),
          minDistRate: Number(validSkuData.minDistRate || 0),
          maxDistRate: Number(validSkuData.maxDistRate || 50)
        };
      })
    } as any;

    let error;
    if (isEdit.value) {
      const res = await fetchUpdateGlobalProduct(productId.value, submitData);
      error = res.error;
    } else {
      const res = await fetchCreateGlobalProduct(submitData);
      error = res.error;
    }

    if (!error) {
      message.success(isEdit.value ? '保存商品成功' : '发布商品成功');
      router.push({ path: 'pms_global-product' });
    }
  } finally {
    loading.value = false;
  }
}

async function initData() {
  if (!isEdit.value) return;

  // If editing, set tab title
  tabStore.setTabLabel('编辑标准商品');
  loading.value = true; // Replaced startLoading()
  try {
    const { data } = await fetchGetGlobalProduct(productId.value);
    if (data) {
      // Basic fields
      let specDef = typeof data.specDef === 'string' ? JSON.parse(data.specDef) : data.specDef;
      if (!Array.isArray(specDef)) {
        specDef = [];
      }
      Object.assign(formModel, {
        ...data,
        specDef,
        mainImages: [], // This will be overwritten by albumPics below
        albumPics: data.albumPics ? data.albumPics.split(',') : []
      });

      // SKUs
      if (data.globalSkus) {
        formModel.skus = data.globalSkus.map((sku: any) => ({
          ...sku,
          guidePrice: Number(sku.guidePrice), // Decimal to number
          guideRate: Number(sku.guideRate),
          minDistRate: Number(sku.minDistRate),
          maxDistRate: Number(sku.maxDistRate),
          // Ensure specValues is parsed
          specValues: typeof sku.specValues === 'string' ? JSON.parse(sku.specValues) : sku.specValues
        }));
      }

      // Attrs
      if (data.attrs) {
        formModel.attrs = data.attrs;
      }

      // Load Category Attributes
      if (formModel.categoryId) {
        await fetchAttributes(formModel.categoryId);
        // If we successfully loaded, maybe auto-jump to Step 2?
        // Step 1 is Category Selection. Since it's done, Step 2 is logical.
        currentStep.value = 2;
      }
    }
  } catch (e) {
    console.error(e);
    message.error('获取商品详情失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  initData();
});

onUnmounted(() => {
  tabStore.resetTabLabel();
});
</script>

<template>
  <div class="h-full overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900">
    <NCard class="mb-4">
      <NSteps :current="currentStep" :status="currentStatus">
        <NStep title="选择分类" description="选择商品所属分类" />
        <NStep title="基本信息" description="填写商品基本信息" />
        <NStep title="规格设置" description="设置SKU和价格" />
        <NStep title="详细参数" description="设置动态属性" />
      </NSteps>
    </NCard>

    <div class="mt-4">
      <!--
 KeepAlive could be used if we want to preserve state when switching steps back and forth, 
            but we are passing raw object so state is preserved in formModel. 
            However, component internal state (like collapsed groups) might be lost. 
            For now, simpler with v-if/v-show. 
-->

      <Step1Category v-if="currentStep === 1" @next="handleCategoryNext" />

      <Step2Info v-if="currentStep === 2" :form-model="formModel" @prev="prevStep" @next="nextStep" />

      <Step3Sku
        v-if="currentStep === 3"
        :form-model="formModel"
        :attributes="attributes"
        @prev="prevStep"
        @next="nextStep"
      />

      <Step4Attr
        v-if="currentStep === 4"
        :form-model="formModel"
        :attributes="attributes"
        @prev="prevStep"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
