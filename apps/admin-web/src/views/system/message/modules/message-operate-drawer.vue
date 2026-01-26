<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchCreateMessage } from '@/service/api/system/message';
import { useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'MessageOperateDrawer'
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.System.MessageVo | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', { default: false });

const { formRef, validate, restoreValidation } = useNaiveForm();

const model = ref<Api.System.MessageCreateDto>({
  title: '',
  content: '',
  type: 'SYSTEM',
  receiverId: '', // For test
  tenantId: '' // For test
});

const typeOptions = [
  { label: '订单消息', value: 'ORDER' },
  { label: '系统通知', value: 'SYSTEM' },
  { label: '公告', value: 'NOTICE' }
];

async function handleSubmit() {
  await validate();

  if (props.operateType === 'add') {
    await fetchCreateMessage(model.value);
    window.$message?.success('发送成功');
    close();
    emit('submitted');
  }
}

function close() {
  visible.value = false;
}

watch(visible, () => {
  if (visible.value && props.operateType === 'add') {
    model.value = {
      title: '',
      content: '',
      type: 'SYSTEM',
      receiverId: '',
      tenantId: ''
    };
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" display-directive="show" :width="360">
    <NDrawerContent
      :title="operateType === 'add' ? '发送消息(测试)' : '查看消息'"
      :native-scrollbar="false"
      class="h-full"
    >
      <NForm v-if="operateType === 'add'" ref="formRef" :model="model">
        <NFormItem label="标题" path="title" :rule="{ required: true, message: '请输入标题' }">
          <NInput v-model:value="model.title" placeholder="请输入标题" />
        </NFormItem>
        <NFormItem label="内容" path="content">
          <NInput v-model:value="model.content" type="textarea" placeholder="请输入内容" />
        </NFormItem>
        <NFormItem label="类型" path="type">
          <NSelect v-model:value="model.type" :options="typeOptions" />
        </NFormItem>
        <NFormItem
          label="接收人ID (Admin User ID)"
          path="receiverId"
          :rule="{ required: true, message: '请输入接收人ID' }"
        >
          <NInput v-model:value="model.receiverId" placeholder="User ID" />
        </NFormItem>
        <NFormItem label="租户ID" path="tenantId" :rule="{ required: true, message: '请输入租户ID' }">
          <NInput v-model:value="model.tenantId" placeholder="Tenant ID" />
        </NFormItem>
      </NForm>
      <div v-else>
        <!-- Detail View -->
        <NDescriptions :column="1">
          <NDescriptionsItem label="标题">{{ rowData?.title }}</NDescriptionsItem>
          <NDescriptionsItem label="类型">{{ rowData?.type }}</NDescriptionsItem>
          <NDescriptionsItem label="状态">{{ rowData?.isRead ? '已读' : '未读' }}</NDescriptionsItem>
          <NDescriptionsItem label="收到时间">{{ rowData?.createTime }}</NDescriptionsItem>
          <NDescriptionsItem label="内容">{{ rowData?.content }}</NDescriptionsItem>
        </NDescriptions>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="close">关闭</NButton>
          <NButton v-if="operateType === 'add'" type="primary" @click="handleSubmit">发送</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>
