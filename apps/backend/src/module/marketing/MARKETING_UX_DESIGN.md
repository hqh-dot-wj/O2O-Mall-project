# 营销活动 UX 设计方案

## 设计目标

**核心原则：渐进式信息披露 (Progressive Disclosure)**
- 减少用户认知负担
- 优先展示最重要的营销信息
- 按需展开详细规则
- 清晰的视觉层级

---

## 一、商品详情页 - 营销活动展示

### 1.1 信息架构（优先级排序）

```
┌─────────────────────────────────────────┐
│  商品主图 + 价格                          │
│  ┌─────────────────────────────────┐    │
│  │ 🏷️ 营销活动标签栏（横向滚动）      │    │
│  │ [秒杀] [拼团] [满减] [拼班课程]   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📍 当前选中活动详情卡片                  │
│  ┌─────────────────────────────────┐    │
│  │ 秒杀价 ¥299  原价 ¥599           │    │
│  │ ⏰ 距结束 02:34:12               │    │
│  │ 📦 已售 234/500                  │    │
│  │ [立即抢购]                       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  商品详情...                             │
└─────────────────────────────────────────┘
```

### 1.2 设计规则


#### 活动标签设计
- **横向滚动标签栏**：避免垂直堆叠造成页面过长
- **视觉优先级**：
  - 🔥 进行中活动：品牌色背景 + 白色文字
  - ⏰ 即将开始：浅色背景 + 倒计时
  - ✓ 已参与：绿色边框 + 勾选图标
  - 灰色：已结束/不可参与

#### 活动卡片内容（渐进式展开）
```
默认状态（折叠）：
┌──────────────────────────────┐
│ 🎯 拼班课程                   │
│ ¥199/人 · 3人成团            │
│ 📍 仅限 5km 内用户参与        │
│ [查看详情 ▼]                 │
└──────────────────────────────┘

展开状态：
┌──────────────────────────────┐
│ 🎯 拼班课程                   │
│ ¥199/人 · 3人成团            │
│ 📍 仅限 5km 内用户参与        │
│                              │
│ 活动规则：                    │
│ • 成团时间：24小时内          │
│ • 退款规则：未成团自动退款     │
│ • 佣金规则：发起人获得全部佣金 │
│                              │
│ [我要参团] [我要发起拼班 👑]  │
└──────────────────────────────┘
```


---

## 二、营销活动聚合页设计

### 2.1 页面结构

```
┌─────────────────────────────────────────┐
│  🔥 秒杀专区                             │
│  ┌─────────────────────────────────┐    │
│  │  [横向大图 Banner]               │    │
│  │  限时秒杀 · 每日10点更新          │    │
│  │  ⏰ 距下一场 02:34:12            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  筛选栏：                                │
│  [全部] [进行中] [即将开始] [价格排序]   │
│                                         │
│  商品列表（Grid 布局）：                 │
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │商品1│ │商品2│ │商品3│              │
│  │¥299 │ │¥199 │ │¥399 │              │
│  │原价 │ │原价 │ │原价 │              │
│  │¥599 │ │¥399 │ │¥799 │              │
│  │🔥50%│ │🔥50%│ │🔥50%│              │
│  └─────┘ └─────┘ └─────┘              │
└─────────────────────────────────────────┘
```

### 2.2 活动类型聚合页

建议创建以下独立聚合页：

| 活动类型 | 页面路由 | 核心元素 |
|---------|---------|---------|
| 秒杀专区 | `/marketing/flash-sale` | 倒计时 + 进度条 + 库存显示 |
| 拼团专区 | `/marketing/group-buy` | 成团进度 + 参与人数 + 剩余时间 |
| 拼班课程 | `/marketing/class-group` | 地图定位 + 距离筛选 + 发起按钮 |
| 满减活动 | `/marketing/discount` | 价格阶梯 + 凑单推荐 |


---

## 三、拼班课程特殊设计

### 3.1 地理位置筛选

```
┌─────────────────────────────────────────┐
│  📍 拼班课程（仅限附近用户）              │
│                                         │
│  当前位置：北京市朝阳区                   │
│  [重新定位]                              │
│                                         │
│  距离筛选：                              │
│  ○ 1km  ● 3km  ○ 5km  ○ 10km          │
│                                         │
│  🗺️ [地图视图] [列表视图]               │
└─────────────────────────────────────────┘
```

### 3.2 发起拼班权限设计

**权限判断逻辑：**
- 仅 C1/C2 用户可见"发起拼班"按钮
- 普通用户只能看到"参与拼班"

**UI 实现：**

```typescript
// 按钮显示逻辑
{userLevel === 'C1' || userLevel === 'C2' ? (
  <div className="flex gap-2">
    <Button variant="outline">参与拼班</Button>
    <Button variant="primary" className="relative">
      👑 发起拼班
      <Badge className="absolute -top-2 -right-2">
        佣金全归你
      </Badge>
    </Button>
  </div>
) : (
  <Button variant="primary">参与拼班</Button>
)}
```


### 3.3 发起拼班流程

```
步骤 1: 选择课程参数
┌──────────────────────────────┐
│ 选择上课时间：                │
│ ○ 周一 19:00-21:00           │
│ ● 周三 19:00-21:00           │
│ ○ 周五 19:00-21:00           │
│                              │
│ 选择上课地点：                │
│ ● 朝阳校区（距你 2.3km）      │
│ ○ 海淀校区（距你 8.7km）      │
└──────────────────────────────┘

步骤 2: 确认发起
┌──────────────────────────────┐
│ 📋 拼班详情                   │
│ 课程：Python 入门课           │
│ 时间：周三 19:00-21:00        │
│ 地点：朝阳校区                │
│ 价格：¥199/人 · 3人成团      │
│                              │
│ 💰 佣金收益预估               │
│ 成团后可获得：¥89            │
│ （3人 × ¥29.7/人）           │
│                              │
│ [确认发起]                   │
└──────────────────────────────┘
```


---

## 四、同商品多活动参数处理

### 4.1 问题场景
同一商品可能有：
- 拼班课程 A：周一 19:00 @ 朝阳校区
- 拼班课程 B：周三 19:00 @ 朝阳校区
- 拼班课程 C：周一 19:00 @ 海淀校区

### 4.2 解决方案：二级筛选

```
商品详情页：
┌─────────────────────────────────────────┐
│  🎯 拼班课程（3个班次可选）               │
│                                         │
│  筛选条件：                              │
│  时间：[全部] [周一] [周三] [周五]       │
│  地点：[全部] [朝阳] [海淀]              │
│                                         │
│  可选班次：                              │
│  ┌─────────────────────────────────┐    │
│  │ 周一 19:00 · 朝阳校区            │    │
│  │ ¥199/人 · 还差1人成团            │    │
│  │ [参与] [发起新班 👑]             │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 周三 19:00 · 朝阳校区            │    │
│  │ ¥199/人 · 还差2人成团            │    │
│  │ [参与] [发起新班 👑]             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 4.3 数据结构建议

```typescript
interface MarketingActivity {
  id: string;
  productId: string;
  type: 'flash_sale' | 'group_buy' | 'class_group' | 'discount';
  
  // 基础信息
  name: string;
  price: number;
  originalPrice: number;
  
  // 拼班特有参数
  classParams?: {
    schedule: string;      // "周一 19:00-21:00"
    location: string;       // "朝阳校区"
    locationCoords: {
      lat: number;
      lng: number;
    };
    maxDistance: number;    // 最大距离（km）
    minParticipants: number; // 最少成团人数
  };
  
  // 状态
  status: 'pending' | 'active' | 'ended';
  currentParticipants: number;
}
```


---

## 五、视觉设计规范

### 5.1 活动类型色彩系统

| 活动类型 | 主色 | 辅助色 | 图标 | 使用场景 |
|---------|------|--------|------|---------|
| 秒杀 | `#FF4D4F` | `#FFF1F0` | ⚡ | 紧迫感、限时 |
| 拼团 | `#FF6B35` | `#FFF7E6` | 👥 | 社交、团购 |
| 拼班课程 | `#722ED1` | `#F9F0FF` | 🎓 | 教育、专业 |
| 满减 | `#52C41A` | `#F6FFED` | 💰 | 优惠、省钱 |

### 5.2 活动标签设计

```css
/* 秒杀标签 */
.badge-flash-sale {
  background: linear-gradient(135deg, #FF4D4F 0%, #FF7875 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* 拼班课程标签 */
.badge-class-group {
  background: linear-gradient(135deg, #722ED1 0%, #9254DE 100%);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* 距离标签 */
.badge-distance {
  background: #F0F0F0;
  color: #595959;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}
```


### 5.3 卡片层级系统

```css
/* 一级卡片：活动主卡片 */
.card-primary {
  background: white;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
}

.card-primary:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
  cursor: pointer;
}

/* 二级卡片：活动详情展开 */
.card-secondary {
  background: #FAFAFA;
  border: 1px solid #E8E8E8;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
}

/* 高亮卡片：当前选中活动 */
.card-highlighted {
  background: linear-gradient(135deg, #FFF7E6 0%, #FFFBF0 100%);
  border: 2px solid #FFA940;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(255, 169, 64, 0.2);
}
```


---

## 六、交互设计细节

### 6.1 活动切换动画

```typescript
// 使用 Framer Motion 实现平滑切换
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence mode="wait">
  <motion.div
    key={selectedActivity.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2 }}
  >
    <ActivityCard activity={selectedActivity} />
  </motion.div>
</AnimatePresence>
```

### 6.2 倒计时组件

```typescript
// 实时倒计时显示
const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(endTime));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);
  
  return (
    <div className="flex items-center gap-1 text-red-500 font-mono">
      <ClockIcon className="w-4 h-4" />
      <span>{timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}</span>
    </div>
  );
};
```

### 6.3 地理位置权限处理

```typescript
// 优雅的权限请求流程
const requestLocationPermission = async () => {
  if (!navigator.geolocation) {
    showToast('您的浏览器不支持定位功能', 'warning');
    return null;
  }
  
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
  } catch (error) {
    showModal({
      title: '需要位置权限',
      content: '拼班课程需要获取您的位置以筛选附近的班次',
      actions: [
        { label: '手动输入地址', onClick: () => showAddressInput() },
        { label: '重新授权', onClick: () => requestLocationPermission() }
      ]
    });
    return null;
  }
};
```


---

## 七、用户心智负担优化策略

### 7.1 信息优先级金字塔

```
           最重要
         ┌─────────┐
         │ 价格+CTA │  ← 用户最关心
         └─────────┘
        ┌───────────┐
        │ 活动类型   │  ← 快速识别
        │ + 倒计时   │
        └───────────┘
      ┌─────────────┐
      │ 成团进度     │  ← 社交证明
      │ 参与人数     │
      └─────────────┘
    ┌───────────────┐
    │ 详细规则       │  ← 按需展开
    │ 退款政策       │
    └───────────────┘
```

### 7.2 减少决策疲劳

**问题：** 用户面对多个活动不知道选哪个

**解决方案：**
1. **智能推荐标签**
   ```
   ┌──────────────────────────────┐
   │ 🏆 最划算                     │
   │ 拼团价 ¥199（省¥400）         │
   └──────────────────────────────┘
   
   ┌──────────────────────────────┐
   │ 🔥 最热门                     │
   │ 已有 234 人参与               │
   └──────────────────────────────┘
   
   ┌──────────────────────────────┐
   │ ⚡ 即将结束                   │
   │ 仅剩 2 小时                   │
   └──────────────────────────────┘
   ```

2. **活动对比表**（当用户犹豫时）
   ```
   ┌─────────────────────────────────────┐
   │ 活动对比                             │
   ├──────────┬──────────┬──────────────┤
   │          │ 秒杀     │ 拼团          │
   ├──────────┼──────────┼──────────────┤
   │ 价格     │ ¥299     │ ¥199         │
   │ 时效     │ 2小时    │ 24小时       │
   │ 库存     │ 剩50个   │ 无限制       │
   │ 推荐     │ 立即购买 │ 邀请好友省钱 │
   └──────────┴──────────┴──────────────┘
   ```


### 7.3 渐进式表单设计（发起拼班）

**传统方式（❌ 认知负担高）：**
```
一次性展示所有字段：
- 选择课程
- 选择时间
- 选择地点
- 设置人数
- 设置价格
- 阅读规则
- 确认发起
```

**优化方式（✅ 分步引导）：**
```
步骤 1/3: 选择课程
┌──────────────────────────────┐
│ 您想发起哪个课程的拼班？       │
│ ○ Python 入门                │
│ ● Java 进阶                  │
│ ○ 前端开发                   │
│         [下一步]              │
└──────────────────────────────┘

步骤 2/3: 选择时间和地点
┌──────────────────────────────┐
│ 选择上课时间：                │
│ ● 周三 19:00-21:00           │
│                              │
│ 选择上课地点：                │
│ ● 朝阳校区（距你 2.3km）      │
│         [下一步]              │
└──────────────────────────────┘

步骤 3/3: 确认发起
┌──────────────────────────────┐
│ 📋 拼班详情                   │
│ 课程：Java 进阶               │
│ 时间：周三 19:00-21:00        │
│ 地点：朝阳校区                │
│ 价格：¥199/人 · 3人成团      │
│                              │
│ 💰 预估收益：¥89             │
│         [确认发起]            │
└──────────────────────────────┘
```


---

## 八、移动端适配要点

### 8.1 活动标签横向滚动

```css
/* 移动端横向滚动优化 */
.activity-tabs {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: 8px;
  padding: 12px 16px;
  
  /* 隐藏滚动条但保持功能 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.activity-tabs::-webkit-scrollbar {
  display: none;
}

.activity-tab {
  flex-shrink: 0;
  scroll-snap-align: start;
  padding: 8px 16px;
  border-radius: 20px;
  white-space: nowrap;
}
```

### 8.2 底部固定 CTA

```typescript
// 移动端底部固定购买按钮
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
  <div className="flex items-center justify-between mb-2">
    <div>
      <div className="text-xs text-gray-500">拼团价</div>
      <div className="text-2xl font-bold text-red-500">¥199</div>
    </div>
    <Button size="lg" className="flex-1 ml-4">
      立即参团
    </Button>
  </div>
  
  {/* 活动快速切换 */}
  <div className="flex gap-2 overflow-x-auto">
    <Badge variant="outline">秒杀 ¥299</Badge>
    <Badge variant="solid">拼团 ¥199</Badge>
    <Badge variant="outline">满减 满300减50</Badge>
  </div>
</div>
```


---

## 九、实现优先级建议

### Phase 1: MVP（最小可行产品）
- [ ] 商品详情页活动标签栏（横向滚动）
- [ ] 单个活动详情卡片展示
- [ ] 基础的活动聚合页（秒杀、拼团）
- [ ] 简单的筛选功能

### Phase 2: 核心功能
- [ ] 拼班课程地理位置筛选
- [ ] C1/C2 发起拼班权限控制
- [ ] 活动详情渐进式展开
- [ ] 倒计时组件
- [ ] 成团进度显示

### Phase 3: 体验优化
- [ ] 智能推荐标签（最划算、最热门）
- [ ] 活动对比表
- [ ] 分步表单（发起拼班）
- [ ] 平滑动画过渡
- [ ] 地图视图

### Phase 4: 高级功能
- [ ] 个性化推荐算法
- [ ] 实时成团通知
- [ ] 社交分享优化
- [ ] A/B 测试框架

---

## 十、关键指标监控

### 用户行为指标
- **活动点击率**：各活动类型的点击率对比
- **转化率**：从浏览到购买的转化漏斗
- **平均决策时间**：用户从进入页面到下单的时间
- **活动切换次数**：用户在不同活动间切换的频率

### 体验指标
- **页面加载时间**：< 2s
- **交互响应时间**：< 100ms
- **错误率**：权限判断、地理位置获取失败率
- **用户满意度**：NPS 评分

### 业务指标
- **拼班发起率**：C1/C2 用户的发起比例
- **成团率**：各活动类型的成团成功率
- **客单价**：不同活动的平均订单金额
- **复购率**：参与活动后的复购情况

---

## 附录：技术栈建议

### 前端框架
- **Vue 3 + TypeScript**（当前项目技术栈）
- **Pinia**：状态管理（活动数据、用户位置）
- **VueUse**：组合式工具库（地理位置、倒计时）

### UI 组件库
- **Element Plus** 或 **Ant Design Vue**
- **Tailwind CSS**：快速样式开发
- **Framer Motion Vue**：动画效果

### 地图服务
- **高德地图 API**：地理位置、距离计算
- **腾讯地图 API**：备选方案

### 性能优化
- **虚拟滚动**：长列表优化（活动商品列表）
- **图片懒加载**：商品图片按需加载
- **骨架屏**：提升感知性能

---

## 总结

这套设计方案的核心思想是：

1. **渐进式信息披露**：不一次性展示所有信息，按需展开
2. **清晰的视觉层级**：用颜色、大小、位置区分信息重要性
3. **减少决策疲劳**：智能推荐、对比表帮助用户快速决策
4. **权限可见性**：C1/C2 特权功能明确标识
5. **地理位置友好**：优雅处理定位权限和距离筛选

通过这些设计，用户可以快速理解活动规则，轻松参与或发起拼班，最终提升转化率和用户满意度。
