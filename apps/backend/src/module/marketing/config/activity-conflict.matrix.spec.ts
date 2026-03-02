import {
  checkConflict,
  CONFLICT_MATRIX,
  ConflictType,
  getActivityPriority,
} from './activity-conflict.matrix';

describe('activity-conflict.matrix', () => {
  it('FLASH_SALE 应存在并可与自身互斥', () => {
    expect(CONFLICT_MATRIX.FLASH_SALE).toBeDefined();
    expect(CONFLICT_MATRIX.FLASH_SALE.FLASH_SALE.type).toBe(ConflictType.EXCLUSIVE);
  });

  it('GROUP_BUY 与 FLASH_SALE 应互斥', () => {
    const result = checkConflict('GROUP_BUY', 'FLASH_SALE');
    expect(result.conflict).toBe(true);
    expect(result.rule?.type).toBe(ConflictType.EXCLUSIVE);
  });

  it('会员升级与 FLASH_SALE 应按优先级处理', () => {
    const result = checkConflict('MEMBER_UPGRADE', 'FLASH_SALE');
    expect(result.conflict).toBe(false);
    expect(result.rule?.type).toBe(ConflictType.PRIORITY);
  });

  it('FLASH_SALE 优先级应为最高', () => {
    expect(getActivityPriority('FLASH_SALE')).toBe(1);
  });
});
