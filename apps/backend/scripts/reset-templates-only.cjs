'use strict';
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('🚀 营销模板重置脚本\n');
console.log('此脚本将：');
console.log('  ✓ 删除所有营销玩法模板');
console.log('  ✓ 重新创建标准模板');
console.log('  ✗ 不会删除门店配置');
console.log('  ✗ 不会删除用户参与记录\n');
rl.question('确认继续？(y/n): ', (answer) => {
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('❌ 操作已取消');
    process.exit(1);
  }
  console.log('\n📝 执行重置...\n');
  execSync('npx ts-node prisma/reset-marketing-templates.ts', { cwd: root, stdio: 'inherit' });
  console.log('\n✨ 完成！');
});
