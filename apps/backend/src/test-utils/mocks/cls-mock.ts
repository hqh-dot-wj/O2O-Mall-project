/**
 * 共享 ClsService Mock，用于单元测试。
 * 用法：const cls = createClsMock('00000'); 在 Nest 中 { provide: ClsService, useValue: cls }
 * @param tenantId 默认租户 ID，不传则返回 undefined
 */
export const createClsMock = (tenantId?: string) => ({
  get: jest.fn().mockReturnValue(tenantId ?? undefined),
  set: jest.fn(),
  run: jest.fn((fn: () => unknown) => fn()),
});

export type ClsMock = ReturnType<typeof createClsMock>;
