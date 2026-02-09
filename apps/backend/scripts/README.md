# Backend Scripts

## 营销系统重置脚本

### 脚本列表

| 脚本 | 平台 | 功能 |
|-----|------|------|
| `reset-templates-only.bat` | Windows | 仅重置营销模板 |
| `reset-templates-only.sh` | Linux/Mac | 仅重置营销模板 |
| `reset-marketing-full.bat` | Windows | 完整重置营销系统 |
| `reset-marketing-full.sh` | Linux/Mac | 完整重置营销系统 |

### 使用方法

#### Windows

```cmd
REM 仅重置模板
reset-templates-only.bat

REM 完整重置（危险）
reset-marketing-full.bat
```

#### Linux/Mac

```bash
# 添加执行权限
chmod +x *.sh

# 仅重置模板
./reset-templates-only.sh

# 完整重置（危险）
./reset-marketing-full.sh
```

### 详细文档

- 快速参考：`../MARKETING_RESET_QUICK_REFERENCE.md`
- 完整指南：`../docs/MARKETING_RESET_GUIDE.md`

## 其他脚本

### 部署脚本

查看 `deploy.cjs` 和 `deploy.config.example.cjs`
