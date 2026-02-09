@echo off
chcp 65001 >nul
setlocal

REM 营销系统完整重置脚本
REM ⚠️ 警告：会删除所有营销相关数据

echo ⚠️  营销系统完整重置脚本
echo.
echo 此脚本将：
echo   ✓ 删除所有营销实例（用户参与记录）
echo   ✓ 删除所有门店营销配置
echo   ✓ 删除所有营销玩法模板
echo   ✓ 重新创建标准模板
echo.
echo ⚠️  警告：此操作不可逆！
echo.

set /p confirm="确认继续？输入 'DELETE ALL' 以确认: "

if not "%confirm%"=="DELETE ALL" (
    echo ❌ 操作已取消
    exit /b 1
)

echo.
echo 📝 执行完整重置...
echo.

cd /d "%~dp0.."
call npx ts-node prisma/reset-marketing-all.ts

echo.
echo ✨ 完成！
pause
