'use strict';
const http = require('http');

const url = 'http://localhost:8080/api/auth/code';
let success = 0;
let failed = 0;
const total = 30;

console.log('🔍 开始测试企业级系统配置方案...\n');

function request(i) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const captchaEnabled = json?.data?.captchaEnabled === true;
          if (captchaEnabled) {
            success++;
            if (i % 10 === 0) console.log(`✓ 前 ${i} 次成功`);
          } else {
            failed++;
            console.log(`❌ 第 ${i} 次失败: 返回值 = ${JSON.stringify(json?.data?.captchaEnabled)}`);
          }
        } catch (e) {
          failed++;
          console.log(`❌ 第 ${i} 次失败: ${e.message}`);
        }
        resolve();
      });
    }).on('error', (e) => {
      failed++;
      console.log(`❌ 第 ${i} 次失败: ${e.message}`);
      resolve();
    });
  });
}

(async () => {
  for (let i = 1; i <= total; i++) {
    await request(i);
    if (i < total) await new Promise((r) => setTimeout(r, 100));
  }
  console.log('\n测试结果：');
  console.log(`  成功: ${success} 次`);
  console.log(`  失败: ${failed} 次\n`);
  if (failed === 0) {
    console.log('🎉 所有30次请求全部成功！企业级方案验证通过！\n');
    process.exit(0);
  } else {
    console.log('⚠️  测试失败，需要进一步排查');
    process.exit(1);
  }
})();
