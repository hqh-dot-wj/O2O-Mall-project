import { StoreProductController } from './product.controller';

/**
 * T-1: 验证 Controller 端点均已添加 @RequirePermission 装饰器
 *
 * 通过 Reflect.getMetadata('permission', ...) 检查每个方法上的权限标识。
 */
describe('StoreProductController - @RequirePermission 权限校验', () => {
  const expectedPermissions: Record<string, string> = {
    getMarketList: 'store:product:list',
    getMarketDetail: 'store:product:query',
    importProduct: 'store:product:import',
    batchImportProducts: 'store:product:import',
    findAll: 'store:product:list',
    updateProductPrice: 'store:product:update',
    batchUpdateProductPrice: 'store:product:update',
    updateProductBase: 'store:product:update',
    removeProduct: 'store:product:update',
    getStockAlertConfig: 'store:product:query',
    setStockAlertConfig: 'store:product:update',
  };

  for (const [method, permission] of Object.entries(expectedPermissions)) {
    it(`${method} 应该有 @RequirePermission('${permission}')`, () => {
      const metadata = Reflect.getMetadata('permission', StoreProductController.prototype[method]);
      expect(metadata).toBe(permission);
    });
  }

  it('所有端点都应有权限装饰器', () => {
    const methods = Object.keys(expectedPermissions);
    expect(methods).toHaveLength(11);

    for (const method of methods) {
      const metadata = Reflect.getMetadata('permission', StoreProductController.prototype[method]);
      expect(metadata).toBeDefined();
    }
  });
});
