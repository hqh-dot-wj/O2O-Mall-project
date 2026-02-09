@echo off
chcp 65001 >nul
cd /d "%~dp0.."
call npx ts-node prisma/setup-tenant-courses.ts
pause
