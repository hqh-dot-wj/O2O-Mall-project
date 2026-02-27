/**
 * T-2: 验证 Controller 端点均已添加 @RequirePermission 装饰器
 */
import { StockController } from './stock.controller';

describe('StockController - @RequirePermission 权限校验', () => {
  const expectedPermissions: Record<string, string> = {
    getList: 'store:stock:list',
    update: 'store:stock:update',
    batchUpdate: 'store:stock:update',
    exportStock: 'store:stock:list',
  };

  for (const [method, permission] of Object.entries(expectedPermissions)) {
    it(`${method} 应该有 @RequirePermission('${permission}')`, () => {
      const metadata = Reflect.getMetadata('permission', StockController.prototype[method]);
      expect(metadata).toBe(permission);
    });
  }

  it('所有端点都应有权限装饰器', () => {
    const methods = Object.keys(expectedPermissions);
    expect(methods).toHaveLength(4);
    for (const method of methods) {
      const metadata = Reflect.getMetadata('permission', StockController.prototype[method]);
      expect(metadata).toBeDefined();
    }
  });
});
