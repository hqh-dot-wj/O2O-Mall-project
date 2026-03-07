#!/usr/bin/env node
/**
 * afterFileEdit Hook: ESLint --fix on edited file (Phase 2)
 * 策略：lint 失败时 exit 0 仅警告，不阻断编辑体验
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const stdin = fs.readFileSync(0, 'utf8');
let input;
try {
  input = JSON.parse(stdin);
} catch {
  process.stdout.write(stdin);
  process.exit(0);
}

// 兼容官方文档 file_path 与常见别名
const filePath = input.file_path ?? input.path ?? input.file ?? input.filePath;
if (!filePath || typeof filePath !== 'string') {
  process.stdout.write(stdin);
  process.exit(0);
}

const normalized = path.normalize(filePath);
if (
  normalized.includes('node_modules') ||
  normalized.includes('dist') ||
  normalized.includes('\\dist\\') ||
  /\.(spec|test)\.(ts|tsx|js|jsx|vue)$/i.test(normalized)
) {
  process.stdout.write(stdin);
  process.exit(0);
}

const root = path.resolve(__dirname, '..', '..');
const absPath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
const relPath = path.relative(root, absPath);

let pkgFilter = null;
if (relPath.startsWith('apps' + path.sep + 'backend')) {
  pkgFilter = '@apps/backend';
} else if (relPath.startsWith('apps' + path.sep + 'admin-web')) {
  pkgFilter = '@apps/admin-web';
} else if (relPath.startsWith('apps' + path.sep + 'miniapp-client')) {
  pkgFilter = '@apps/miniapp-client';
}

if (pkgFilter) {
  const args = ['--filter', pkgFilter, 'exec', 'eslint', '--fix', absPath];
  const proc = spawn('pnpm', args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });
  proc.stderr?.on('data', (d) => process.stderr.write(d));
  proc.stdout?.on('data', (d) => process.stderr.write(d));
  proc.on('close', (code) => {
    process.stdout.write(stdin);
    process.exit(0);
  });
} else {
  process.stdout.write(stdin);
  process.exit(0);
}
