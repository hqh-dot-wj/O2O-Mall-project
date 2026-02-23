# GitHub 仓库配置指南

本文档说明如何配置 GitHub 仓库以充分利用 CODEOWNERS 功能。

---

## 📋 目录

- [分支保护规则](#分支保护规则)
- [团队配置](#团队配置)
- [通知设置](#通知设置)
- [自动化配置](#自动化配置)

---

## 🛡️ 分支保护规则

### 配置路径

```
Settings > Branches > Branch protection rules > Add rule
```

### 推荐配置

#### 1. 主分支保护 (main/master)

```yaml
Branch name pattern: main

✅ Require a pull request before merging
   ├─ Required approving reviews: 1
   ├─ Dismiss stale pull request approvals when new commits are pushed
   ├─ Require review from Code Owners ⭐ 关键配置
   └─ Require approval of the most recent reviewable push

✅ Require status checks to pass before merging
   ├─ Require branches to be up to date before merging
   └─ Status checks that are required:
      ├─ CI / build
      ├─ CI / test
      ├─ CI / lint
      └─ CI / type-check

✅ Require conversation resolution before merging

✅ Require linear history (可选，保持提交历史清晰)

✅ Include administrators (推荐，管理员也需要遵守规则)

❌ Allow force pushes (禁止强制推送)

❌ Allow deletions (禁止删除分支)
```

#### 2. 开发分支保护 (develop)

```yaml
Branch name pattern: develop

✅ Require a pull request before merging
   ├─ Required approving reviews: 1
   └─ Require review from Code Owners

✅ Require status checks to pass before merging
   └─ Status checks that are required:
      ├─ CI / build
      ├─ CI / test
      └─ CI / lint

✅ Require conversation resolution before merging

❌ Include administrators (开发分支可以更灵活)
```

#### 3. 发布分支保护 (release/\*)

```yaml
Branch name pattern: release/*

✅ Require a pull request before merging
   ├─ Required approving reviews: 2 (发布需要更严格)
   └─ Require review from Code Owners

✅ Require status checks to pass before merging
   └─ Status checks that are required:
      ├─ CI / build
      ├─ CI / test
      ├─ CI / lint
      ├─ CI / e2e
      └─ Security / scan

✅ Require conversation resolution before merging

✅ Include administrators

❌ Allow force pushes

❌ Allow deletions
```

---

## 👥 团队配置

### 创建团队

当团队扩大时，建议创建以下团队：

#### 1. 在 GitHub 组织中创建团队

```
Settings > Teams > New team
```

#### 2. 推荐的团队结构

```
your-org/
├── @finance-team          # 金融模块团队
│   ├── 成员: 金融业务开发者
│   └── 权限: Write
│
├── @marketing-team        # 营销模块团队
│   ├── 成员: 营销业务开发者
│   └── 权限: Write
│
├── @frontend-team         # 前端团队
│   ├── 成员: 前端开发者
│   └── 权限: Write
│
├── @platform-team         # 平台团队
│   ├── 成员: 基础设施开发者
│   └── 权限: Write
│
├── @security-team         # 安全团队
│   ├── 成员: 安全专家
│   └── 权限: Read (仅审查)
│
├── @dba-team             # DBA 团队
│   ├── 成员: 数据库管理员
│   └── 权限: Read (仅审查)
│
└── @devops-team          # DevOps 团队
    ├── 成员: 运维工程师
    └── 权限: Admin
```

#### 3. 团队权限说明

| 权限     | 说明                 | 适用团队       |
| -------- | -------------------- | -------------- |
| Read     | 只读，可以审查 PR    | Security, DBA  |
| Triage   | 可以管理 Issue 和 PR | -              |
| Write    | 可以推送代码         | 开发团队       |
| Maintain | 可以管理仓库设置     | 技术负责人     |
| Admin    | 完全控制             | DevOps, 架构师 |

---

## 🔔 通知设置

### 个人通知设置

```
Settings > Notifications > Participating

✅ Email
✅ Web and Mobile

Watching:
✅ Participating and @mentions
✅ Custom: Pull requests, Issues
```

### 团队通知设置

```
Team Settings > Notifications

✅ Enable team discussions
✅ Notify team members when:
   ├─ A pull request is assigned to the team
   ├─ A pull request requests review from the team
   └─ A pull request mentions the team
```

### CODEOWNERS 通知

当 CODEOWNERS 配置正确时，相关所有者会自动收到：

1. **PR 创建通知**: 当 PR 涉及其负责的代码
2. **审查请求**: 自动请求审查
3. **状态更新**: PR 状态变化通知

---

## 🤖 自动化配置

### 1. 自动分配审查者

创建 `.github/auto_assign.yml`:

```yaml
# 自动分配审查者配置
# 注意: 这会覆盖 CODEOWNERS 的自动分配

# 是否添加审查者到 PR
addReviewers: true

# 是否添加分配者到 PR
addAssignees: false

# 审查者数量
numberOfReviewers: 1

# 审查者列表（当 CODEOWNERS 未匹配时使用）
reviewers:
  - linlingqin77

# 关键字匹配规则
keywords:
  - keywords: ['finance', '金融', '佣金', '钱包']
    reviewers:
      - linlingqin77

  - keywords: ['marketing', '营销', '优惠券', '积分']
    reviewers:
      - linlingqin77

  - keywords: ['security', '安全', 'auth', '认证']
    reviewers:
      - linlingqin77
```

### 2. 自动标签

创建 `.github/labeler.yml`:

```yaml
# 自动标签配置

'backend':
  - apps/backend/**/*

'frontend':
  - apps/admin-web/**/*
  - apps/miniapp-client/**/*

'finance':
  - apps/backend/src/module/finance/**/*

'marketing':
  - apps/backend/src/module/marketing/**/*

'database':
  - apps/backend/prisma/**/*
  - '**/*.sql'

'documentation':
  - docs/**/*
  - '**/*.md'

'ci/cd':
  - .github/workflows/**/*
  - '**/Dockerfile'
  - '**/docker-compose.yml'

'security':
  - '**/auth/**/*
  - '**/security/**/*
  - '**/*-secret*'
  - '**/*-key*'

'dependencies':
  - package.json
  - pnpm-lock.yaml
  - '**/package.json'
```

### 3. 自动标签 Workflow

创建 `.github/workflows/labeler.yml`:

```yaml
name: 'Pull Request Labeler'

on:
  - pull_request_target

jobs:
  labeler:
    permissions:
      contents: read
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: '${{ secrets.GITHUB_TOKEN }}'
```

### 4. PR 大小检查

创建 `.github/workflows/pr-size-check.yml`:

```yaml
name: 'PR Size Check'

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  size-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check PR size
        uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.pull_request;
            const additions = pr.additions;
            const deletions = pr.deletions;
            const changes = additions + deletions;

            let label = '';
            let comment = '';

            if (changes < 100) {
              label = 'size/XS';
              comment = '✅ 这是一个很小的 PR，易于审查';
            } else if (changes < 300) {
              label = 'size/S';
              comment = '✅ 这是一个小型 PR';
            } else if (changes < 500) {
              label = 'size/M';
              comment = '⚠️ 这是一个中型 PR，建议拆分';
            } else if (changes < 1000) {
              label = 'size/L';
              comment = '⚠️ 这是一个大型 PR，强烈建议拆分';
            } else {
              label = 'size/XL';
              comment = '🚨 这是一个超大型 PR，必须拆分！';
            }

            // 添加标签
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr.number,
              labels: [label]
            });

            // 添加评论
            if (changes >= 500) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pr.number,
                body: `${comment}\n\n变更统计: +${additions} -${deletions} (总计 ${changes} 行)\n\n建议将大型 PR 拆分为多个小 PR，以便更好地审查。`
              });
            }
```

---

## 📊 监控与报告

### 1. 启用 Insights

```
Insights > Community > Enable
```

查看：

- PR 审查时间
- 代码所有者响应时间
- 合并频率

### 2. 代码审查指标

推荐追踪的指标：

| 指标            | 目标     | 说明             |
| --------------- | -------- | ---------------- |
| PR 首次响应时间 | < 4 小时 | 从创建到首次评论 |
| PR 审查完成时间 | < 2 天   | 从创建到批准     |
| PR 合并时间     | < 3 天   | 从创建到合并     |
| PR 大小         | < 300 行 | 变更行数         |
| 审查轮次        | < 3 轮   | 修改次数         |

---

## ✅ 配置检查清单

完成以下配置后，CODEOWNERS 功能将完全生效：

### 基础配置

- [ ] CODEOWNERS 文件已创建在 `.github/CODEOWNERS`
- [ ] 所有者用户名正确（可以 @ 到）
- [ ] 文件路径匹配规则正确

### 分支保护

- [ ] main 分支已启用保护
- [ ] 已启用 "Require review from Code Owners"
- [ ] 已设置必需的状态检查
- [ ] 已启用 "Require conversation resolution"

### 团队配置（可选）

- [ ] 已创建相关团队
- [ ] 团队成员已添加
- [ ] 团队权限已设置
- [ ] CODEOWNERS 已更新为团队名

### 自动化（可选）

- [ ] 已配置自动标签
- [ ] 已配置 PR 大小检查
- [ ] 已配置自动分配审查者

### 通知

- [ ] 个人通知已启用
- [ ] 团队通知已启用
- [ ] 邮件通知已配置

---

## 🔗 相关资源

- [GitHub CODEOWNERS 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [分支保护规则](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Actions](https://docs.github.com/en/actions)
- [自动标签](https://github.com/actions/labeler)

---

**最后更新**: 2026-02-23  
**维护者**: @linlingqin77
