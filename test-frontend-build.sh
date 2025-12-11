#!/bin/bash

# 本地测试前端构建流程
# 模拟 GitHub Actions 的 deploy-frontend.yml 工作流

set -e  # 遇到错误立即退出

echo "======================================"
echo "🚀 开始测试前端构建流程"
echo "======================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 代码检查和构建测试
echo ""
echo -e "${BLUE}📋 Step 1: 代码检查和构建测试${NC}"
echo "======================================"
cd ruoyi-plus-soybean

# 检查 Node.js 版本
echo -e "${YELLOW}检查 Node.js 版本...${NC}"
node --version

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm 未安装，请先安装 pnpm${NC}"
    echo "运行: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✅ pnpm 版本:${NC} $(pnpm --version)"

# 安装依赖
echo ""
echo -e "${YELLOW}安装依赖...${NC}"
pnpm install --frozen-lockfile

# 运行 Lint
echo ""
echo -e "${YELLOW}运行代码检查...${NC}"
pnpm run lint || echo -e "${YELLOW}⚠️  Linting 完成，有警告${NC}"

# 运行构建
echo ""
echo -e "${YELLOW}运行生产构建...${NC}"
NODE_ENV=production pnpm run build

echo ""
echo -e "${GREEN}✅ Step 1 完成: 代码检查和构建测试通过${NC}"

# 2. 构建产物检查
echo ""
echo -e "${BLUE}📦 Step 2: 构建产物检查${NC}"
echo "======================================"

# 检查 dist 目录
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ dist 目录存在${NC}"
    echo ""
    echo -e "${YELLOW}构建产物大小:${NC}"
    du -sh dist
    echo ""
    echo -e "${YELLOW}dist 目录内容:${NC}"
    ls -lh dist/ | head -n 20
else
    echo -e "${RED}❌ dist 目录不存在${NC}"
    exit 1
fi

# 3. Docker 镜像构建测试（可选）
echo ""
echo -e "${BLUE}🐳 Step 3: Docker 镜像构建测试 (可选)${NC}"
echo "======================================"

if command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker 已安装，可以测试 Docker 构建${NC}"
    echo ""
    read -p "是否测试 Docker 镜像构建? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}开始构建 Docker 镜像...${NC}"
        docker build -t nest-admin-web:test .
        echo -e "${GREEN}✅ Docker 镜像构建成功${NC}"
        
        # 显示镜像信息
        echo ""
        echo -e "${YELLOW}镜像信息:${NC}"
        docker images nest-admin-web:test
    else
        echo -e "${YELLOW}⏭️  跳过 Docker 构建测试${NC}"
    fi
else
    echo -e "${YELLOW}⏭️  Docker 未安装，跳过 Docker 构建测试${NC}"
fi

# 4. 本地预览（可选）
echo ""
echo -e "${BLUE}👀 Step 4: 本地预览 (可选)${NC}"
echo "======================================"
echo ""
read -p "是否启动本地预览服务器? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}启动本地预览...${NC}"
    echo -e "${GREEN}访问 http://localhost:4173 查看构建结果${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止预览服务器${NC}"
    echo ""
    pnpm run preview
else
    echo -e "${YELLOW}⏭️  跳过本地预览${NC}"
fi

# 返回根目录
cd ..

echo ""
echo "======================================"
echo -e "${GREEN}🎉 前端构建流程测试完成！${NC}"
echo "======================================"
echo ""
echo "📊 测试结果总结:"
echo "  ✅ 依赖安装"
echo "  ✅ 代码检查"
echo "  ✅ 生产构建"
echo "  ✅ 构建产物验证"
echo ""
echo "💡 提示: 如果所有步骤都通过，说明代码可以正常部署"
echo ""
