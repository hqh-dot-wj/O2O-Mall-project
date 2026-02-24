---
inclusion: auto
---

# Windows 开发环境命令规范

本项目开发环境为 **Windows**，AI 助手执行或建议的所有命令必须兼容 Windows。

## 1. 禁止使用的 Unix/Linux 命令

以下命令在 Windows 上不可用或行为不同，**禁止直接使用**：

| 禁止命令         | Windows 替代（PowerShell）            | 说明                       |
| ---------------- | ------------------------------------- | -------------------------- |
| `rm -rf`         | `Remove-Item -Recurse -Force`         | 删除目录/文件              |
| `rm`             | `Remove-Item`                         | 删除文件                   |
| `cp` / `cp -r`   | `Copy-Item` / `Copy-Item -Recurse`    | 复制                       |
| `mv`             | `Move-Item`                           | 移动/重命名                |
| `mkdir -p`       | `New-Item -ItemType Directory -Force` | 创建目录（自动创建父目录） |
| `cat`            | `Get-Content`                         | 查看文件内容               |
| `touch`          | `New-Item -ItemType File`             | 创建空文件                 |
| `ls` / `ll`      | `Get-ChildItem`                       | 列出文件                   |
| `grep`           | `Select-String`                       | 文本搜索                   |
| `which`          | `Get-Command`                         | 查找命令路径               |
| `export VAR=val` | `$env:VAR = "val"`                    | 设置环境变量               |
| `chmod`          | 无直接等价                            | Windows 无此概念           |
| `sed` / `awk`    | PowerShell 字符串操作                 | 文本处理                   |
| `&&`             | `;`                                   | 命令串联                   |
| `\|\|`           | `; if ($LASTEXITCODE -ne 0) { ... }`  | 条件执行                   |

## 2. 命令串联

- PowerShell **不支持** `&&`，使用 **`;`** 分隔多条命令。
- 需要条件执行时，使用 `if ($LASTEXITCODE -eq 0) { ... }` 或 `try/catch`。

## 3. 路径分隔符

- Windows 路径使用 `\`，但 PowerShell 和大多数 Node 工具也接受 `/`。
- 脚本中优先使用 `/`（跨平台兼容），手动命令中 `\` 和 `/` 均可。

## 4. 项目命令执行规范（必须遵守）

**在执行任何项目相关命令之前，必须先检查对应 `package.json` 的 `scripts` 字段**，确认命令存在且正确。

### 4.1 检查流程

1. 先读取目标项目的 `package.json`，查看 `scripts` 中有哪些可用命令。
2. 使用 `package.json` 中已定义的命令，不要猜测或假设命令名。
3. 从根目录执行时使用 `pnpm <script>`，针对子包使用 `pnpm --filter <包名> <script>`。

### 4.2 常见错误示例

```powershell
# ❌ 错误：未确认命令是否存在就执行
pnpm start          # 根目录可能没有 start 脚本
npm run dev          # 本项目用 pnpm，不用 npm
yarn build           # 本项目用 pnpm，不用 yarn

# ✅ 正确：先确认 package.json scripts，再执行
pnpm dev             # 根目录已定义
pnpm dev:backend     # 根目录已定义
pnpm --filter @apps/backend prisma:migrate  # 确认子包有此脚本后再执行
```

### 4.3 本项目根目录可用命令速查

| 命令                   | 用途                 |
| ---------------------- | -------------------- |
| `pnpm dev`             | 启动所有应用开发模式 |
| `pnpm dev:backend`     | 仅启动后端           |
| `pnpm dev:admin`       | 仅启动 admin-web     |
| `pnpm dev:mp`          | 仅启动小程序         |
| `pnpm build`           | 构建所有应用         |
| `pnpm build:backend`   | 仅构建后端           |
| `pnpm build:admin`     | 仅构建 admin-web     |
| `pnpm lint`            | 全量 lint            |
| `pnpm typecheck`       | 全量类型检查         |
| `pnpm test`            | 全量测试             |
| `pnpm verify-monorepo` | 校验 monorepo 结构   |

### 4.4 子包命令

执行子包特有命令前，必须先读取该子包的 `package.json` 确认脚本名称。不要假设子包有某个脚本。

## 5. 环境变量

- 临时设置环境变量使用 `$env:VAR = "value"`，不要用 `export`。
- 跨平台脚本中使用 `cross-env`（项目已在 backend 中使用）。

## 6. 进程管理

- 查看端口占用：`Get-NetTCPConnection -LocalPort <端口>` 或 `netstat -ano | Select-String <端口>`。
- 终止进程：`Stop-Process -Id <PID>` 或 `taskkill /PID <PID> /F`。
- 禁止使用 `kill`、`lsof`、`ps aux` 等 Unix 命令。
