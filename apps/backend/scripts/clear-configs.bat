@echo off
chcp 65001 >nul
cd /d "%~dp0.."
call npx ts-node prisma/clear-store-configs.ts
pause
