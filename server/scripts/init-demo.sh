#!/bin/bash

# 演示账户快速设置脚本
# 用法: ./init-demo.sh

set -e

echo "🚀 演示账户初始化脚本"
echo "================================"
echo ""

# 检查是否在 server 目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在 server 目录下运行此脚本"
    echo "   cd server && ./scripts/init-demo.sh"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js"
    exit 1
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ 错误：未检测到 pnpm"
    exit 1
fi

echo "📝 准备初始化演示账户..."
echo ""

# 执行初始化脚本
pnpm exec ts-node scripts/init-demo-account.ts

echo ""
echo "================================"
echo "✅ 演示账户设置完成！"
echo ""
echo "📋 使用说明："
echo "   用户名: demo"
echo "   密码:   demo123"
echo "   租户:   000000"
echo ""
echo "🔗 登录测试："
echo "   curl -X POST http://localhost:8080/api/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'tenant-id: 000000' \\"
echo "     -d '{\"userName\":\"demo\",\"password\":\"demo123\"}'"
echo ""
echo "📖 详细文档请查看: docs/DEMO_ACCOUNT_GUIDE.md"
echo "================================"
