#!/bin/bash

# Git 提交修复脚本

set -e

echo "======================================"
echo "📝 准备提交 Docker 构建修复"
echo "======================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")"

echo ""
echo -e "${BLUE}修复内容总结:${NC}"
echo "  ✅ 添加 @iconify/utils 到 package.json"
echo "  ✅ 优化 Dockerfile 依赖安装流程"
echo "  ✅ 创建测试脚本和文档"
echo ""

# 检查 Git 状态
echo -e "${BLUE}📋 检查 Git 状态...${NC}"
git status --short

echo ""
echo -e "${YELLOW}准备提交以下文件:${NC}"
echo ""

# 列出要提交的文件
FILES_TO_ADD=(
    "ruoyi-plus-soybean/package.json"
    "ruoyi-plus-soybean/pnpm-lock.yaml"
    "ruoyi-plus-soybean/Dockerfile"
    "test-docker-build-fix.sh"
    "docs/DOCKER_BUILD_FIX.md"
    "docs/QUICK_START.md"
    "BUILD_TEST_REPORT.md"
    "DOCKER_BUILD_FIX_SUMMARY.md"
)

for file in "${FILES_TO_ADD[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ⚠️  $file (不存在)"
    fi
done

echo ""
read -p "是否继续提交? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消提交"
    exit 1
fi

# 添加文件
echo ""
echo -e "${BLUE}📦 添加文件到 Git...${NC}"
for file in "${FILES_TO_ADD[@]}"; do
    if [ -f "$file" ]; then
        git add "$file"
        echo "  ✅ 已添加: $file"
    fi
done

# 提交信息
COMMIT_MSG="fix: resolve @iconify/utils module not found in Docker build

问题描述:
- Docker 构建前端时出现 ERR_MODULE_NOT_FOUND 错误
- 无法找到 @iconify/utils 模块
- 影响 GitHub Actions 自动部署

修复内容:
- 添加 @iconify/utils@^2.1.33 到 devDependencies
- 优化 Dockerfile，添加 --shamefully-hoist 参数
- 添加备用安装命令提高容错性

测试验证:
- ✅ 本地构建测试通过
- ✅ 依赖解析正常
- ⏳ Docker 构建待测试（需要 Docker Desktop 运行）

相关文档:
- 添加 Docker 构建修复指南 (docs/DOCKER_BUILD_FIX.md)
- 更新快速开始文档 (docs/QUICK_START.md)
- 添加本地构建测试报告
- 添加 Docker 构建测试脚本

影响范围:
- 前端 Docker 镜像构建
- GitHub Actions 自动部署工作流
- 生产环境部署流程"

echo ""
echo -e "${BLUE}📝 提交信息:${NC}"
echo "================================"
echo "$COMMIT_MSG"
echo "================================"

echo ""
read -p "确认提交信息? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消提交"
    git reset HEAD .
    exit 1
fi

# 提交
echo ""
echo -e "${BLUE}💾 提交更改...${NC}"
git commit -m "$COMMIT_MSG"

echo ""
echo -e "${GREEN}✅ 提交成功！${NC}"
echo ""

# 询问是否推送
echo -e "${YELLOW}当前分支:${NC} $(git branch --show-current)"
echo ""
read -p "是否推送到远程仓库? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}🚀 推送到远程仓库...${NC}"
    git push origin $(git branch --show-current)
    
    echo ""
    echo -e "${GREEN}✅ 推送成功！${NC}"
    echo ""
    echo -e "${BLUE}📊 下一步:${NC}"
    echo "  1. 查看 GitHub Actions: https://github.com/linlingqin77/Nest-Admin/actions"
    echo "  2. 监控部署进度"
    echo "  3. 验证服务器部署结果"
else
    echo ""
    echo -e "${YELLOW}提交已保存在本地，未推送到远程${NC}"
    echo ""
    echo "稍后推送请运行:"
    echo "  git push origin $(git branch --show-current)"
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 完成！${NC}"
echo "======================================"
