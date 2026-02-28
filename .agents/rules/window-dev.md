---
trigger: always_on
---

---

description: Windows 开发环境命令规范（禁止 Unix 命令、PowerShell 替代、路径分隔符、项目命令执行规范）
globs: "**/\*.ps1", "**/_.bat", "\*\*/_.cmd", "scripts/**/\*", "**/deploy.cjs"
alwaysApply: false

---

# Windows 开发环境命令规范

本项目开发环境为 **Windows**，执行或建议的命令必须兼容 Windows。

## 1. 禁止使用的 Unix/Linux 命令

| 禁止命令         | Windows 替代（PowerShell）            |
| ---------------- | ------------------------------------- |
| `rm -rf` / `rm`  | `Remove-Item -Recurse -Force`         |
| `cp` / `cp -r`   | `Copy-Item` / `Copy-Item -Recurse`    |
| `mv`             | `Move-Item`                           |
| `mkdir -p`       | `New-Item -ItemType Directory -Force` |
| `cat`            | `Get-Content`                         |
| `touch`          | `New-Item -ItemType File`             |
| `ls` / `ll`      | `Get-ChildItem`                       |
| `grep`           | `Select-String`                       |
| `which`          | `Get-Command`                         |
| `export VAR=val` | `$env:VAR = "val"`                    |
| `&&`             | `;`                                   |
| `\|\|`           | `; if ($LASTEXITCODE -ne 0) { ... }`  |

## 2. 命令串联

- PowerShell **不支持** `&&`，使用 **`;`** 分隔多条命令。
- 需要条件执行时，使用 `if ($LASTEXITCODE -eq 0) { ... }` 或 `try/catch`。

## 3. 路径分隔符

- 脚本中优先使用 `/`（跨平台兼容），手动命令中 `\` 和 `/` 均可。

## 4. 项目命令执行规范（必须遵守）

**执行任何项目相关命令之前，必须先检查对应 `package.json` 的 `scripts` 字段**，确认命令存在且正确。

- 使用 `package.json` 中已定义的命令，不要猜测或假设命令名。
- 从根目录执行时使用 `pnpm <script>`，针对子包使用 `pnpm --filter <包名> <script>`。
- 本项目用 **pnpm**，不用 npm/yarn。

**根目录常用命令**：`pnpm dev`、`pnpm dev:backend`、`pnpm dev:admin`、`pnpm dev:mp`、`pnpm build`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm verify-monorepo`。

## 5. 环境变量

- 临时设置：`$env:VAR = "value"`，不要用 `export`。
- 跨平台脚本使用 `cross-env`。
