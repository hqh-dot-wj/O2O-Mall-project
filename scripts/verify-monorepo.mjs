#!/usr/bin/env node
/**
 * Monorepo 正确性属性校验脚本 (Property 1-9)
 * 在 CI 或本地运行: node scripts/verify-monorepo.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const results = { pass: [], fail: [] };
function ok(name, msg) {
  results.pass.push(`[P${name}] ${msg}`);
}
function fail(name, msg) {
  results.fail.push(`[P${name}] ${msg}`);
}

// Resolve workspace package dirs from pnpm-workspace.yaml
function getWorkspaceDirs() {
  const yaml = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
  const packages = [];
  const packageLines = yaml.split('\n').filter((l) => l.trim().startsWith('- ') && l.includes("'"));
  for (const line of packageLines) {
    const match = line.match(/'([^']+)'/);
    if (match) {
      const pattern = match[1];
      if (pattern === 'docs') {
        packages.push('docs');
        continue;
      }
      if (pattern.endsWith('/*')) {
        const base = pattern.slice(0, -2);
        const fullBase = path.join(root, base);
        if (fs.existsSync(fullBase)) {
          for (const name of fs.readdirSync(fullBase)) {
            const dir = path.join(fullBase, name);
            if (fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'package.json'))) {
              packages.push(path.relative(root, dir));
            }
          }
        }
      } else {
        packages.push(pattern);
      }
    }
  }
  return [...new Set(packages)];
}

const workspaceDirs = getWorkspaceDirs();
const catalogDeps = new Set(['typescript', 'dayjs', 'axios', 'vue', 'vue-router', 'pinia', 'vue-i18n', '@types/node', 'eslint', 'prettier', 'vitest', 'simple-git-hooks', 'lint-staged', '@commitlint/cli', '@commitlint/config-conventional', 'sass']);
const internalPrefixes = ['@apps/', '@libs/', '@sa/'];

// P1: 共享依赖版本一致性 (catalog 或相同版本)
function checkP1() {
  const depVersions = new Map();
  for (const dir of workspaceDirs) {
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(allDeps || {})) {
      if (!catalogDeps.has(name)) continue;
      const key = `${dir}:${name}`;
      if (typeof version !== 'string') continue;
      const normalized = version.startsWith('catalog:') ? 'catalog:' : version.replace(/^[\^~]/, '');
      if (!depVersions.has(name)) depVersions.set(name, new Map());
      depVersions.get(name).set(dir, version);
    }
  }
  for (const [dep, byPkg] of depVersions) {
    const vals = [...byPkg.values()];
    const hasCatalog = vals.some((v) => v === 'catalog:');
    const versions = vals.filter((v) => v !== 'catalog:').map((v) => v.replace(/^[\^~]/, ''));
    if (hasCatalog && versions.length > 0) {
      fail(1, `共享依赖 ${dep} 部分包使用 catalog:，部分使用固定版本，应统一`);
    } else if (!hasCatalog && new Set(versions).size > 1) {
      fail(1, `共享依赖 ${dep} 版本不一致: ${[...byPkg.entries()].map(([d, v]) => `${d}=${v}`).join(', ')}`);
    } else {
      ok(1, `共享依赖 ${dep} 一致`);
    }
  }
  if (depVersions.size === 0) ok(1, '无共享依赖需校验');
}

// P2: 内部包引用使用 workspace:*
function checkP2() {
  for (const dir of workspaceDirs) {
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(allDeps || {})) {
      const isInternal = internalPrefixes.some((p) => name.startsWith(p));
      if (isInternal && !version.startsWith('workspace:')) {
        fail(2, `${dir} 依赖 ${name} 应使用 workspace:*，当前: ${version}`);
      }
    }
  }
  ok(2, '内部包引用使用 workspace 协议');
}

// P3: 无子级锁文件
function checkP3() {
  for (const dir of workspaceDirs) {
    const full = path.join(root, dir);
    if (fs.existsSync(path.join(full, 'package-lock.json')) || fs.existsSync(path.join(full, 'pnpm-lock.yaml'))) {
      fail(3, `${dir} 下存在独立锁文件`);
    }
  }
  ok(3, '无子级锁文件');
}

// P4: tsconfig 继承根配置
function checkP4() {
  let any = false;
  for (const dir of workspaceDirs) {
    const tsPath = path.join(root, dir, 'tsconfig.json');
    if (!fs.existsSync(tsPath)) continue;
    any = true;
    const ts = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
    const ext = ts.extends;
    if (!ext || !String(ext).includes('tsconfig.base.json')) {
      fail(4, `${dir}/tsconfig.json 未 extends 根 tsconfig.base.json`);
    }
  }
  if (any) ok(4, 'TypeScript 配置继承根配置');
}

// P5: 无分散的 Git Hooks
function checkP5() {
  for (const dir of workspaceDirs) {
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg['simple-git-hooks'] || pkg.husky) {
      fail(5, `${dir} 仍包含 simple-git-hooks 或 husky 配置`);
    }
    const huskyDir = path.join(root, dir, '.husky');
    if (fs.existsSync(huskyDir)) {
      fail(5, `${dir} 下存在 .husky/ 目录`);
    }
  }
  ok(5, '无分散的 Git Hooks');
}

// P6: 环境变量文件命名规范
function checkP6() {
  const allowed = ['.env', '.env.development', '.env.production', '.env.test', '.env.example'];
  for (const dir of workspaceDirs) {
    if (!dir.startsWith('apps/')) continue;
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) continue;
    const files = fs.readdirSync(full);
    for (const f of files) {
      if ((f === '.env' || f.startsWith('.env.')) && !allowed.includes(f)) {
        fail(6, `${dir} 存在非规范环境变量文件: ${f} (允许: ${allowed.join(', ')})`);
      }
    }
  }
  ok(6, '环境变量文件命名规范');
}

// P7: 每个应用提供 .env.example
function checkP7() {
  const appDirs = workspaceDirs.filter((d) => d.startsWith('apps/') && !d.includes('/packages/'));
  for (const dir of appDirs) {
    const example = path.join(root, dir, '.env.example');
    if (!fs.existsSync(example)) {
      fail(7, `${dir} 缺少 .env.example`);
    }
  }
  ok(7, '各应用提供 .env.example');
}

// P8: Backend 脚本无 .bat/.sh
function checkP8() {
  const scriptsDir = path.join(root, 'apps/backend/scripts');
  if (!fs.existsSync(scriptsDir)) {
    ok(8, 'Backend 无 scripts 目录');
    return;
  }
  const files = fs.readdirSync(scriptsDir);
  const bad = files.filter((f) => f.endsWith('.bat') || f.endsWith('.sh'));
  if (bad.length) {
    fail(8, `apps/backend/scripts 存在平台特定格式: ${bad.join(', ')}`);
  } else {
    ok(8, 'Backend 脚本无 .bat/.sh');
  }
}

// P9: Backend 脚本 kebab-case
function checkP9() {
  const scriptsDir = path.join(root, 'apps/backend/scripts');
  if (!fs.existsSync(scriptsDir)) {
    ok(9, 'Backend 无 scripts 目录');
    return;
  }
  const kebab = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  const files = fs.readdirSync(scriptsDir);
  for (const f of files) {
    const base = path.basename(f, path.extname(f));
    if (!kebab.test(base)) {
      fail(9, `apps/backend/scripts/${f} 文件名非 kebab-case`);
    }
  }
  ok(9, 'Backend 脚本命名 kebab-case');
}

// P10: 包命名规范 (@apps/*, @libs/*, @sa/*)
function checkP10() {
  const allowedPrefixes = ['@apps/', '@libs/', '@sa/'];
  for (const dir of workspaceDirs) {
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const name = pkg.name;
    if (!name) continue;
    // docs 包和根包可以不遵循
    if (dir === 'docs') continue;
    const hasPrefix = allowedPrefixes.some((p) => name.startsWith(p));
    // 允许 monorepo 根包名不带前缀
    if (!hasPrefix && pkg.private !== true) {
      fail(10, `${dir} 包名 "${name}" 不符合命名规范 (@apps/*, @libs/*, @sa/*)`);
    } else if (!hasPrefix && dir.startsWith('apps/') && !dir.includes('/packages/')) {
      fail(10, `${dir} 包名 "${name}" 应使用 @apps/ 前缀`);
    } else if (!hasPrefix && dir.startsWith('libs/')) {
      fail(10, `${dir} 包名 "${name}" 应使用 @libs/ 前缀`);
    }
  }
  ok(10, '包命名规范');
}

// P11: 内部包循环依赖检测
function checkP11() {
  // 构建内部依赖图
  const pkgNameToDir = new Map();
  const graph = new Map(); // name -> Set<name>

  for (const dir of workspaceDirs) {
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.name) continue;
    pkgNameToDir.set(pkg.name, dir);
    graph.set(pkg.name, new Set());
  }

  for (const dir of workspaceDirs) {
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (!pkg.name) continue;
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const depName of Object.keys(allDeps || {})) {
      if (graph.has(depName)) {
        graph.get(pkg.name).add(depName);
      }
    }
  }

  // DFS 检测环
  const visited = new Set();
  const inStack = new Set();
  const cycles = [];

  function dfs(node, pathArr) {
    if (inStack.has(node)) {
      const cycleStart = pathArr.indexOf(node);
      cycles.push(pathArr.slice(cycleStart).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    pathArr.push(node);
    for (const dep of graph.get(node) || []) {
      dfs(dep, [...pathArr]);
    }
    inStack.delete(node);
  }

  for (const name of graph.keys()) {
    dfs(name, []);
  }

  if (cycles.length > 0) {
    for (const cycle of cycles) {
      fail(11, `循环依赖: ${cycle.join(' → ')}`);
    }
  } else {
    ok(11, '无内部包循环依赖');
  }
}

// P12: 包边界检查 (libs 不应依赖 apps)
function checkP12() {
  const pkgNameToDir = new Map();
  for (const dir of workspaceDirs) {
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name) pkgNameToDir.set(pkg.name, dir);
  }

  for (const dir of workspaceDirs) {
    if (!dir.startsWith('libs/')) continue;
    const pkgPath = path.join(root, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [depName, version] of Object.entries(allDeps || {})) {
      const depDir = pkgNameToDir.get(depName);
      if (depDir && depDir.startsWith('apps/')) {
        fail(12, `${dir} (libs) 依赖了 ${depName} (apps)，违反包边界：libs 不应依赖 apps`);
      }
    }
  }
  ok(12, '包边界正确 (libs 不依赖 apps)');
}

checkP1();
checkP2();
checkP3();
checkP4();
checkP5();
checkP6();
checkP7();
checkP8();
checkP9();
checkP10();
checkP11();
checkP12();

// Dedupe and output
const failed = [...new Set(results.fail)];
const passed = [...new Set(results.pass)].filter((p) => !failed.some((f) => f.slice(0, 5) === p.slice(0, 5)));
console.log('--- Monorepo 校验结果 ---');
passed.forEach((m) => console.log('✓', m));
failed.forEach((m) => console.log('✗', m));
if (failed.length > 0) {
  process.exit(1);
}
