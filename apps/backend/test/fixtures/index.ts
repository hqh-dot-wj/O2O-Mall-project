/**
 * 测试 Fixture 统一导出
 * 用法：
 * - 单元：mockRepo.findById.mockResolvedValue(createMemberFixture({ memberId: 'm1' }));
 * - 集成：await prisma.umsMember.create({ data: createMemberFixture({ tenantId: '00000' }) });
 */
export { createTenantFixture, type TenantFixtureOpts } from './tenant';
export { createMemberFixture, type MemberFixtureOpts } from './member';
