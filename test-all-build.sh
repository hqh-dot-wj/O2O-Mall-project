#!/bin/bash

# 本地测试完整构建流程
# 同时测试前端和后端

set -e  # 遇到错误立即退出

echo "======================================"
echo "🚀 开始测试完整构建流程"
echo "======================================"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 记录开始时间
START_TIME=$(date +%s)

echo ""
echo -e "${BLUE}📋 测试计划:${NC}"
echo "  1. 后端构建测试"
echo "  2. 前端构建测试"
echo ""

# 测试后端
echo ""
echo "======================================"
echo -e "${BLUE}🔧 测试后端构建${NC}"
echo "======================================"

if [ -f "test-backend-build.sh" ]; then
    bash test-backend-build.sh
    echo -e "${GREEN}✅ 后端构建测试完成${NC}"
else
    echo -e "${RED}❌ 找不到 test-backend-build.sh${NC}"
    exit 1
fi

echo ""
echo ""

# 测试前端
echo "======================================"
echo -e "${BLUE}🎨 测试前端构建${NC}"
echo "======================================"

if [ -f "test-frontend-build.sh" ]; then
    bash test-frontend-build.sh
    echo -e "${GREEN}✅ 前端构建测试完成${NC}"
else
    echo -e "${RED}❌ 找不到 test-frontend-build.sh${NC}"
    exit 1
fi

# 计算耗时
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "======================================"
echo -e "${GREEN}🎉 完整构建流程测试完成！${NC}"
echo "======================================"
echo ""
echo "📊 总体测试结果:"
echo "  ✅ 后端构建测试通过"
echo "  ✅ 前端构建测试通过"
echo ""
echo "⏱️  总耗时: ${MINUTES}分${SECONDS}秒"
echo ""
echo "💡 下一步:"
echo "  1. 如果测试通过，可以提交代码触发 GitHub Actions"
echo "  2. 查看 GitHub Actions 的实际部署日志"
echo "  3. 验证服务器上的部署结果"
echo ""
