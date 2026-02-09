#!/bin/bash

# 营销系统完整重置脚本
# ⚠️ 警告：会删除所有营销相关数据

echo "⚠️  营销系统完整重置脚本"
echo ""
echo "此脚本将："
echo "  ✓ 删除所有营销实例（用户参与记录）"
echo "  ✓ 删除所有门店营销配置"
echo "  ✓ 删除所有营销玩法模板"
echo "  ✓ 重新创建标准模板"
echo ""
echo "⚠️  警告：此操作不可逆！"
echo ""

read -p "确认继续？输入 'DELETE ALL' 以确认: " confirm

if [[ "$confirm" != "DELETE ALL" ]]
then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "📝 执行完整重置..."
echo ""

cd "$(dirname "$0")/.."
npx ts-node prisma/reset-marketing-all.ts

echo ""
echo "✨ 完成！"
