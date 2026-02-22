'use strict';
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('⚠️  营销系统完整重置脚本\n');
console.log('此脚本将：');
console.log('  ✓ 删除所有营销实例（用户参与记录）');
console.log('  ✓ 删除所有门店营销配置');
console.log('  ✓ 删除所有营销玩法模板');
console.log('  ✓ 重新创建标准模板\n');
console.log('⚠️  警告：此操作不可逆！\n');
rl.question("确认继续？输入 'DELETE ALL' 以确认: ", (confirm) => {
  rl.close();
  if (confirm !== 'DELETE ALL') {
    console.log('❌ 操作已取消');
    process.exit(1);
  }
  console.log('\n📝 执行完整重置...\n');
  execSync('npx ts-node prisma/reset-marketing-all.ts', { cwd: root, stdio: 'inherit' });
  console.log('\n✨ 完成！');
});
