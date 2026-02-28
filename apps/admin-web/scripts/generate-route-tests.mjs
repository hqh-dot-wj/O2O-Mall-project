#!/usr/bin/env node
/**
 * 根据 views 目录结构生成 E2E 路由测试
 * 用法：node scripts/generate-route-tests.mjs [views子路径] [--full]
 * 示例：node scripts/generate-route-tests.mjs store/marketing --full
 *
 * --full: 生成完整测试（需登录 + 断言关键内容），依赖 auth.setup
 * 默认: 生成简单可访问性测试
 *
 * store/marketing 的 keyContent 已预置，其他路径需手动补充
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VIEWS_DIR = path.join(ROOT, 'src', 'views');
const E2E_DIR = path.join(ROOT, 'e2e');

const args = process.argv.slice(2);
const subPath = args.find(a => !a.startsWith('--')) || 'store/marketing';
const fullMode = args.includes('--full');
const targetDir = path.join(VIEWS_DIR, subPath);

if (!fs.existsSync(targetDir)) {
  console.error(`目录不存在: ${targetDir}`);
  process.exit(1);
}

function dirToRoutePath(relativeDir) {
  return `/${relativeDir.replace(/\\/g, '/')}`;
}

function collectRouteDirs(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const routes = [];

  const currentIndexPath = path.join(dir, 'index.vue');
  if (fs.existsSync(currentIndexPath) && base) {
    routes.push({ path: dirToRoutePath(base), name: base.replace(/\//g, '_') });
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const indexPath = path.join(fullPath, 'index.vue');
      if (fs.existsSync(indexPath)) {
        routes.push({ path: dirToRoutePath(relPath), name: relPath.replace(/\//g, '_') });
      }
      routes.push(...collectRouteDirs(fullPath, relPath));
    }
  }

  return routes;
}

const routeDirs = collectRouteDirs(targetDir, subPath);
const uniqueRoutes = [...new Map(routeDirs.map(r => [r.path, r])).values()].sort((a, b) =>
  a.path.localeCompare(b.path)
);

const specName = `${subPath.replace(/\//g, '-')}-routes`;
const specPath = path.join(E2E_DIR, `${specName}.spec.ts`);

let testContent;
if (fullMode) {
  const routesList = uniqueRoutes.map(r => `  '${r.path}'`).join(',\n');
  testContent = `import { expect, test } from '@playwright/test';

/**
 * ${subPath} 路由完整 E2E 测试（需登录）
 * 来源：src/views/${subPath}
 * 生成脚本：pnpm generate:route-tests ${subPath} --full
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = [
${routesList}
];

test.describe('${subPath} routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(\`\${routePath} 登录后可访问\`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
`;
} else {
  testContent = `import { expect, test } from '@playwright/test';

/**
 * 路由可访问性 E2E 测试（自动生成）
 * 来源：src/views/${subPath}
 * 生成脚本：pnpm generate:route-tests
 */
test.describe('${subPath} routes', () => {
${uniqueRoutes
  .map(
    r => `  test('${r.path} is reachable', async ({ page }) => {
    await page.goto('${r.path}');
    await expect(page.locator('body')).toBeVisible();
  });`
  )
  .join('\n\n')}
});
`;
}

fs.writeFileSync(specPath, testContent, 'utf-8');
console.log(`已生成: ${specPath}${fullMode ? ' (完整模式)' : ''}`);
console.log(`共 ${uniqueRoutes.length} 个路由测试`);
uniqueRoutes.forEach(r => console.log(`  - ${r.path}`));
