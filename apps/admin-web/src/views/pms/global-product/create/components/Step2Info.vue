<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { NForm, NFormItem, NInput, NInputNumber, NRadioGroup, NRadioButton, NSelect, NSwitch, NButton, NCard } from 'naive-ui';
import { fetchGetBrandList } from '@/service/api/pms/brand';
import type { ProductForm } from '../model';

defineOptions({ name: 'Step2Info' });

const props = defineProps<{
  formModel: ProductForm;
}>();

const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();

const brandOptions = ref<{ label: string; value: number }[]>([]);

async function initBrands() {
  const { data } = await fetchGetBrandList({ pageNum: 1, pageSize: 100 }); // Get first 100 brands
  if (data) {
    brandOptions.value = (data as any).rows.map((b: any) => ({ label: b.name, value: b.brandId }));
  }
}

function handleNext() {
  // Add validation logic here if needed, accessing NForm ref
  emit('next');
}

onMounted(() => {
  initBrands();
});
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <NForm :model="formModel" label-placement="left" label-width="120" require-mark-placement="right-hanging">
      <NCard bordered>
        <template #header>基本信息</template>
        
        <NFormItem label="商品名称" path="name" rule-path="name">
          <NInput v-model:value="formModel.name" placeholder="请输入商品名称" />
        </NFormItem>

        <NFormItem label="副标题" path="subTitle">
          <NInput v-model:value="formModel.subTitle" placeholder="请输入副标题" />
        </NFormItem>

        <NFormItem label="商品品牌" path="brandId">
          <NSelect v-model:value="formModel.brandId" :options="brandOptions" placeholder="请选择品牌" clearable />
        </NFormItem>

        <NFormItem label="商品介绍" path="description">
          <NInput v-model:value="formModel.description" type="textarea" placeholder="请输入商品简单描述" />
        </NFormItem>

        <NFormItem label="商品类型" path="type">
          <NRadioGroup v-model:value="formModel.type">
            <NRadioButton value="REAL">实物商品 (物流发货)</NRadioButton>
            <NRadioButton value="SERVICE">服务/虚拟商品 (无需物流)</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <!-- Conditionals -->
        <template v-if="formModel.type === 'REAL'">
            <NFormItem label="重量(kg)" path="weight">
                <NInputNumber v-model:value="formModel.weight" :min="0" :precision="3" />
            </NFormItem>
            <NFormItem label="包邮" path="isFreeShip">
                <NSwitch v-model:value="formModel.isFreeShip" />
            </NFormItem>
        </template>

        <template v-if="formModel.type === 'SERVICE'">
             <NFormItem label="服务时长(分)" path="serviceDuration">
                <NInputNumber v-model:value="formModel.serviceDuration" :min="0" />
            </NFormItem>
             <NFormItem label="服务半径(km)" path="serviceRadius">
                <NInputNumber v-model:value="formModel.serviceRadius" :min="0" />
            </NFormItem>
        </template>

        <NFormItem label="排序" path="sort">
            <NInputNumber v-model:value="formModel.sort" :min="0" />
        </NFormItem>

        <!-- Action Buttons -->
        <div class="flex justify-between mt-6">
            <NButton @click="emit('prev')">上一步</NButton>
            <NButton type="primary" @click="handleNext" :disabled="!formModel.name">下一步，设置规格</NButton>
        </div>

      </NCard>
    </NForm>
  </div>
</template>
