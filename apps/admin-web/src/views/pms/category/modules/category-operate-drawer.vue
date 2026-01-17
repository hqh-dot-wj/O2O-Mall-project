<script setup lang="tsx">
import { computed, reactive, watch, ref } from 'vue';
import { useFormRules, useNaiveForm } from '@/hooks/common/form';
import { fetchAddCategory, fetchUpdateCategory, fetchGetCategoryTree } from '@/service/api/pms/category';
import { fetchGetAttributeList } from '@/service/api/pms/attribute';
import { $t } from '@/locales';
import { NForm, NFormItem, NInput, NInputNumber, NTreeSelect, NSelect } from 'naive-ui';

defineOptions({
  name: 'CategoryOperateDrawer',
});

interface Props {
  /** the type of operation */
  operateType: NaiveUI.TableOperateType;
  /** the edit row data */
  rowData?: Api.Pms.Category | null;
}

const props = defineProps<Props>();

interface Emits {
  (e: 'submitted'): void;
}

const emit = defineEmits<Emits>();

const visible = defineModel<boolean>('visible', {
  default: false,
});

const { formRef, validate, restoreValidation } = useNaiveForm();
const { defaultRequiredRule } = useFormRules();

const title = computed(() => {
  const titles: Record<NaiveUI.TableOperateType, string> = {
    add: $t('page.pms.category.addCategory'),
    edit: $t('page.pms.category.editCategory'),
  };
  return titles[props.operateType];
});

type Model = Api.Pms.CategoryOperateParams;

const model: Model = reactive(createDefaultModel());

function createDefaultModel(): Model {
  return {
    name: '',
    sort: 0,
    level: 1,
    parentId: null,
    bindType: null,
    attrTemplateId: null
  };
}

const attrTemplateOptions = ref<CommonType.Option<number>[]>([]);

async function getAttrTemplates() {
  const { data } = await fetchGetAttributeList({ pageNum: 1, pageSize: 100 });
  if (data) {
    attrTemplateOptions.value = data.rows.map(item => ({
      label: item.name,
      value: item.templateId
    }));
  }
}

const treeOptions = ref<Api.Pms.CategoryTree>([]);

async function getTree() {
  const { data } = await fetchGetCategoryTree();
  if (data) {
    treeOptions.value = data;
  }
}

type RuleKey = Extract<keyof Model, 'name'>;

const rules: Record<RuleKey, App.Global.FormRule> = {
  name: defaultRequiredRule,
};

function handleUpdateStoreSelection(val: number | null, option: any) {
  if (option) {
    model.level = (option.level || 0) + 1;
  } else {
    model.level = 1;
  }
}

async function handleSubmit() {
  await validate();
  if (props.operateType === 'add') {
    await fetchAddCategory(model);
  } else {
    await fetchUpdateCategory(model);
  }
  window.$message?.success($t('common.updateSuccess'));
  close();
  emit('submitted');
}

function close() {
  visible.value = false;
}

watch(visible, () => {
  if (visible.value) {
    handleInit();
    restoreValidation();
    restoreValidation();
    getTree();
    getAttrTemplates();
  }
});

function handleInit() {
  Object.assign(model, createDefaultModel());
  if (props.operateType === 'edit' && props.rowData) {
    Object.assign(model, props.rowData);
  }
  // If adding sub-category
  if (props.operateType === 'add' && props.rowData) {
    model.parentId = props.rowData.catId;
    model.level = props.rowData.level + 1;
  }
}
</script>

<template>
  <NDrawer v-model:show="visible" :title="title" display-directive="show" :width="360">
    <NDrawerContent :title="title" :native-scrollbar="false" closable>
      <NForm ref="formRef" :model="model" :rules="rules">
        <NFormItem :label="$t('page.pms.category.parentCategory')" path="parentId">
          <NTreeSelect
            v-model:value="model.parentId"
            :options="treeOptions"
            key-field="catId"
            label-field="name"
            children-field="children"
            :placeholder="$t('page.pms.category.selectParent')"
            clearable
            @update:value="handleUpdateStoreSelection"
          />
        </NFormItem>
        <NFormItem :label="$t('page.pms.category.categoryName')" path="name">
          <NInput v-model:value="model.name" :placeholder="$t('page.pms.category.form.categoryName.required')" />
        </NFormItem>
        <NFormItem :label="$t('common.sort')" path="sort">
          <NInputNumber v-model:value="model.sort" :placeholder="$t('page.pms.category.form.sort.required')" />
        </NFormItem>
        <NFormItem :label="$t('page.pms.category.bindType')" path="bindType">
          <NSelect
            v-model:value="model.bindType"
            :options="[
              { label: $t('page.pms.category.realProduct'), value: 'REAL' },
              { label: $t('page.pms.category.serviceProduct'), value: 'SERVICE' }
            ]"
            clearable
          />
        </NFormItem>
        <NFormItem :label="$t('page.pms.category.attributeTemplate' )" path="attrTemplateId">
          <NSelect
            v-model:value="model.attrTemplateId"
            :options="attrTemplateOptions"
            :placeholder="$t('page.pms.category.selectAttributeTemplate' )"
            clearable
            filterable
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="center" class="w-full">
          <NButton @click="close">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="handleSubmit">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped></style>
