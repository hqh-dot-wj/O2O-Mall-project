# 小程序文档目录

小程序相关文档统一放在 `apps/miniapp-client/docs/` 下，**先按大类划分，再按功能/模块划分**。

## 目录结构

```
docs/
├── README.md                 # 本说明
├── architecture/             # 架构：整体技术架构、现状清单
│   └── {功能}/               # 按需，跨功能放根下
├── design/                   # 设计：模块设计、组件设计、交互设计
│   ├── index/                # 首页
│   ├── me/                   # 我的
│   ├── product/              # 商品
│   ├── category/             # 分类
│   ├── cart/                 # 购物车
│   ├── order/                # 订单
│   ├── marketing/            # 营销
│   ├── address/              # 地址
│   └── components/           # 全局组件设计
├── requirements/             # 需求：PRD、用户故事、验收标准
│   ├── index/
│   ├── me/
│   └── ...
├── testing/                  # 测试：测试策略、用例
│   └── {功能}/
├── guides/                   # 指南：开发指南、实现说明、最佳实践
├── tasks/                    # 任务清单
└── improvements/             # 改进总结
```

## 放置规则

| 文档类型           | 放置路径               | 示例                                          |
| ------------------ | ---------------------- | --------------------------------------------- |
| 架构清单、技术选型 | `architecture/`        | `architecture/architecture-inventory.md`      |
| 页面/模块设计      | `design/{功能}/`       | `design/index/homepage-design.md`             |
| 组件设计说明       | `design/components/`   | `design/components/tenant-selector.md`        |
| 需求文档           | `requirements/{功能}/` | `requirements/index/homepage-requirements.md` |
| 测试策略/用例      | `testing/{功能}/`      | `testing/order/order-test-strategy.md`        |
| 开发指南、实现说明 | `guides/`              | `guides/page-layout-scroll-control.md`        |
| 任务清单           | `tasks/`               | `tasks/index-task-list.md`                    |
| 改进总结           | `improvements/`        | `improvements/homepage-phase1-summary.md`     |

## 功能模块与页面对应

| 功能目录  | 对应页面                        |
| --------- | ------------------------------- |
| index     | 首页 `pages/index/index`        |
| me        | 我的 `pages/me/me`              |
| product   | 商品详情 `pages/product/detail` |
| category  | 分类 `pages/category/category`  |
| cart      | 购物车 `pages/cart/cart`        |
| order     | 订单创建/列表/详情              |
| address   | 地址列表/编辑                   |
| marketing | 活动详情                        |
| pay       | 支付结果                        |
| upgrade   | 分销（邀请码、团队）            |

## 文件命名

- **小写 + 连字符**，如 `homepage-design.md`、`tenant-selector.md`
- 与 documentation Skill（`.cursor/skills/documentation/`）约定一致
