#!/bin/bash

# 端到端测试脚本 - 营销活动完整流程测试
# 测试场景：课程拼团从创建到成功/失败的完整流程

cd "$(dirname "$0")/.."

echo "🚀 开始执行营销活动端到端测试..."
echo ""

npx ts-node test/e2e-marketing-flow.test.ts

echo ""
echo "✅ 测试执行完成！"
