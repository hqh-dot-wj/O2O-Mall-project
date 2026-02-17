'use strict';
const path = require('path');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');
console.log('🚀 开始执行营销活动端到端测试...\n');
execSync('npx ts-node test/e2e-marketing-flow.test.ts', { cwd: root, stdio: 'inherit' });
console.log('\n✅ 测试执行完成！');
