import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Uniq } from 'src/common/utils/index';

/**
 * 用户角色查询服务（无循环依赖）
 *
 * @description 提供纯 Prisma 查询的用户角色关系查询，
 * 从 UserAuthService 中提取，避免 UserService ↔ RoleService ↔ MenuService 循环依赖。
 */
@Injectable()
export class UserRoleQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据用户ID列表查询关联的角色ID列表
   *
   * @param userIds 用户ID数组
   * @returns 去重后的角色ID数组
   */
  async getRoleIds(userIds: Array<number>): Promise<number[]> {
    if (!userIds.length) {
      return [];
    }
    const roleList = await this.prisma.sysUserRole.findMany({
      where: {
        userId: { in: userIds },
      },
      select: { roleId: true },
    });
    const roleIds = roleList.map((item) => item.roleId);
    return Uniq(roleIds);
  }
}
