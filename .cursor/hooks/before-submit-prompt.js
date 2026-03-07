#!/usr/bin/env node
/**
 * beforeSubmitPrompt Hook: 检测 prompt 中的敏感信息
 * 命中则 exit 2 阻断
 */

const fs = require('fs');

const stdin = fs.readFileSync(0, 'utf8');
let input;
try {
  input = JSON.parse(stdin);
} catch {
  process.exit(0);
}

const prompt = input.prompt ?? input.text ?? (typeof input === 'string' ? input : '');
const text = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);

const patterns = [
  { regex: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API Key' },
  { regex: /ghp_[a-zA-Z0-9]{36,}/, name: 'GitHub Personal Access Token' },
  { regex: /AKIA[A-Z0-9]{16}/, name: 'AWS Access Key' }
];

for (const { regex, name } of patterns) {
  if (regex.test(text)) {
    process.stderr.write(`[beforeSubmitPrompt] 检测到敏感信息: ${name}，请勿在 prompt 中提交。\n`);
    process.exit(2);
  }
}

process.stdout.write(stdin);
process.exit(0);
