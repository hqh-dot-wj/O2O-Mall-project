<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { fetchCreateLevel, fetchUpdateLevel } from '@/service/api/distribution';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { $t } from '@/locales';

defineOptions({
  name: 'LevelOperateDrawer'
});

interface Props {
  operateType: NaiveUI.TableOperateType;
  rowData?: Api.Store.Level | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { createRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: '新增等级',
    edit: '编辑等级'
  };
  return titles[props.operateType];
});

type Model = Api.Store.CreateLevelDto & { id?: number };

const model: Model = reactive(createDefaultModel());

function createDefaultModel(): Model {
  return {
    levelId: 1,
    levelName: '',
    levelIcon: '',
    level1Rate: 0,
    level2Rate: 0,
    sort: 0,
    isActive: true
  };
}

type RuleKey = Extract<keyof Model, 'levelId' | 'levelName' | 'level1Rate' | 'level2Rate'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  levelId: createRequiredRule('等级编号不能为空'),
  levelName: createRequiredRule('等级名称不能为空'),
  level1Rate: createRequiredRule('一级佣金比例不能为空'),
  level2Rate: createRequiredRule('二级佣金比例不能为空')
};

function closeDrawer() {
  visible.value = false;
}

async function handleUpdateModelWhenEdit() {
  if (props.operateType === 'add') {
    Object.assign(model, createDefaultModel());
    return;
  }

  if (props.operateType === 'edit' && props.rowData) {
    const row = props.rowData;
    Object.assign(model, {
      id: row.id,
      levelId: row.levelId,
      levelName: row.levelName,
      levelIcon: row.levelIcon ?? '',
      level1Rate: Number.parseFloat(row.level1Rate) || 0,
      level2Rate: Number.parseFloat(row.level2Rate) || 0,
      sort: row.sort,
      isActive: row.isActive
    });
  }
}

async function handleSubmit() {
  await validate();

  try {
    if (props.operateType === 'add') {
      await fetchCreateLevel({
        levelId: model.levelId,
        levelName: model.levelName,
        levelIcon: model.levelIcon || undefined,
        level1Rate: model.level1Rate,
        level2Rate: model.level2Rate,
        sort: model.sort ?? 0,
        isActive: model.isActive ?? true
      });
    } else if (props.operateType === 'edit' && model.id) {
      await fetchUpdateLevel(model.id, {
        levelId: model.levelId,
        levelName: model.levelName,
        levelIcon: model.levelIcon || undefined,
        level1Rate: model.level1Rate,
        level2Rate: model.level2Rate,
        sort: model.sort ?? 0,
        isActive: model.isActive ?? true
      });
    }

    window.$message?.success(props.operateType === 'add' ? $t('common.addSuccess') : $t('common.updateSuccess'));
    closeDrawer();
    emit('submitted');
  } catch {
    // 错误消息已在请求工具中显示
  }
}

watch(visible, () => {
  if (visible.value) {
    handleUpdateModelWhenEdit();
    restoreValidation();
  }
});
</script>

<template>
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="480" class="max-w-90%">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem label="等级编号" path="levelId">
          <NInputNumber
            v-model:value="model.levelId"
            placeholder="1-10"
            :min="1"
            :max="10"
            :disabled="operateType === 'edit'"
            class="w-full"
          />
        </NFormItem>
        <NFormItem label="等级名称" path="levelName">
          <NInput v-model:value="model.levelName" placeholder="如：初级分销员" />
        </NFormItem>
        <NFormItem label="等级图标" path="levelIcon">
          <NInput v-model:value="model.levelIcon" placeholder="图标URL（选填）" />
        </NFormItem>
        <NFormItem label="一级佣金比例(%)" path="level1Rate">
          <NInputNumber
            v-model:value="model.level1Rate"
            placeholder="0-100"
            :min="0"
            :max="100"
            :precision="2"
            class="w-full"
          />
        </NFormItem>
        <NFormItem label="二级佣金比例(%)" path="level2Rate">
          <NInputNumber
            v-model:value="model.level2Rate"
            placeholder="0-100"
            :min="0"
            :max="100"
            :precision="2"
            class="w-full"
          />
        </NFormItem>
        <NFormItem label="排序" path="sort">
          <NInputNumber v-model:value="model.sort" placeholder="数字越小越靠前" :min="0" class="w-full" />
        </NFormItem>
        <NFormItem label="状态" path="isActive">
          <NSwitch v-model:value="model.isActive" />
          <span class="ml-8px">{{ model.isActive ? '启用' : '停用' }}</span>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace :size="16">
          <NButton @click="closeDrawer">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
