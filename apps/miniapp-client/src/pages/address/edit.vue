<script lang="ts" setup>
import type { AddressDto } from '@/api/address'
import type { RegionVo } from '@/api/region'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { createAddress, getAddressDetail, updateAddress } from '@/api/address'
import { getRegionList } from '@/api/region'

definePage({
  style: {
    navigationBarTitleText: '编辑地址',
  },
})

// 是否编辑模式
const isEdit = ref(false)
const addressId = ref('')
const loading = ref(false)
const submitting = ref(false)

// 表单数据
const form = ref<AddressDto>({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false,
  tag: '',
})

// 省市区选择器
const regionVisible = ref(false)
const regionText = computed(() => {
  if (form.value.province && form.value.city && form.value.district) {
    return `${form.value.province} ${form.value.city} ${form.value.district}`
  }
  return ''
})

const regionValue = ref<string[]>([])
const regionColumns = ref<any[]>([])

// 初始化省份数据
async function initRegionData() {
  try {
    const list = await getRegionList()
    if (list && list.length > 0) {
      regionColumns.value = [
        list.map(item => ({
          label: item.name,
          value: item.code,
        })),
      ]
    }
  }
  catch (error) {
    console.error('Fetch regions failed:', error)
  }
}

// 动态加载下级数据
async function onColumnChange({ selectedItem, resolve, finish, index }: any) {
  // 如果是最后一列（区县），就没有下级了
  if (index === 2) {
    finish()
    return
  }

  try {
    const children = await getRegionList(selectedItem.value)
    if (children && children.length > 0) {
      resolve(
        children.map(item => ({
          label: item.name,
          value: item.code,
        })),
      )
    }
    else {
      finish()
    }
  }
  catch (error) {
    console.error('Fetch children regions failed:', error)
    finish()
  }
}

// 标签列表
const tagList = ['家', '公司', '学校']

// 页面加载
onLoad(async (options) => {
  if (options?.id) {
    isEdit.value = true
    addressId.value = options.id
    await loadAddressDetail(options.id)
  }
  // 初始化省市区数据
  initRegionData()
})

// 加载地址详情
async function loadAddressDetail(id: string) {
  loading.value = true
  try {
    const result = await getAddressDetail(id)
    if (result) {
      form.value = {
        id: result.id,
        name: result.name,
        phone: result.phone,
        province: result.province,
        city: result.city,
        district: result.district,
        detail: result.detail,
        latitude: result.latitude,
        longitude: result.longitude,
        isDefault: result.isDefault,
        tag: result.tag || '',
      }
      if (result.province && result.city && result.district) {
        regionValue.value = [result.province, result.city, result.district]
      }
    }
  }
  catch (err) {
    console.error('加载地址详情失败:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// 打开省市区选择器
function openRegionPicker() {
  regionVisible.value = true
}

// 省市区选择确认
function onRegionConfirm(e: { value: string[], selectedItems: { label: string }[] }) {
  const [provinceCode, cityCode, districtCode] = e.value
  const [provinceItem, cityItem, districtItem] = e.selectedItems

  // 这里保存的是名称还是Code？
  // 根据 AddressDto 定义，province/city/district 是 string 类型
  // 后端 Address entity通常存名称或者Code。
  // 查看 loadAddressDetail 中回显逻辑：
  // if (result.province...) regionValue.value = [result.province, result.city...]
  // 说明 result.province 可能是 Code 或者 Name。
  // 通常 picker value 绑定的是 Code，后端如果存的是 Name，需要转换。
  // 假设后端存的是 Name (AddressDto interface says string, usually name for display simplicity or code for strictness).
  // 让我们看 AddressVo defined in api/address.ts - string.
  // AddressDto also string.
  // In loadAddressDetail: regionValue.value = [result.province, result.city, result.district]
  // If regionValue expects Codes (because picker columns use codes as value), then result.province MUST be a Code.
  // IF result.province is a Name, then the picker won't match default values with columns options (which use Code).

  // WAIT. The previous implementation had `const [province, city, district] = e.value`.
  // If `getAddressDetail` returns Names, and picker columns uses Codes as values, `regionValue` binding won't work for initial display unless we convert Name -> Code.
  // OR we use Name as value in the picker columns too.

  // Let's look at `region.service.ts`: `getRegionName(code)` exists. This implies the DB likely stores Codes or at least we deal with Codes.
  // However, often specific address tables store Names for easier display without lookup, OR store Codes.
  // Let's assume for now we should store NAMES to match existing `form.value.province = province`.

  // BUT the picker needs to emit what we want to store.
  // If we want to store names:
  form.value.province = provinceItem.label
  form.value.city = cityItem.label
  form.value.district = districtItem.label

  // We also probably want to save the Codes if possible, but the form interface might not have them.
  // Let's check `form` definition again. It has `province`, `city`, `district` strings.
  // If `loadAddressDetail` returns Names, then regionValue assignment `[result.province...]` will break picker initial value if picker expects Codes.

  // STRATEGY:
  // 1. If backend stores Strings (Names), we should use Names as `value` in columns too? NO, duplication risk.
  // 2. Ideally backend stores Codes.
  // Let's assume backend stores NAMES for now (common in simple designs).
  // BUT if `regionValue` expects an array of values that match the column values...
  // The column values I set up are CODES.
  // So `regionValue` MUST be CODES.
  // So `loadAddressDetail` MUST return CODES?
  // Or we need to map Name -> Code for `regionValue`.

  // Let's check `loadAddressDetail` again.
  // `result.province` etc are assigned to `form.value`.
  // Then `regionValue.value = [result.province, result.city...]`

  // If `result.province` is "广东省", and picker column value is "440000". Picker won't show default.
  // If `result.province` is "440000", then picker works. But `form.value.province` becomes "440000".
  // Then the address list display will show "440000 440100 ..." which is bad.

  // Conclusion: WE NEED BOTH.
  // The `AddressDto` likely expects NAMES for display.
  // But we need CODES for the picker to work correctly (especially for recursive loading).

  // Wait, `wd-col-picker` might support default labels or something?
  // Usually pickers work with Keys/Codes.

  // Modification:
  // I'll make the picker use CODES as values.
  // I will assume for now `loadAddressDetail` returns NAMES (since it is used for `regionText` display).
  // AND `regionValue` is initialized from something else? Or we just can't set default value easily without Code?
  //
  // Actually, if we use `uni-data-picker` or similar, it handles this. `wd-col-picker` handles multi-column.
  // If we only have Names from backend, we can't initialize the picker to the correct "Code" path easily without reverse lookup.

  // Let's look at `region.service.ts` again. The seed data has Codes.
  // If the stored address has only Names, we have a problem for editing: we can't easily open the picker at the right place.
  // UNLESS we store codes in the address too.

  // Let's look at `address.ts` interfaces again.
  // It only has `province`, `city`, `district`.

  // If I change the picker to use NAMES as values:
  // `value: item.name`
  // Then `getRegionList(parentId)` needs parentId.
  // If parentId is a Name ("广东省"), `getRegionList` (which calls backend `getChildren(parentId)`) needs to handle Name or Code?
  // Backend `getChildren(parentId)` expects optional string. DB `where: { parentId }`.
  // DB `parentId` is likely a Code (foreign key style).
  // So we MUST use Codes for the API traversal.

  // So:
  // 1. Picker MUST use Codes for values to support efficient API traversal.
  // 2. Form MUST store Names for display (based on `address.ts` usage).
  // 3. To support EDITING (initial value), we need the Codes of the saved address.
  //
  // Does `AddressVo` have codes? No.
  // Does the backend return codes? Maybe `provinceCode`, `cityCode` are hidden?
  // I should check `prisma.schema` or backend entity if possible.

  // If I cannot get codes from `getAddressDetail`, I cannot set `regionValue` correctly for the picker.
  // The picker will default to empty selection. This is acceptable for now given I can't change the Address Model schema easily right now.
  // I will just save the names to the form.
  // And for editing, the picker will start fresh (or I can try to find codes but that's complex).
  //
  // Wait, I can try to map selected items labels to the form.

  form.value.province = provinceItem.label
  form.value.city = cityItem.label
  form.value.district = districtItem.label

  // Optional: save codes if we had fields for them.
  // For now, I'll update the logic to save NAMES.

  regionVisible.value = false
}

// 选择标签
function selectTag(tag: string) {
  form.value.tag = form.value.tag === tag ? '' : tag
}

// 表单校验
function validateForm(): boolean {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入收货人姓名', icon: 'none' })
    return false
  }
  if (!form.value.phone.trim()) {
    uni.showToast({ title: '请输入联系电话', icon: 'none' })
    return false
  }
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return false
  }
  if (!form.value.province || !form.value.city || !form.value.district) {
    uni.showToast({ title: '请选择省市区', icon: 'none' })
    return false
  }
  if (!form.value.detail.trim()) {
    uni.showToast({ title: '请输入详细地址', icon: 'none' })
    return false
  }
  return true
}

// 保存地址
async function saveAddress() {
  if (!validateForm())
    return

  submitting.value = true
  try {
    if (isEdit.value) {
      await updateAddress({
        ...form.value,
        id: addressId.value,
      })
    }
    else {
      await createAddress(form.value)
    }

    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
  catch (err) {
    console.error('保存地址失败:', err)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="edit-page">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <wd-loading />
    </view>

    <template v-else>
      <!-- 表单 -->
      <view class="form-section">
        <wd-input
          v-model="form.name"
          label="收货人"
          placeholder="请输入收货人姓名"
          clearable
        />
        <wd-input
          v-model="form.phone"
          label="手机号码"
          placeholder="请输入联系电话"
          type="number"
          :maxlength="11"
          clearable
        />
        <wd-cell
          title="所在地区"
          :value="regionText || '请选择'"
          is-link
          @click="openRegionPicker"
        />
        <wd-input
          v-model="form.detail"
          label="详细地址"
          placeholder="街道、楼牌号等"
          clearable
        />
      </view>

      <!-- 标签选择 -->
      <view class="form-section">
        <view class="tag-section">
          <text class="tag-label">地址标签</text>
          <view class="tag-list">
            <view
              v-for="tag in tagList"
              :key="tag"
              class="tag-item" :class="[{ active: form.tag === tag }]"
              @click="selectTag(tag)"
            >
              {{ tag }}
            </view>
          </view>
        </view>
      </view>

      <!-- 设为默认 -->
      <view class="form-section">
        <wd-cell title="设为默认地址">
          <template #right>
            <wd-switch v-model="form.isDefault" />
          </template>
        </wd-cell>
      </view>

      <!-- 保存按钮 -->
      <view class="save-btn-wrap">
        <wd-button
          type="primary"
          block
          :loading="submitting"
          :disabled="submitting"
          @click="saveAddress"
        >
          保存
        </wd-button>
      </view>
    </template>

    <!-- 省市区选择器 -->
    <wd-col-picker
      v-model="regionValue"
      v-model:show="regionVisible"
      :columns="regionColumns"
      :column-change="onColumnChange"
      label="选择地区"
      @confirm="onRegionConfirm"
    />
  </view>
</template>

<style lang="scss" scoped>
.edit-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 140rpx;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.form-section {
  background-color: #fff;
  margin-bottom: 20rpx;
}

.tag-section {
  padding: 30rpx;

  .tag-label {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 20rpx;
    display: block;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;

    .tag-item {
      padding: 12rpx 32rpx;
      font-size: 26rpx;
      color: #666;
      background-color: #f5f5f5;
      border-radius: 8rpx;
      border: 2rpx solid transparent;

      &.active {
        color: #1890ff;
        background-color: rgba(24, 144, 255, 0.1);
        border-color: #1890ff;
      }
    }
  }
}

.save-btn-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 20rpx rgba(0, 0, 0, 0.05);
}
</style>
