'use strict';
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('🎓 课程商品种子脚本\n');
console.log('此脚本将创建：');
console.log('  ✓ 课程分类（教育培训、艺术培训、体育培训、语言培训）');
console.log('  ✓ 10个课程商品（声乐、舞蹈、钢琴、吉他、美术、书法、英语、跆拳道、篮球等）');
console.log('  ✓ 对应的商品SKU（不同课时包和班型）\n');
rl.question('确认继续？(y/n): ', (answer) => {
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('❌ 操作已取消');
    process.exit(1);
  }
  console.log('\n📝 开始创建课程商品...\n');
  execSync('npx ts-node prisma/seed-course-products.ts', { cwd: root, stdio: 'inherit' });
  console.log('\n✨ 完成！');
});
