#!/bin/bash

# Docker 构建测试脚本 - 修复版本

set -e  # 遇到错误立即退出

echo "======================================"
echo "🐳 测试 Docker 构建（修复版）"
echo "======================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📋 修复内容:${NC}"
echo "  1. 添加 @iconify/utils 到 devDependencies"
echo "  2. 优化 Dockerfile 依赖安装流程"
echo "  3. 添加 --shamefully-hoist 参数"
echo ""

# 检查 Docker 是否运行
echo -e "${YELLOW}检查 Docker 状态...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行${NC}"
    echo -e "${YELLOW}请先启动 Docker Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 运行正常${NC}"

# 进入前端目录
cd ruoyi-plus-soybean

echo ""
echo -e "${BLUE}步骤 1: 更新本地依赖${NC}"
echo "======================================"
echo -e "${YELLOW}安装新增的 @iconify/utils 依赖...${NC}"
pnpm install

echo ""
echo -e "${BLUE}步骤 2: 测试本地构建${NC}"
echo "======================================"
echo -e "${YELLOW}验证本地构建是否正常...${NC}"
pnpm run build

echo -e "${GREEN}✅ 本地构建成功${NC}"

echo ""
echo -e "${BLUE}步骤 3: 清理旧的 Docker 镜像${NC}"
echo "======================================"
if docker images nest-admin-web:test -q | grep -q .; then
    echo -e "${YELLOW}清理旧的测试镜像...${NC}"
    docker rmi nest-admin-web:test || true
fi

echo ""
echo -e "${BLUE}步骤 4: 构建 Docker 镜像${NC}"
echo "======================================"
echo -e "${YELLOW}开始构建 Docker 镜像（这可能需要几分钟）...${NC}"
echo ""

# 记录开始时间
START_TIME=$(date +%s)

# 构建 Docker 镜像
if docker build -t nest-admin-web:test .; then
    echo ""
    echo -e "${GREEN}✅ Docker 镜像构建成功${NC}"
    
    # 计算耗时
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    echo ""
    echo -e "${BLUE}📊 构建信息:${NC}"
    echo "  耗时: ${MINUTES}分${SECONDS}秒"
    
    # 显示镜像信息
    echo ""
    echo -e "${BLUE}🐳 镜像详情:${NC}"
    docker images nest-admin-web:test
    
    echo ""
    echo -e "${BLUE}步骤 5: 测试运行容器（可选）${NC}"
    echo "======================================"
    read -p "是否测试运行容器? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 停止并删除旧容器（如果存在）
        docker stop nest-admin-web-test 2>/dev/null || true
        docker rm nest-admin-web-test 2>/dev/null || true
        
        echo -e "${YELLOW}启动测试容器...${NC}"
        docker run -d -p 8080:80 --name nest-admin-web-test nest-admin-web:test
        
        echo ""
        echo -e "${GREEN}✅ 容器启动成功${NC}"
        echo ""
        echo -e "${BLUE}访问地址:${NC} http://localhost:8080"
        echo -e "${YELLOW}提示:${NC} 使用 'docker logs nest-admin-web-test' 查看日志"
        echo -e "${YELLOW}提示:${NC} 使用 'docker stop nest-admin-web-test' 停止容器"
        echo -e "${YELLOW}提示:${NC} 使用 'docker rm nest-admin-web-test' 删除容器"
    fi
else
    echo ""
    echo -e "${RED}❌ Docker 镜像构建失败${NC}"
    exit 1
fi

cd ..

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Docker 构建测试完成！${NC}"
echo "======================================"
echo ""
echo "📋 测试结果:"
echo "  ✅ 依赖修复完成"
echo "  ✅ 本地构建通过"
echo "  ✅ Docker 镜像构建成功"
echo ""
echo "💡 下一步:"
echo "  1. 提交修复后的代码到 Git"
echo "  2. 推送到 GitHub 触发自动部署"
echo "  3. 验证 GitHub Actions 构建"
echo ""
