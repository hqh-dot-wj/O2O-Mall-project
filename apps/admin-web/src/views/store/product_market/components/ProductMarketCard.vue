<template>
  <NCard hoverable class="h-full flex flex-col cursor-pointer transition-all hover:shadow-lg">
    <template #cover>
      <div class="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <NImage
          :src="product.albumPics?.split(',')[0]"
          class="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
          fallback-src="https://via.placeholder.com/300?text=No+Image"
          preview-disabled
        />
        <div class="absolute top-2 right-2">
            <NTag :type="product.type === 'REAL' ? 'info' : 'success'" size="small">
                {{ product.type === 'REAL' ? '实物' : '服务' }}
            </NTag>
        </div>
      </div>
    </template>
    
    <div class="flex flex-col flex-1 gap-2">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-lg font-bold line-clamp-2" :title="product.name">{{ product.name }}</h3>
      </div>
      
      <p class="text-gray-500 text-sm line-clamp-2 min-h-10">{{ product.subTitle || '暂无描述' }}</p>
      
      <div class="mt-auto pt-4 flex items-center justify-between">
        <div class="flex flex-col">
            <span class="text-xs text-gray-400">指导价</span>
            <span class="text-lg font-bold text-primary">¥{{ product.price }}</span>
        </div>
        
        <NButton 
            :type="product.isImported ? 'default' : 'primary'" 
            :disabled="product.isImported"
            size="medium"
            @click.stop="$emit('import', product)"
        >
            {{ product.isImported ? '已导入' : '立即上架' }}
        </NButton>
      </div>
    </div>
  </NCard>
</template>

<script setup lang="ts">
import { NCard, NImage, NButton, NTag } from 'naive-ui';

interface Props {
  product: Api.Store.MarketProduct;
}

defineProps<Props>();

defineEmits<{
  (e: 'import', product: Api.Store.MarketProduct): void;
}>();
</script>

<style scoped></style>
