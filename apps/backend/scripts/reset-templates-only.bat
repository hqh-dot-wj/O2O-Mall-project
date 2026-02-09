@echo off
chcp 65001 >nul
setlocal

REM 营销模板重置脚本（仅模板）
REM 只删除和重建模板，不影响现有的门店配置和用户数据

echo 🚀 营销模板重置脚本
echo.
echo 此脚本将：
echo   ✓ 删除所有营销玩法模板
echo   ✓ 重新创建标准模板
echo   ✗ 不会删除门店配置
echo   ✗ 不会删除用户参与记录
echo.

set /p confirm="确认继续？(y/n): "

if /i not "%confirm%"=="y" (
    echo ❌ 操作已取消
    exit /b 1
)

echo.
echo 📝 执行重置...
echo.

cd /d "%~dp0.."
call npx ts-node prisma/reset-marketing-templates.ts

echo.
echo ✨ 完成！
pause
