import { expect, test } from '@playwright/test';

/**
 * 菜单管理 E2E 操作测试
 * 测试：新增菜单、新增子菜单（基于 store/marketing 页面）
 *
 * 使用 admin/admin123 账号，需具备 system:menu:add 权限
 */

/** store/marketing 子页面配置：菜单名、路径、组件 */
const STORE_MARKETING_PAGES = [
  { menuName: '营销活动', path: 'store/marketing', component: 'store/marketing', isDir: true },
  { menuName: '营销活动配置', path: 'store/marketing/activity', component: 'store/marketing/activity', isDir: false },
  {
    menuName: '优惠券发放',
    path: 'store/marketing/coupon-distribution',
    component: 'store/marketing/coupon-distribution',
    isDir: false
  },
  {
    menuName: '优惠券使用',
    path: 'store/marketing/coupon-usage',
    component: 'store/marketing/coupon-usage',
    isDir: false
  },
  {
    menuName: '分销规则配置',
    path: 'store/marketing/distribution',
    component: 'store/marketing/distribution',
    isDir: false
  },
  {
    menuName: '分销申请',
    path: 'store/marketing/distribution-application',
    component: 'store/marketing/distribution-application',
    isDir: false
  },
  {
    menuName: '分销看板',
    path: 'store/marketing/distribution-dashboard',
    component: 'store/marketing/distribution-dashboard',
    isDir: false
  },
  {
    menuName: '分销等级',
    path: 'store/marketing/distribution-level',
    component: 'store/marketing/distribution-level',
    isDir: false
  }
];

test.describe('菜单管理 - 页面操作', () => {
  test.setTimeout(60000);
  test.describe.configure({ mode: 'serial' }); // 顺序执行：先新增目录，再新增子菜单

  test.beforeEach(async ({ page }) => {
    await page.goto('/system/menu');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
    // 等待菜单树加载
    await page.waitForSelector('.menu-tree, .n-tree', { timeout: 10000 });
  });

  test('新增一级菜单（目录）', async ({ page }) => {
    const { menuName, path } = STORE_MARKETING_PAGES[0];

    // 点击 header 新增按钮（菜单列表/主类目卡片内第一个 primary 按钮）
    const addBtn = page
      .locator('.n-card')
      .filter({ hasText: /菜单列表|主类目|根目录/ })
      .locator('button')
      .first();
    await addBtn.click();

    // 等待抽屉打开
    const drawer = page.locator('.n-drawer');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // 菜单类型默认已是「目录」，无需切换

    // 在抽屉内填写表单
    const form = page.locator('.n-drawer');
    await form
      .getByPlaceholder(/请输入菜单名称|Please enter/)
      .first()
      .fill(menuName);
    await form
      .getByPlaceholder(/请输入路由地址|Please enter/)
      .first()
      .fill(path);

    // 点击保存
    await page.getByRole('button', { name: /保存|Save/ }).click();

    // 等待成功提示
    await expect(page.getByText(/添加成功|新增成功|Add Success/)).toBeVisible({ timeout: 5000 });
  });

  test('新增子菜单（菜单类型）', async ({ page }) => {
    // 在搜索框输入「营销」筛选树节点（需先有「营销活动」目录，可由上一用例创建）
    const searchInput = page.getByPlaceholder(/请输入菜单名称|请输入/);
    await searchInput.fill('营销');
    await page.waitForTimeout(800);

    // 点击树中的「营销」/「营销活动」节点
    const treeNode = page.locator('.n-tree, .menu-tree').getByText(/营销/).first();
    await treeNode.click({ timeout: 10000 });
    await page.waitForTimeout(300);

    // 点击「新增子菜单」按钮
    await page.getByRole('button', { name: /新增子菜单|Add Child Menu/ }).click();

    // 等待抽屉打开
    const drawer = page.locator('.n-drawer');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // 子菜单默认类型为「菜单」，无需切换

    const item = STORE_MARKETING_PAGES[1]; // 营销活动配置
    const form = page.locator('.n-drawer');
    await form
      .getByPlaceholder(/请输入菜单名称|Please enter/)
      .first()
      .fill(item.menuName);
    await form
      .getByPlaceholder(/请输入路由地址|Please enter/)
      .first()
      .fill(item.path);

    // 组件路径（views/ 后的部分，不含 /index.vue）
    const componentInput = form.locator('.n-input-group:has-text("views/")').locator('input');
    if (await componentInput.isVisible()) {
      await componentInput.fill(item.component);
    }

    await page.getByRole('button', { name: /保存|Save/ }).click();
    await expect(page.getByText(/新增成功|添加成功|Add success/)).toBeVisible({ timeout: 5000 });
  });
});
