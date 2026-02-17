'use strict';
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('确认执行租户课程设置？(y/n): ', (answer) => {
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('❌ 操作已取消');
    process.exit(1);
  }
  execSync('npx ts-node prisma/setup-tenant-courses.ts', { cwd: root, stdio: 'inherit' });
});
