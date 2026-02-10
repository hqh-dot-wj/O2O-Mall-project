<script setup lang="ts">
import { useRouter } from 'vue-router';

defineOptions({
  name: 'MemberPointsAccounts'
});

const router = useRouter();
// 会员-积分账户 与 营销-积分账户 使用同一业务页面，重定向到营销积分账户
router.replace('/marketing/points/accounts');
</script>

<template>
  <div class="flex items-center justify-center p-8">
    <span>正在跳转到积分账户...</span>
  </div>
</template>
