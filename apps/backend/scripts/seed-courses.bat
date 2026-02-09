@echo off
chcp 65001 >nul
setlocal

REM 课程商品种子脚本

echo 🎓 课程商品种子脚本
echo.
echo 此脚本将创建：
echo   ✓ 课程分类（教育培训、艺术培训、体育培训、语言培训）
echo   ✓ 10个课程商品（声乐、舞蹈、钢琴、吉他、美术、书法、英语、跆拳道、篮球等）
echo   ✓ 对应的商品SKU（不同课时包和班型）
echo.

set /p confirm="确认继续？(y/n): "

if /i not "%confirm%"=="y" (
    echo ❌ 操作已取消
    exit /b 1
)

echo.
echo 📝 开始创建课程商品...
echo.

cd /d "%~dp0.."
call npx ts-node prisma/seed-course-products.ts

echo.
echo ✨ 完成！
pause
