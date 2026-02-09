#!/bin/bash

# 课程商品种子脚本

echo "🎓 课程商品种子脚本"
echo ""
echo "此脚本将创建："
echo "  ✓ 课程分类（教育培训、艺术培训、体育培训、语言培训）"
echo "  ✓ 10个课程商品（声乐、舞蹈、钢琴、吉他、美术、书法、英语、跆拳道、篮球等）"
echo "  ✓ 对应的商品SKU（不同课时包和班型）"
echo ""

read -p "确认继续？(y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "📝 开始创建课程商品..."
echo ""

cd "$(dirname "$0")/.."
npx ts-node prisma/seed-course-products.ts

echo ""
echo "✨ 完成！"
