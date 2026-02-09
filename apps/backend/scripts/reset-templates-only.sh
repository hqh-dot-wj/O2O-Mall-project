#!/bin/bash

# 营销模板重置脚本（仅模板）
# 只删除和重建模板，不影响现有的门店配置和用户数据

echo "🚀 营销模板重置脚本"
echo ""
echo "此脚本将："
echo "  ✓ 删除所有营销玩法模板"
echo "  ✓ 重新创建标准模板"
echo "  ✗ 不会删除门店配置"
echo "  ✗ 不会删除用户参与记录"
echo ""

read -p "确认继续？(y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "📝 执行重置..."
echo ""

cd "$(dirname "$0")/.."
npx ts-node prisma/reset-marketing-templates.ts

echo ""
echo "✨ 完成！"
