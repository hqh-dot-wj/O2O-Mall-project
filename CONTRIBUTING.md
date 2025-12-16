# 贡献指南

首先，感谢您考虑为 Nest-Admin 做出贡献！🎉

以下是一套指导原则，帮助您参与到项目中来。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)

---

## 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员保持同理心

### 不可接受的行为

- 使用性暗示的语言或图像
- 挑衅、侮辱或贬损性评论
- 公开或私下骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

---

## 如何贡献

### 报告 Bug

在提交 Bug 报告之前：

1. **检查文档** - 确保问题不是配置错误
2. **搜索 Issues** - 看看是否已有人报告相同问题
3. **检查版本** - 确保使用的是最新版本

提交 Bug 时，请包含：

- **清晰的标题**：简洁描述问题
- **详细描述**：
  - 预期行为
  - 实际行为
  - 复现步骤
- **环境信息**：
  - 操作系统
  - Node.js 版本
  - 浏览器版本
- **错误日志**：完整的错误堆栈
- **截图**：如果适用

**Bug 报告模板**：

```markdown
## Bug 描述
简要描述遇到的问题

## 复现步骤
1. 进入 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 预期行为
描述应该发生什么

## 实际行为
描述实际发生了什么

## 环境信息
- OS: [e.g. macOS 14.0]
- Node: [e.g. 20.19.0]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 2.0.0]

## 错误日志
```
粘贴错误日志
```

## 截图
如果适用，添加截图
```

### 建议新功能

我们欢迎功能建议！提交前：

1. **确保功能符合项目目标**
2. **搜索现有 Issues** - 避免重复
3. **详细说明用例** - 解释为什么需要此功能

**功能建议模板**：

```markdown
## 功能描述
清晰简洁地描述您想要的功能

## 问题背景
描述当前遇到的问题或痛点

## 解决方案
描述您希望的解决方案

## 替代方案
描述您考虑过的其他方案

## 使用场景
描述典型的使用场景

## 额外信息
添加任何其他相关信息或截图
```

---

## 开发流程

### 1. Fork 仓库

点击页面右上角的 "Fork" 按钮

### 2. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/Nest-Admin.git
cd Nest-Admin
```

### 3. 添加上游仓库

```bash
git remote add upstream https://github.com/linlingqin77/Nest-Admin.git
```

### 4. 创建分支

```bash
# 更新主分支
git checkout main
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name
# 或修复分支
git checkout -b fix/your-bug-fix
```

### 5. 开发环境设置

#### 后端

```bash
cd server
pnpm install
pnpm generate:keys
pnpm prisma:generate
pnpm prisma:seed
pnpm start:dev
```

#### 前端

```bash
cd admin-naive-ui
pnpm install
pnpm dev
```

### 6. 进行开发

- 编写代码
- 添加测试
- 更新文档
- 遵循代码规范

### 7. 提交更改

```bash
git add .
git commit -m "feat: add amazing feature"
```

### 8. 推送到远程

```bash
git push origin feature/your-feature-name
```

### 9. 创建 Pull Request

在 GitHub 上创建 PR，详细描述您的更改

---

## 代码规范

### TypeScript 规范

#### 命名约定

```typescript
// ✅ 好的命名
class UserService {}
interface UserDto {}
enum UserStatus {}
const MAX_RETRY_COUNT = 3;
function getUserById(id: string) {}

// ❌ 不好的命名
class user_service {}
interface userDto {}
const maxretrycount = 3;
function get_user(id) {}
```

#### 类型注解

```typescript
// ✅ 显式类型注解
function createUser(data: CreateUserDto): Promise<User> {
  // ...
}

// ❌ 避免 any
function processData(data: any) {
  // ...
}
```

#### 接口 vs 类型

```typescript
// ✅ 使用 interface 定义对象结构
interface User {
  id: string;
  name: string;
}

// ✅ 使用 type 定义联合类型
type Status = 'active' | 'inactive';
```

### NestJS 规范

#### 控制器

```typescript
@Controller('users')
@ApiTags('用户管理')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermission('system:user:list')
  @Api({
    summary: '获取用户列表',
    type: [UserVo]
  })
  async findAll(@Query() query: QueryUserDto) {
    return this.userService.findAll(query);
  }
}
```

#### 服务

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger
  ) {}

  async findAll(query: QueryUserDto) {
    try {
      // 业务逻辑
    } catch (error) {
      this.logger.error('查询用户失败', error);
      throw new BusinessException('查询用户失败');
    }
  }
}
```

### Vue 规范

#### 组件结构

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed } from 'vue';

// 2. Props & Emits
interface Props {
  title: string;
}
const props = defineProps<Props>();

interface Emits {
  (e: 'update', value: string): void;
}
const emit = defineEmits<Emits>();

// 3. 响应式数据
const count = ref(0);

// 4. 计算属性
const doubleCount = computed(() => count.value * 2);

// 5. 方法
function handleClick() {
  emit('update', 'value');
}

// 6. 生命周期
onMounted(() => {
  // ...
});
</script>

<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="handleClick">Click</button>
  </div>
</template>

<style scoped>
.container {
  padding: 16px;
}
</style>
```

#### 组件命名

```typescript
// ✅ PascalCase
export default defineComponent({
  name: 'UserList'
});

// ❌ 其他格式
export default defineComponent({
  name: 'userList'
});
```

### CSS 规范

#### 使用 UnoCSS

```vue
<template>
  <!-- ✅ 原子化类名 -->
  <div class="flex items-center justify-between p-4 bg-white rounded-lg shadow">
    <span class="text-lg font-bold">Title</span>
  </div>

  <!-- ❌ 避免内联样式 -->
  <div style="display: flex; padding: 16px;">
    <span style="font-size: 18px;">Title</span>
  </div>
</template>
```

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构（既不是新功能也不是修复 Bug）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动
- `revert`: 回退提交

### Scope 范围

- `server`: 后端
- `admin`: 前端
- `auth`: 认证
- `user`: 用户
- `role`: 角色
- `menu`: 菜单
- `tenant`: 租户
- 等等...

### 示例

```bash
# 新功能
git commit -m "feat(user): 添加用户导出功能"

# 修复 Bug
git commit -m "fix(auth): 修复 token 刷新失败的问题"

# 文档更新
git commit -m "docs: 更新 README 安装步骤"

# 性能优化
git commit -m "perf(query): 优化用户列表查询性能"

# 重构
git commit -m "refactor(service): 重构用户服务代码结构"
```

### 完整示例

```
feat(tenant): 添加租户套餐管理功能

- 新增租户套餐 CRUD 接口
- 添加套餐菜单权限配置
- 完善前端套餐管理页面

Closes #123
```

---

## Pull Request 流程

### 1. 提交前检查

```bash
# 后端
cd server
pnpm lint           # 代码检查
pnpm test           # 运行测试
pnpm build:prod     # 构建检查

# 前端
cd admin-naive-ui
pnpm lint           # 代码检查
pnpm typecheck      # 类型检查
pnpm build          # 构建检查
```

### 2. 更新主分支

```bash
git checkout main
git pull upstream main
git checkout feature/your-feature
git rebase main
```

### 3. 解决冲突（如有）

```bash
# 解决冲突后
git add .
git rebase --continue
```

### 4. 推送更改

```bash
git push origin feature/your-feature
# 如果 rebase 过，可能需要强制推送
git push -f origin feature/your-feature
```

### 5. 创建 PR

在 GitHub 上：

1. 点击 "New Pull Request"
2. 选择您的分支
3. 填写 PR 描述

**PR 模板**：

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 性能优化
- [ ] 代码重构

## 变更描述
详细描述本次变更的内容

## 关联 Issue
Closes #issue_number

## 测试
- [ ] 已通过所有测试
- [ ] 已添加新测试
- [ ] 已手动测试

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 已更新相关文档
- [ ] 提交信息符合规范
- [ ] 已 rebase 最新主分支
```

### 6. Code Review

- 耐心等待 Review
- 及时回复评审意见
- 根据反馈修改代码

### 7. 合并

PR 被批准后，维护者会合并您的代码。

---

## 开发技巧

### 调试后端

```typescript
// 使用 Logger
this.logger.debug('调试信息', { data });
this.logger.error('错误信息', error);

// 使用断点
// VSCode 调试配置已包含在 .vscode/launch.json
```

### 调试前端

```typescript
// 使用 console
console.log('调试信息', data);

// 使用 Vue DevTools
// Chrome 扩展：Vue.js devtools
```

### 常见问题

**Q: Prisma 客户端未更新**
```bash
pnpm prisma:generate
```

**Q: 前端路由未生成**
```bash
pnpm gen-route
```

**Q: Redis 缓存不一致**
```bash
pnpm redis:flush
```

**Q: 数据库迁移失败**
```bash
pnpm prisma:reset
```

---

## 获取帮助

- 📖 阅读[文档](README.md)
- 💬 提交 [Issue](https://github.com/linlingqin77/Nest-Admin/issues)
- 📧 邮件联系: linlingqin77@qq.com

---

## 许可证

通过贡献代码，您同意您的贡献将按照 [MIT 许可证](LICENSE) 进行许可。

---

**再次感谢您的贡献！** 🙏

每一个贡献都让 Nest-Admin 变得更好！
