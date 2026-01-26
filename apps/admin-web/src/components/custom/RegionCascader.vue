<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { CascaderOption } from 'naive-ui';
import { NCascader } from 'naive-ui';
import { fetchRegionList } from '@/service/api/lbs/region';

interface Props {
  value?: string | number | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:value', 'update:label']);

const modelValue = ref(props.value);
const options = ref<CascaderOption[]>([]);

async function loadProvinces() {
  try {
    const { data } = await fetchRegionList();
    if (data) {
      options.value = data.map((item: any) => ({
        label: item.name,
        value: item.code,
        depth: 1,
        isLeaf: false // Province is never leaf in this context
      }));
    }
  } catch (error) {
    console.warn('Failed to load regions:', error);
  }
}

async function handleLoad(option: CascaderOption) {
  try {
    const parentId = option.value as string;
    const depth = (option.depth as number) + 1;

    const { data } = await fetchRegionList(parentId);

    if (data && data.length > 0) {
      option.children = data.map((item: any) => ({
        label: item.name,
        value: item.code,
        depth,
        isLeaf: depth >= 3 // 3rd level (District) is leaf
      }));
    } else {
      option.isLeaf = true;
    }
  } catch (error) {
    console.warn('Failed to load sub-regions:', error);
    option.isLeaf = true;
  }
}

function handleUpdateValue(value: string | number | null, option: CascaderOption, pathValues: Array<CascaderOption>) {
  emit('update:value', value);

  // Emit the full label path (e.g. ["Hunan", "Changsha", "Yuhua"])
  if (pathValues) {
    const labels = pathValues.map(opt => opt.label as string);
    emit('update:label', labels);
  }
}

onMounted(() => {
  loadProvinces();
});
</script>

<template>
  <NCascader
    v-model:value="modelValue"
    :options="options"
    :remote="true"
    :on-load="handleLoad"
    check-strategy="all"
    placeholder="请选择行政区域"
    @update:value="handleUpdateValue"
  />
</template>
