/**
 * 租户 Fixture 工厂，用于单元/集成/E2E 测试。
 * 返回符合 Prisma SysTenant 结构的对象，可通过 opts 覆盖默认值。
 */
import { DelFlag, Status } from '@prisma/client';

export interface TenantFixtureOpts {
  tenantId?: string;
  companyName?: string;
  status?: Status;
  [key: string]: unknown;
}

const now = new Date();

export const createTenantFixture = (opts: TenantFixtureOpts = {}) => ({
  tenantId: opts.tenantId ?? '00000',
  companyName: opts.companyName ?? '测试租户',
  contactUserName: 'admin',
  contactPhone: '13800138000',
  licenseNumber: null,
  address: null,
  intro: null,
  domain: null,
  packageId: null,
  expireTime: null,
  accountCount: -1,
  storageQuota: 10240,
  storageUsed: 0,
  status: opts.status ?? Status.NORMAL,
  delFlag: DelFlag.NORMAL,
  createBy: 'system',
  createTime: now,
  updateBy: '',
  updateTime: now,
  remark: null,
  regionCode: null,
  isDirect: true,
  ...opts,
});
