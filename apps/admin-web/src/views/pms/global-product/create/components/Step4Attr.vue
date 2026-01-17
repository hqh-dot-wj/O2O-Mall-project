<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { NCard, NForm, NFormItem, NInput, NSelect, NButton } from 'naive-ui';
import type { ProductForm } from '../model';

defineOptions({ name: 'Step4Attr' });

const props = defineProps<{
  formModel: ProductForm;
  attributes: Api.Pms.AttributeItem[]; 
}>();

const emit = defineEmits<{
  (e: 'prev'): void;
  (e: 'submit'): void;
}>();

const paramAttributes = computed(() => {
  return props.attributes.filter(attr => attr.usageType === 'PARAM');
});

// Local state for binding: { [attrId]: string }
const attrValues = ref<Record<number, string>>({});

// Initialize
onMounted(() => {
  // Restore from formModel
  props.formModel.attrs.forEach(item => {
    attrValues.value[item.attrId] = item.value;
  });
  
  // Initialize defaults if needed?
});

// Sync back to formModel
watch(attrValues, (newVal) => {
  props.formModel.attrs = Object.entries(newVal).map(([attrIdString, value]) => ({
    attrId: Number(attrIdString),
    value
  }));
}, { deep: true });

function getOptions(attr: Api.Pms.AttributeItem) {
  if (!attr.inputList) return [];
  return attr.inputList.split(',').map(s => ({ label: s, value: s }));
}

</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <NCard title="商品参数" bordered>
      <NForm label-placement="left" label-width="120">
        <template v-for="attr in paramAttributes" :key="attr.attrId">
           <NFormItem :label="attr.name">
              <NSelect 
                v-if="attr.inputType === 1"
                v-model:value="attrValues[attr.attrId as number]"
                :options="getOptions(attr)"
                placeholder="请选择"
                filterable
                tag
              />
              <NInput 
                v-else 
                v-model:value="attrValues[attr.attrId as number]" 
                placeholder="请输入" 
              />
           </NFormItem>
        </template>
        
        <div v-if="paramAttributes.length === 0" class="text-center text-gray-400 py-10">
            该分类下暂无动态参数，可直接提交。
        </div>

        <div class="flex justify-between mt-6">
          <NButton @click="emit('prev')">上一步</NButton>
          <NButton type="primary" @click="emit('submit')">提交商品</NButton>
        </div>
      </NForm>
    </NCard>
  </div>
</template>
