<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { NButton, NCard, NCascader } from 'naive-ui';
import { fetchGetCategoryTree } from '@/service/api/pms/category';

defineOptions({ name: 'Step1Category' });

const emit = defineEmits<{
  (e: 'next', categoryId: number): void;
}>();

const value = ref<number | null>(null);
const options = ref<any[]>([]);
const loading = ref(false);

async function init() {
  loading.value = true;
  try {
    const { data } = await fetchGetCategoryTree();
    // Recursively map children if needed, or if API returns standard structure
    // Category: { catId, name, children }
    // NCascader expects: { value, label, children }
    options.value = mapToCascader(data || []);
  } finally {
    loading.value = false;
  }
}

function mapToCascader(list: any[]): any[] {
  return list.map(item => ({
    label: item.name,
    value: item.catId, // Assuming catId is the ID
    children: item.children && item.children.length ? mapToCascader(item.children) : undefined
  }));
}

function handleNext() {
  if (value.value) {
    emit('next', value.value);
  }
}

onMounted(init);
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center p-10">
    <h2 class="mb-4 text-xl font-bold">请选择商品分类</h2>
    <div class="max-w-md w-full">
      <NCascader
        v-model:value="value"
        :options="options"
        placeholder="请选择分类 (支持搜索)"
        filterable
        check-strategy="child"
        class="mb-8"
        size="large"
      />
      <NButton type="primary" block size="large" :disabled="!value" @click="handleNext">下一步，填写信息</NButton>
    </div>
  </div>
</template>
