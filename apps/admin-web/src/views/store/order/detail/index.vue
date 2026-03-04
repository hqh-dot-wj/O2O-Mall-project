<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAvatar,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NInput,
  NInputNumber,
  NModal,
  NSpace,
  NSpin,
  NTable,
  NTag,
  NText
} from 'naive-ui';
import { useAuth } from '@/hooks/business/auth';
import { useBoolean } from '@sa/hooks';
import {
  fetchGetOrderDetail,
  fetchPartialRefundOrder,
  fetchReassignWorker,
  fetchRefundOrder,
  fetchVerifyService
} from '@/service/api/store/order';

defineOptions({
  name: 'OrderDetail'
});

const route = useRoute();
const router = useRouter();
const { hasAuth } = useAuth();
const orderId = computed(() => route.query.id as string);

// 订单状态映射
const orderStatusRecord: Record<string, { label: string; type: NaiveUI.ThemeColor }> = {
  PENDING_PAY: { label: '待支付', type: 'warning' },
  PAID: { label: '已支付', type: 'info' },
  PENDING_SERVICE: { label: '待服务', type: 'primary' },
  PENDING_DELIVERY: { label: '待发货', type: 'primary' },
  SHIPPED: { label: '已发货', type: 'primary' },
  COMPLETED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'default' },
  REFUNDED: { label: '已退款', type: 'error' }
};

// 佣金状态映射
const commissionStatusRecord: Record<string, { label: string; type: NaiveUI.ThemeColor }> = {
  FROZEN: { label: '🕒冻结中', type: 'warning' },
  SETTLED: { label: '✅已结算', type: 'success' },
  CANCELLED: { label: '❌已取消', type: 'error' }
};

// 数据状态
const loading = ref(true);
const orderData = ref<Api.Order.DetailResult | null>(null);

// 操作弹窗
const { bool: verifyModalVisible, setTrue: openVerifyModal, setFalse: closeVerifyModal } = useBoolean(false);
const { bool: refundModalVisible, setTrue: openRefundModal, setFalse: closeRefundModal } = useBoolean(false);
const { bool: partialRefundModalVisible, setTrue: openPartialRefundModal, setFalse: closePartialRefundModal } =
  useBoolean(false);
const { bool: reassignModalVisible, setTrue: openReassignModal, setFalse: closeReassignModal } = useBoolean(false);
const actionRemark = ref('');
const actionLoading = ref(false);
const newWorkerId = ref<number | null>(null);
// 部分退款：每项 { itemId, quantity }
const partialRefundItems = ref<Array<{ itemId: number; quantity: number; maxQty: number; productName: string }>>([]);

// 是否可核销：服务类订单且状态为 SHIPPED
const canVerify = computed(
  () =>
    orderData.value?.order?.orderType === 'SERVICE' &&
    orderData.value?.order?.status === 'SHIPPED' &&
    hasAuth('store:order:verify')
);

// 是否可退款：非待支付/已取消/已退款
const canRefund = computed(() => {
  const status = orderData.value?.order?.status;
  const invalid = ['PENDING_PAY', 'CANCELLED', 'REFUNDED'];
  return status && !invalid.includes(status) && hasAuth('store:order:refund');
});

// 是否可改派：服务类订单且状态为 PAID 或 SHIPPED
const canReassign = computed(() => {
  const order = orderData.value?.order;
  const status = order?.status;
  return (
    order?.orderType === 'SERVICE' &&
    (status === 'PAID' || status === 'SHIPPED') &&
    hasAuth('store:order:dispatch')
  );
});

// 加载订单详情
async function loadOrderDetail() {
  loading.value = true;
  try {
    const { data } = await fetchGetOrderDetail(orderId.value);
    orderData.value = data;
  } catch (error) {
    window.$message?.error('加载订单详情失败');
  } finally {
    loading.value = false;
  }
}

// 返回列表
function handleBack() {
  router.push({ name: 'store_order_list' });
}

/** 核销 */
function handleVerify() {
  actionRemark.value = '';
  openVerifyModal();
}

async function submitVerify() {
  if (!orderId.value) return;
  actionLoading.value = true;
  try {
    await fetchVerifyService({ orderId: orderId.value, remark: actionRemark.value || undefined });
    window.$message?.success('核销成功');
    closeVerifyModal();
    loadOrderDetail();
  } catch {
    throw new Error();
  } finally {
    actionLoading.value = false;
  }
}

/** 退款 */
function handleRefund() {
  actionRemark.value = '';
  openRefundModal();
}

async function submitRefund() {
  if (!orderId.value) return;
  actionLoading.value = true;
  try {
    await fetchRefundOrder({ orderId: orderId.value, remark: actionRemark.value || undefined });
    window.$message?.success('退款成功');
    closeRefundModal();
    loadOrderDetail();
  } catch {
    throw new Error();
  } finally {
    actionLoading.value = false;
  }
}

/** 部分退款 */
function handlePartialRefund() {
  actionRemark.value = '';
  const items = orderData.value?.order?.items ?? [];
  partialRefundItems.value = items.map((item: { id: string | number; productName: string; quantity: number }) => ({
    itemId: Number(item.id),
    quantity: 0,
    maxQty: item.quantity,
    productName: item.productName
  }));
  openPartialRefundModal();
}

async function submitPartialRefund() {
  if (!orderId.value) return;
  const items = partialRefundItems.value
    .filter(i => i.quantity > 0)
    .map(i => ({ itemId: i.itemId, quantity: i.quantity }));
  if (items.length === 0) {
    window.$message?.warning('请至少选择一项并填写退款数量');
    return;
  }
  actionLoading.value = true;
  try {
    await fetchPartialRefundOrder({ orderId: orderId.value, items, remark: actionRemark.value || undefined });
    window.$message?.success('部分退款成功');
    closePartialRefundModal();
    loadOrderDetail();
  } catch {
    throw new Error();
  } finally {
    actionLoading.value = false;
  }
}

/** 改派 */
function handleReassign() {
  newWorkerId.value = orderData.value?.worker?.id ?? null;
  openReassignModal();
}

async function submitReassign() {
  if (!orderId.value || newWorkerId.value == null || newWorkerId.value <= 0) {
    window.$message?.warning('请输入有效的技师ID');
    return;
  }
  actionLoading.value = true;
  try {
    await fetchReassignWorker({ orderId: orderId.value, newWorkerId: newWorkerId.value });
    window.$message?.success('改派成功');
    closeReassignModal();
    loadOrderDetail();
  } catch {
    throw new Error();
  } finally {
    actionLoading.value = false;
  }
}

onMounted(() => {
  loadOrderDetail();
});
</script>

<template>
  <div class="flex-col-stretch gap-16px">
    <!-- 页头 -->
    <div class="flex items-center justify-between flex-wrap gap-8px">
      <NButton text @click="handleBack">
        <template #icon>
          <icon-carbon-arrow-left />
        </template>
        返回列表
      </NButton>
      <NSpace>
        <NButton v-if="canVerify" type="primary" @click="handleVerify">核销</NButton>
        <NButton v-if="canRefund" type="error" @click="handleRefund">全额退款</NButton>
        <NButton v-if="canRefund" @click="handlePartialRefund">部分退款</NButton>
        <NButton v-if="canReassign" @click="handleReassign">改派技师</NButton>
        <NButton type="primary" @click="loadOrderDetail">刷新</NButton>
      </NSpace>
    </div>

    <NSpin :show="loading">
      <template v-if="orderData">
        <div class="flex-col-stretch gap-16px">
          <!-- 卡片1: 订单状态与客户信息 -->
          <NCard title="订单信息" :bordered="false" size="small">
            <NDescriptions :column="3" label-placement="left">
              <NDescriptionsItem label="订单号">{{ orderData.order?.orderSn }}</NDescriptionsItem>
              <NDescriptionsItem label="下单时间">{{ orderData.order?.createTime }}</NDescriptionsItem>
              <NDescriptionsItem label="订单状态">
                <NTag :type="orderStatusRecord[orderData.order?.status]?.type">
                  {{ orderStatusRecord[orderData.order?.status]?.label || orderData.order?.status }}
                </NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="客户昵称">
                <div class="flex items-center gap-8px">
                  <NAvatar v-if="orderData.customer?.avatar" :src="orderData.customer.avatar" :size="24" round />
                  {{ orderData.customer?.nickname || '-' }}
                </div>
              </NDescriptionsItem>
              <NDescriptionsItem label="客户手机">{{ orderData.customer?.mobile || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="归因信息">
                <div class="flex flex-wrap gap-8px">
                  <NTag v-if="orderData.attribution?.shareUser" type="info" size="small">
                    分享人: {{ orderData.attribution.shareUser.nickname }}
                  </NTag>
                  <NTag v-if="orderData.attribution?.referrer" type="success" size="small">
                    间接分享人: {{ orderData.attribution.referrer.nickname }}
                  </NTag>
                  <span v-if="!orderData.attribution?.shareUser && !orderData.attribution?.referrer">自然流量</span>
                </div>
              </NDescriptionsItem>
              <NDescriptionsItem label="所属商户">
                <NTag type="warning" size="small">
                  {{ orderData.business?.companyName || orderData.business?.tenantId || '-' }}
                </NTag>
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- 卡片2: 商品/服务明细 -->
          <NCard title="商品明细" :bordered="false" size="small">
            <NTable :bordered="false" :single-line="false">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>规格</th>
                  <th>单价</th>
                  <th>数量</th>
                  <th>小计</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in orderData.order?.items" :key="item.id">
                  <td>
                    <div class="flex items-center gap-8px">
                      <img :src="item.productImg" class="h-48px w-48px rounded object-cover" />
                      <span>{{ item.productName }}</span>
                    </div>
                  </td>
                  <td>{{ item.specData ? JSON.stringify(item.specData) : '-' }}</td>
                  <td>¥{{ item.price }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>¥{{ item.totalAmount }}</td>
                </tr>
              </tbody>
            </NTable>
            <div class="mt-16px flex justify-end gap-16px">
              <NText>商品总价: ¥{{ orderData.order?.totalAmount }}</NText>
              <NText>运费: ¥{{ orderData.order?.freightAmount }}</NText>
              <NText>优惠: -¥{{ orderData.order?.discountAmount }}</NText>
              <NText type="error" strong>实付: ¥{{ orderData.order?.payAmount }}</NText>
            </div>
          </NCard>

          <!-- 卡片3: 资金分配明细 (需权限) -->
          <NCard v-if="orderData.commissions" title="💰 资金分配明细" :bordered="false" size="small">
            <NTable :bordered="false" :single-line="false">
              <thead>
                <tr>
                  <th>角色</th>
                  <th>用户</th>
                  <th>分润比例</th>
                  <th>金额</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="comm in orderData.commissions" :key="comm.id">
                  <td>{{ comm.level === 1 ? '一级分销' : '二级分销' }}</td>
                  <td>
                    <div class="flex items-center gap-8px">
                      <NAvatar v-if="comm.beneficiary?.avatar" :src="comm.beneficiary.avatar" :size="24" round />
                      {{ comm.beneficiary?.nickname || comm.beneficiaryId }}
                    </div>
                  </td>
                  <td>{{ comm.rateSnapshot }}%</td>
                  <td class="text-success">+¥{{ comm.amount }}</td>
                  <td>
                    <NTag :type="commissionStatusRecord[comm.status]?.type">
                      {{ commissionStatusRecord[comm.status]?.label }}
                    </NTag>
                  </td>
                </tr>
                <!-- 佣金扣除总计行 -->
                <tr
                  v-if="
                    orderData.commissions &&
                    orderData.commissions.length > 0 &&
                    orderData.business?.totalCommissionAmount
                  "
                >
                  <td colspan="3" class="text-right font-bold">佣金扣除总计</td>
                  <td class="text-error font-bold">-¥{{ orderData.business.totalCommissionAmount }}</td>
                  <td>-</td>
                </tr>
                <!-- 商户收款行 -->
                <tr v-if="orderData.business">
                  <td>商户收款</td>
                  <td>
                    <div class="flex items-center gap-8px">
                      <span class="font-bold">{{ orderData.business.companyName }}</span>
                    </div>
                  </td>
                  <td>-</td>
                  <td class="text-success">+¥{{ orderData.business.remainingAmount }}</td>
                  <td>
                    <NTag type="info">待结算</NTag>
                  </td>
                </tr>
              </tbody>
            </NTable>
            <NText class="mt-8px block text-gray-500" depth="3">
              预计结算时间: {{ orderData.commissions?.[0]?.planSettleTime }}
            </NText>
          </NCard>

          <!-- 卡片4: 履约与派单信息 (服务类订单) -->
          <NCard
            v-if="orderData.order?.orderType === 'SERVICE' && orderData.worker"
            title="履约信息"
            :bordered="false"
            size="small"
          >
            <NDescriptions :column="2" label-placement="left">
              <NDescriptionsItem label="技师">
                <div class="flex items-center gap-8px">
                  <NAvatar v-if="orderData.worker?.avatar" :src="orderData.worker.avatar" :size="32" round />
                  {{ orderData.worker?.name }}
                </div>
              </NDescriptionsItem>
              <NDescriptionsItem label="电话">{{ orderData.worker?.phone }}</NDescriptionsItem>
              <NDescriptionsItem label="评分">{{ orderData.worker?.rating || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="预约时间">{{ orderData.order?.bookingTime }}</NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- 卡片5: 收货信息 -->
          <NCard title="收货信息" :bordered="false" size="small">
            <NDescriptions :column="2" label-placement="left">
              <NDescriptionsItem label="收货人">{{ orderData.order?.receiverName }}</NDescriptionsItem>
              <NDescriptionsItem label="联系电话">{{ orderData.order?.receiverPhone }}</NDescriptionsItem>
              <NDescriptionsItem label="收货地址" :span="2">{{ orderData.order?.receiverAddress }}</NDescriptionsItem>
              <NDescriptionsItem v-if="orderData.order?.remark" label="备注" :span="2">
                {{ orderData.order?.remark }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>
        </div>
      </template>
    </NSpin>

    <!-- 核销弹窗 -->
    <NModal
      v-model:show="verifyModalVisible"
      title="强制核销"
      preset="dialog"
      positive-text="确认核销"
      :loading="actionLoading"
      @positive-click="submitVerify"
    >
      <NInput v-model:value="actionRemark" type="textarea" placeholder="核销备注（选填）" :rows="3" class="mt-12px" />
    </NModal>

    <!-- 全额退款弹窗 -->
    <NModal
      v-model:show="refundModalVisible"
      title="全额退款"
      preset="dialog"
      positive-text="确认退款"
      :loading="actionLoading"
      @positive-click="submitRefund"
    >
      <NInput v-model:value="actionRemark" type="textarea" placeholder="退款原因（选填）" :rows="3" class="mt-12px" />
    </NModal>

    <!-- 部分退款弹窗 -->
    <NModal
      v-model:show="partialRefundModalVisible"
      title="部分退款"
      preset="dialog"
      positive-text="确认退款"
      :loading="actionLoading"
      @positive-click="submitPartialRefund"
    >
      <div class="mt-12px space-y-8px">
        <p class="text-gray-600 text-14px">选择要退款的商品及数量：</p>
        <div
          v-for="row in partialRefundItems"
          :key="row.itemId"
          class="flex items-center justify-between gap-12px py-8px border-b border-gray-100"
        >
          <span class="flex-1 truncate">{{ row.productName }}</span>
          <NInputNumber
            v-model:value="row.quantity"
            :min="0"
            :max="row.maxQty"
            :placeholder="`最多 ${row.maxQty}`"
            class="w-120px"
          />
        </div>
        <NInput
          v-model:value="actionRemark"
          type="textarea"
          placeholder="退款原因（选填）"
          :rows="2"
          class="mt-8px"
        />
      </div>
    </NModal>

    <!-- 改派弹窗 -->
    <NModal
      v-model:show="reassignModalVisible"
      title="改派技师"
      preset="dialog"
      positive-text="确认改派"
      :loading="actionLoading"
      @positive-click="submitReassign"
    >
      <div class="mt-12px">
        <p class="text-gray-600 text-14px mb-8px">请输入新技师的 ID（可在技师管理中查看）：</p>
        <NInputNumber v-model:value="newWorkerId" placeholder="技师ID" :min="1" class="w-full" />
      </div>
    </NModal>
  </div>
</template>

<style scoped>
.text-success {
  color: #18a058;
}
.text-error {
  color: #d03050;
}
.font-bold {
  font-weight: 600;
}
.text-right {
  text-align: right;
}
</style>
