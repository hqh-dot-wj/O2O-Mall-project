# CODEOWNERS 使用指南

## 📋 目录

- [什么是 CODEOWNERS](#什么是-codeowners)
- [工作原理](#工作原理)
- [当前配置](#当前配置)
- [最佳实践](#最佳实践)
- [团队扩展指南](#团队扩展指南)
- [常见问题](#常见问题)

---

## 什么是 CODEOWNERS

CODEOWNERS 是 GitHub 的一个功能，用于定义代码库中不同部分的所有者。当有人创建 Pull Request 时，系统会自动请求相关代码所有者进行审查。

### 核心价值

1. **明确责任**: 每个模块都有明确的负责人
2. **自动审查**: PR 自动分配给相关所有者
3. **质量保证**: 确保关键代码被正确的人审查
4. **知识管理**: 新人知道该找谁咨询
5. **风险控制**: 高风险代码需要多人审查

---

## 工作原理

### 基本规则

```
# 语法格式
<文件路径模式> <所有者1> <所有者2> ...

# 示例
/apps/backend/src/module/finance/ @linlingqin77
```

### 匹配规则

1. **从上到下匹配**: 文件从上到下匹配规则
2. **最后匹配优先**: 最后一个匹配的规则优先级最高
3. **通配符支持**:
   - `*` 匹配任意字符（不包括 `/`）
   - `**` 匹配任意字符（包括 `/`）
   - `?` 匹配单个字符

### 示例

```
# 所有文件默认由 @linlingqin77 审查
* @linlingqin77

# 金融模块需要金融团队审查（覆盖默认规则）
/apps/backend/src/module/finance/ @finance-team

# 支付相关需要金融团队和安全团队共同审查
/apps/backend/src/module/store/payment/ @finance-team @security-team
```

---

## 当前配置

### 模块所有权

| 模块     | 所有者        | 说明                   |
| -------- | ------------- | ---------------------- |
| 金融模块 | @linlingqin77 | 佣金、钱包、提现、结算 |
| 营销模块 | @linlingqin77 | 优惠券、积分、活动     |
| 商城模块 | @linlingqin77 | 订单、购物车、支付     |
| 商品模块 | @linlingqin77 | 商品、分类、品牌       |
| 用户模块 | @linlingqin77 | 用户、权限、认证       |
| 系统模块 | @linlingqin77 | 系统配置、租户         |

### 高风险区域

以下区域需要特别谨慎的审查：

- **金融相关**: `/apps/backend/src/module/finance/`
- **支付相关**: `**/payment/**`, `**/wallet/**`
- **认证授权**: `**/auth/**`, `**/security/**`
- **数据库迁移**: `**/migrations/**`
- **CI/CD 配置**: `/.github/workflows/`
- **环境变量**: `**/.env.production`

---

## 最佳实践

### 1. PR 创建者

#### 提交前检查

```bash
# 查看哪些文件会触发审查
git diff --name-only main...your-branch

# 查看每个文件的所有者
gh codeowners <file-path>
```

#### PR 描述模板

```markdown
## 变更说明

- 修改了佣金计算逻辑
- 优化了 N+1 查询问题

## 影响范围

- [ ] 金融模块
- [ ] 性能优化
- [ ] 无破坏性变更

## 测试

- [x] 单元测试通过
- [x] 集成测试通过
- [ ] 性能测试

## 审查重点

请重点关注 `calculateCommissionBase` 方法的批量查询逻辑

@linlingqin77 请审查
```

### 2. 代码审查者

#### 审查清单

**金融模块审查**:

- [ ] 金额计算是否正确（使用 Decimal）
- [ ] 事务是否完整
- [ ] 是否有并发问题
- [ ] 是否有审计日志
- [ ] 测试覆盖是否充分

**性能优化审查**:

- [ ] 是否解决了 N+1 查询
- [ ] 是否引入新的性能问题
- [ ] 是否有索引支持
- [ ] 是否有缓存策略

**安全审查**:

- [ ] 是否有 SQL 注入风险
- [ ] 是否有权限校验
- [ ] 是否有敏感信息泄露
- [ ] 是否有输入验证

#### 审查命令

```bash
# 查看变更统计
git diff --stat main...pr-branch

# 查看具体变更
git diff main...pr-branch -- apps/backend/src/module/finance/

# 运行测试
npm test -- --testPathPattern=finance
```

### 3. 团队协作

#### 沟通流程

1. **PR 创建**: 自动通知所有者
2. **初步审查**: 所有者进行代码审查
3. **讨论**: 在 PR 中讨论问题
4. **修改**: 根据反馈修改代码
5. **批准**: 所有者批准 PR
6. **合并**: 满足所有条件后合并

#### 审查时效

| 优先级    | 响应时间 | 完成时间 |
| --------- | -------- | -------- |
| P0 (紧急) | 2 小时   | 1 天     |
| P1 (重要) | 1 天     | 3 天     |
| P2 (普通) | 2 天     | 1 周     |

---

## 团队扩展指南

### 当团队扩大时

#### 1. 创建 GitHub 团队

```bash
# 在 GitHub 组织中创建团队
# Settings > Teams > New team

# 示例团队
- @your-org/finance-team
- @your-org/frontend-team
- @your-org/platform-team
- @your-org/security-team
```

#### 2. 更新 CODEOWNERS

```
# 金融团队（需要团队任意成员批准）
/apps/backend/src/module/finance/ @your-org/finance-team

# 支付相关（需要金融团队和安全团队都批准）
**/payment/** @your-org/finance-team @your-org/security-team

# 前端（需要前端团队批准，同时抄送架构师）
/apps/admin-web/ @your-org/frontend-team @linlingqin77
```

#### 3. 配置分支保护

```
Settings > Branches > Branch protection rules

✅ Require pull request reviews before merging
   - Required approving reviews: 1 (或更多)
   - Dismiss stale pull request approvals when new commits are pushed
   - Require review from Code Owners

✅ Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Status checks: CI, Tests, Lint

✅ Require conversation resolution before merging

✅ Include administrators (推荐)
```

### 示例配置（多团队）

```
# ============================================================================
# 多团队配置示例
# ============================================================================

# 默认所有者
* @linlingqin77

# 金融模块 - 需要金融团队审查
/apps/backend/src/module/finance/ @your-org/finance-team @linlingqin77

# 支付相关 - 需要金融团队和安全团队共同审查
**/payment/** @your-org/finance-team @your-org/security-team @linlingqin77
**/wallet/** @your-org/finance-team @your-org/security-team @linlingqin77

# 前端 - 前端团队负责
/apps/admin-web/ @your-org/frontend-team @linlingqin77
/apps/miniapp-client/ @your-org/frontend-team @linlingqin77

# 基础设施 - 平台团队负责
/libs/ @your-org/platform-team @linlingqin77
/.github/workflows/ @your-org/platform-team @your-org/devops-team @linlingqin77

# 数据库迁移 - 需要 DBA 审查
**/migrations/** @your-org/dba-team @linlingqin77

# 安全相关 - 必须安全团队审查
**/auth/** @your-org/security-team @linlingqin77
**/security/** @your-org/security-team @linlingqin77
```

---

## 常见问题

### Q1: 为什么我的 PR 没有自动请求审查？

**可能原因**:

1. CODEOWNERS 文件位置错误（必须在 `.github/CODEOWNERS`）
2. 文件路径匹配规则错误
3. 所有者用户名错误
4. 分支保护规则未启用

**解决方法**:

```bash
# 验证 CODEOWNERS 文件
cat .github/CODEOWNERS

# 测试匹配规则
gh codeowners <file-path>
```

### Q2: 如何临时绕过 CODEOWNERS 审查？

**不推荐**，但紧急情况下：

1. 管理员可以在分支保护规则中临时禁用
2. 使用 `[skip ci]` 标签（如果配置了）
3. 直接推送到 main（如果有权限）

**更好的做法**:

- 提前规划，避免紧急情况
- 建立紧急变更流程
- 事后补充审查

### Q3: 多个所有者时，需要所有人都批准吗？

**取决于分支保护规则**:

- `Required approving reviews: 1` - 任意一个所有者批准即可
- `Required approving reviews: 2` - 需要两个所有者批准
- `Require review from Code Owners` - 必须至少一个代码所有者批准

### Q4: 如何查看某个文件的所有者？

```bash
# 使用 GitHub CLI
gh codeowners apps/backend/src/module/finance/commission/commission.service.ts

# 或者在 GitHub 网页上
# 打开文件 > 点击 "Blame" > 查看右侧的 "Code owners"
```

### Q5: CODEOWNERS 会影响性能吗？

**不会**。CODEOWNERS 只在以下时机生效：

- 创建 PR 时（自动请求审查）
- 更新 PR 时（重新计算所有者）
- 合并 PR 时（验证审查要求）

不会影响日常开发和 CI/CD 性能。

---

## 相关资源

### 官方文档

- [GitHub CODEOWNERS 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [分支保护规则](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

### 工具

- [GitHub CLI](https://cli.github.com/) - 命令行工具
- [CODEOWNERS Validator](https://github.com/mszostok/codeowners-validator) - 验证工具

### 最佳实践

- [Google Engineering Practices](https://google.github.io/eng-practices/review/)
- [Thoughtworks Code Review Guide](https://www.thoughtworks.com/insights/blog/code-review-best-practices)

---

## 维护记录

| 日期       | 变更                     | 负责人        |
| ---------- | ------------------------ | ------------- |
| 2026-02-23 | 初始版本，细化模块所有权 | @linlingqin77 |

---

**最后更新**: 2026-02-23  
**维护者**: @linlingqin77
