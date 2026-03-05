# 小程序架构清单

> **编写日期**: 2026-03-05  
> **文档类型**: 架构梳理 / 现状清单  
> **用途**: 为后续搭建决策提供结构化的现状视图

---

## 1. 页面清单

| 路径                            | 文件                               | 用途         | Tabbar | 备注                                     |
| ------------------------------- | ---------------------------------- | ------------ | ------ | ---------------------------------------- |
| `/pages/index/index`            | `pages/index/index.vue`            | 首页         | ✅     | 当前为 unibest 模板，无业务内容          |
| `/pages/category/category`      | `pages/category/category.vue`      | 商品分类     | ✅     | 已对接：分类树、商品列表、租户切换       |
| `/pages/cart/cart`              | `pages/cart/cart.vue`              | 购物车       | ✅     | 已对接 cart store                        |
| `/pages/me/me`                  | `pages/me/me.vue`                  | 个人中心     | ✅     | 用户信息、入口导航                       |
| `/pages/product/detail`         | `pages/product/detail.vue`         | 商品详情     | -      | 已对接：商品详情、营销活动展示、加购     |
| `/pages/order/create`           | `pages/order/create.vue`           | 下单         | -      | 已对接：结算预览、创建订单、营销参数     |
| `/pages/order/list`             | `pages/order/list.vue`             | 订单列表     | -      | 已对接 order API                         |
| `/pages/order/detail`           | `pages/order/detail.vue`           | 订单详情     | -      | 已对接                                   |
| `/pages/address/list`           | `pages/address/list.vue`           | 地址列表     | -      | 已对接 address API                       |
| `/pages/address/edit`           | `pages/address/edit.vue`           | 地址编辑     | -      | 新建/编辑                                |
| `/pages/pay/result`             | `pages/pay/result.vue`             | 支付结果     | -      | 支付成功/失败                            |
| `/pages/marketing/detail`       | `pages/marketing/detail.vue`       | 活动详情     | -      | **TODO**：使用 Mock 数据，待对接实例 API |
| `/pages/upgrade/referral-code`  | `pages/upgrade/referral-code.vue`  | 我的邀请码   | -      | 已对接 upgrade API                       |
| `/pages/upgrade/team`           | `pages/upgrade/team.vue`           | 我的团队     | -      | 已对接                                   |
| `/pages-auth/login`             | `pages-auth/login.vue`             | 登录         | -      | 微信/手机号登录                          |
| `/pages-auth/register`          | `pages-auth/register.vue`          | 注册         | -      | -                                        |
| `/pages/preview/product-detail` | `pages/preview/product-detail.vue` | 营销预览     | -      | Admin 配置预览用                         |
| `/pages/preview/card`           | `pages/preview/card.vue`           | 营销卡片预览 | -      | Admin 配置预览用                         |

---

## 2. 组件清单

### 2.1 全局组件 (`src/components/`)

| 组件                   | 路径                                                       | 用途                           |
| ---------------------- | ---------------------------------------------------------- | ------------------------------ |
| `tenant-selector`      | `components/tenant-selector/tenant-selector.vue`           | 租户选择弹窗，展示附近租户列表 |
| `global-auth-modal`    | `components/global-auth-modal/global-auth-modal.vue`       | 全局登录/授权弹窗              |
| `user-agreement-popup` | `components/user-agreement-popup/user-agreement-popup.vue` | 用户协议弹窗                   |
| `address-selector`     | `components/address-selector/address-selector.vue`         | 地址选择器                     |
| `service-time-picker`  | `components/service-time-picker/service-time-picker.vue`   | 服务时段选择                   |
| `ActivityWidgetLoader` | `components/activity-widgets/ActivityWidgetLoader.vue`     | 营销活动组件加载器             |
| `GroupBuyWidget`       | `components/activity-widgets/GroupBuyWidget.vue`           | 拼团活动展示组件               |

### 2.2 页面级组件 (`src/pages/*/components/`)

| 页面             | 组件                   | 用途           |
| ---------------- | ---------------------- | -------------- |
| marketing/detail | `group-buy-widget.vue` | 拼团活动交互区 |
| marketing/detail | `course-widget.vue`    | 课程拼团交互区 |

---

## 3. API 映射表

### 3.1 已对接接口（小程序 API → 后端路径）

| 小程序 API 文件  | 接口               | 后端路径                            | 说明                               |
| ---------------- | ------------------ | ----------------------------------- | ---------------------------------- |
| `api/login.ts`   | wxLogin            | POST /client/auth/check-login       | 微信静默登录检查                   |
| `api/login.ts`   | mobileLogin        | POST /client/auth/register-mobile   | 手机号登录/注册                    |
| `api/login.ts`   | wxRegister         | POST /client/auth/register          | 微信注册（头像+昵称）              |
| `api/login.ts`   | getUserInfo        | GET /client/user/info               | 用户信息                           |
| `api/login.ts`   | logout             | GET /client/auth/logout             | 退出登录                           |
| `api/product.ts` | getCategoryTree    | GET /client/product/category/tree   | 分类树                             |
| `api/product.ts` | getProductList     | GET /client/product/list            | 商品列表                           |
| `api/product.ts` | getProductDetail   | GET /client/product/detail/:id      | 商品详情（含 marketingActivities） |
| `api/product.ts` | matchTenant        | POST /client/location/match-tenant  | 根据坐标匹配租户                   |
| `api/product.ts` | getNearbyTenants   | GET /client/location/nearby-tenants | 附近租户列表                       |
| `api/order.ts`   | getCheckoutPreview | POST /client/order/checkout/preview | 结算预览                           |
| `api/order.ts`   | createOrder        | POST /client/order/create           | 创建订单                           |
| `api/order.ts`   | getOrderList       | GET /client/order/list              | 订单列表                           |
| `api/order.ts`   | getOrderDetail     | GET /client/order/:id               | 订单详情                           |
| `api/order.ts`   | cancelOrder        | POST /client/order/cancel           | 取消订单                           |
| `api/address.ts` | getAddressList     | GET /client/address/list            | 地址列表                           |
| `api/address.ts` | getDefaultAddress  | GET /client/address/default         | 默认地址                           |
| `api/address.ts` | getAddressDetail   | GET /client/address/:id             | 地址详情                           |
| `api/address.ts` | createAddress      | POST /client/address                | 创建地址                           |
| `api/address.ts` | updateAddress      | PUT /client/address                 | 更新地址                           |
| `api/address.ts` | deleteAddress      | DELETE /client/address/:id          | 删除地址                           |
| `api/address.ts` | setDefaultAddress  | PUT /client/address/:id/default     | 设为默认                           |
| `api/payment.ts` | prepay             | POST /client/payment/prepay         | 支付预下单                         |
| `api/payment.ts` | mockPaySuccess     | POST /client/payment/mock-success   | 模拟支付（测试用）                 |
| `api/service.ts` | getAvailableDates  | GET /client/service/available-dates | 可约日期                           |
| `api/service.ts` | getTimeSlots       | GET /client/service/time-slots      | 可约时段                           |
| `api/service.ts` | lockSlot           | POST /client/service/lock-slot      | 锁定时段                           |
| `api/upgrade.ts` | applyUpgrade       | POST /client/upgrade/apply          | 申请升级分销                       |
| `api/upgrade.ts` | getUpgradeStatus   | GET /client/upgrade/status          | 升级状态                           |
| `api/upgrade.ts` | getMyReferralCode  | GET /client/upgrade/referral-code   | 我的邀请码                         |
| `api/upgrade.ts` | getTeamStats       | GET /client/upgrade/team/stats      | 团队统计                           |
| `api/upgrade.ts` | getTeamList        | GET /client/upgrade/team/list       | 团队列表                           |
| store/cart.ts    | -                  | GET /client/cart/list               | 购物车列表                         |
| store/cart.ts    | -                  | POST /client/cart/add               | 加入购物车                         |
| store/cart.ts    | -                  | PUT /client/cart/quantity           | 修改数量                           |
| store/cart.ts    | -                  | DELETE /client/cart/:skuId          | 删除项                             |
| store/cart.ts    | -                  | DELETE /client/cart/clear           | 清空购物车                         |

### 3.2 后端有、小程序未对接的 client 接口

| 后端路径                                        | 说明           |
| ----------------------------------------------- | -------------- |
| POST /client/marketing/coupon/claim/:templateId | 领取优惠券     |
| GET /client/marketing/coupon/available          | 可领优惠券列表 |
| GET /client/marketing/coupon/my-coupons         | 我的优惠券     |
| POST /client/marketing/points                   | 签到           |
| GET /client/marketing/points/status             | 签到状态       |
| POST /client/marketing/points/:taskKey/complete | 完成积分任务   |
| GET /client/marketing/points/account/balance    | 积分余额       |
| GET /client/finance/wallet                      | 钱包信息       |
| POST /client/finance/withdrawal/apply           | 申请提现       |
| GET /client/finance/commission/list             | 佣金列表       |

### 3.3 缺失的 C 端接口（后端无 client 层）

| 功能             | 说明                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **营销活动实例** | 参与活动、查看实例详情。后端 `marketing/instance` 为 Admin 接口，无 `/client/marketing/instance/*` |
| **门户/Banner**  | 轮播图、首页模块编排。架构分析中标注为 P3 缺失                                                     |
| **公告/CMS**     | 帮助中心、服务协议等                                                                               |

---

## 4. Store 清单

| Store      | 路径                | 职责                                             |
| ---------- | ------------------- | ------------------------------------------------ |
| `auth`     | `store/auth.ts`     | 登录弹窗状态、分享归因、随机头像/昵称、授权回调  |
| `token`    | `store/token.ts`    | Token 存取、刷新、登出                           |
| `user`     | `store/user.ts`     | 用户信息、获取/更新                              |
| `location` | `store/location.ts` | 经纬度、当前租户、匹配租户、附近租户、租户选择器 |
| `cart`     | `store/cart.ts`     | 购物车增删改查、选中项、总价、与后端同步         |
| `app`      | `store/app.ts`      | 应用级状态（如有）                               |

**租户与请求**：`http/interceptor.ts` 自动从 `locationStore.currentTenantId` 取租户 ID 写入请求头 `tenant-id`。

---

## 5. 配置与基础设施

### 5.1 路由与 Tabbar

- **路由**：约定式（`pages.config.ts` + `@uni-helper/vite-plugin-uni-pages`）
- **Tabbar**：自定义 Tabbar（`customTabbarList`），首页/分类/购物车/我的
- **登录策略**：`LOGIN_STRATEGY = DEFAULT_NO_NEED_LOGIN`（黑名单策略）

### 5.2 HTTP

- **封装**：`src/http/http.ts`（uni.request 封装）
- **拦截器**：`interceptor.ts` 自动加 `tenant-id`、`Authorization`
- **BaseURL**：`getEnvBaseUrl()`，来自 `VITE_SERVER_BASEURL`

### 5.3 类型来源

- **API 类型**：优先 `@libs/common-types`（由 backend openApi.json 生成）
- **本地类型**：`api/types/login.ts`、各 api 文件的 interface

---

## 6. 核心流程与数据流

```
用户进入 → 首页(index) / 分类(category)
  → 分类需定位 matchTenant → 展示该租户商品
  → 商品详情 getProductDetail（含 marketingActivities）
  → 加购 cartStore.addToCart
  → 下单 getCheckoutPreview → createOrder（支持 marketingConfigId、playInstanceId）
  → 支付 prepay → uni.requestPayment
```

---

## 7. 缺口与优先级建议

| 缺口                       | 类型 | 优先级 | 说明                                                |
| -------------------------- | ---- | ------ | --------------------------------------------------- |
| 首页无业务内容             | 功能 | P0     | 当前为 unibest 模板，需替换为真实首页               |
| 营销活动实例 API           | 后端 | P1     | 参与活动、查看实例需 `/client/marketing/instance/*` |
| marketing/detail 使用 Mock | 前端 | P1     | 待对接实例 API 后移除 Mock                          |
| 优惠券/积分 C 端           | 功能 | P2     | 后端已有，小程序未对接                              |
| 钱包/提现 C 端             | 功能 | P2     | 后端已有，小程序未对接                              |
| 门户/Banner/CMS            | 新增 | P3     | 架构分析标注，可搭建门户的前置                      |

---

## 8. 下一步决策参考

1. **首页**：固定布局还是先做可配置基础（轮播+活动入口）？
2. **营销活动闭环**：是否补充 `/client/marketing/instance` 接口？
3. **优惠券/积分**：是否对接已有 client 接口？
4. **可搭建门户**：是否规划 MpBanner、slot 编排？

---

_文档版本: 1.0_
