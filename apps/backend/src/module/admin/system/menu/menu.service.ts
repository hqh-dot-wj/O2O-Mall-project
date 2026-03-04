import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Result } from 'src/common/response';
import { DelFlagEnum, StatusEnum, CacheEnum } from 'src/common/enum/index';
import { Cacheable } from 'src/common/decorators/redis.decorator';
import { RedisService } from 'src/module/common/redis/redis.service';
import { CreateMenuDto, UpdateMenuDto, ListMenuDto, SortMenuDto } from './dto/index';
import { ListToTree, Uniq } from 'src/common/utils/index';
import { UserService } from '../user/user.service';
import { buildMenus } from './utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { MenuRepository } from './menu.repository';
import { BusinessException } from 'src/common/exceptions/business.exception';

@Injectable()
export class MenuService {
  private logger = new Logger(MenuService.name);
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly menuRepo: MenuRepository,
    private readonly redis: RedisService,
  ) {}

  async create(createMenuDto: CreateMenuDto) {
    const { queryParam, status, ...data } = createMenuDto;
    const res = await this.menuRepo.create({
      ...data,
      status: status === '0' ? StatusEnum.NORMAL : StatusEnum.STOP,
      query: queryParam ?? '',
      path: createMenuDto.path ?? '',
      icon: createMenuDto.icon ?? '',
      delFlag: DelFlagEnum.NORMAL,
    });

    await this.clearCache();
    return Result.ok(res);
  }

  async findAll(query: ListMenuDto) {
    const res = await this.menuRepo.findAllMenus(query);
    const list = res.map((item) => ({
      ...item,
      status: item.status === StatusEnum.NORMAL ? '0' : '1',
      queryParam: item.query,
    }));
    return Result.ok(list);
  }

  async treeSelect() {
    const res = await this.menuRepo.findAllMenus();
    const tree = ListToTree(
      res,
      (m) => m.menuId,
      (m) => m.menuName,
    );
    return Result.ok(tree);
  }

  async roleMenuTreeselect(roleId: number) {
    const res = await this.menuRepo.findAllMenus();
    const tree = ListToTree(
      res,
      (m) => m.menuId,
      (m) => m.menuName,
    );
    const menuIds = await this.menuRepo.findRoleMenus(roleId);
    const checkedKeys = menuIds.map((item) => item.menuId);
    return Result.ok({
      menus: tree,
      checkedKeys: checkedKeys,
    });
  }

  /**
   * 租户套餐菜单树
   */
  async tenantPackageMenuTreeselect(packageId: number) {
    const res = await this.prisma.sysMenu.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
      },
      orderBy: [{ orderNum: 'asc' }, { parentId: 'asc' }],
    });
    const tree = ListToTree(
      res,
      (m) => m.menuId,
      (m) => m.menuName,
    );
    // 查询租户套餐关联的菜单ID
    const tenantPackage = await this.prisma.sysTenantPackage.findUnique({
      where: { packageId },
      select: { menuIds: true },
    });

    let checkedKeys: number[] = [];
    if (tenantPackage && tenantPackage.menuIds) {
      checkedKeys = tenantPackage.menuIds.split(',').map(Number);
    }

    return Result.ok({
      menus: tree,
      checkedKeys,
    });
  }

  async findOne(menuId: number) {
    const res = await this.menuRepo.findById(menuId);
    if (res) {
      return Result.ok({
        ...res,
        status: res.status === StatusEnum.NORMAL ? '0' : '1',
        queryParam: res.query,
      });
    }
    return Result.ok(res);
  }

  async update(updateMenuDto: UpdateMenuDto) {
    const { queryParam, status, menuId, ...rest } = updateMenuDto;
    const updateData: Prisma.SysMenuUpdateInput = {
      ...rest,
      query: queryParam ?? '',
    };

    if (status) {
      updateData.status = status === '0' ? StatusEnum.NORMAL : StatusEnum.STOP;
    }

    const res = await this.menuRepo.update(menuId, updateData);
    await this.clearCache();
    return Result.ok(res);
  }

  /**
   * 删除菜单
   *
   * @param menuId 菜单ID
   * @returns 删除结果
   * @throws BusinessException 存在子菜单时抛出异常
   */
  async remove(menuId: number) {
    // 检查是否存在子菜单
    await this.checkHasChildren(menuId);

    const data = await this.menuRepo.softDelete(menuId);
    await this.clearCache();
    return Result.ok(data);
  }

  /**
   * 检查菜单是否存在子菜单
   *
   * @param menuId 菜单ID
   * @throws BusinessException 存在子菜单时抛出异常
   */
  private async checkHasChildren(menuId: number): Promise<void> {
    const childCount = await this.menuRepo.countChildren(menuId);
    BusinessException.throwIf(childCount > 0, '存在子菜单，不允许删除');
  }

  /**
   * 批量更新菜单排序
   *
   * @param sortMenuDto 排序数据
   * @returns 更新的记录数
   */
  async batchSort(sortMenuDto: SortMenuDto) {
    const count = await this.menuRepo.batchUpdateOrder(sortMenuDto.items);
    await this.clearCache();
    return Result.ok(count);
  }

  /**
   * 根据菜单路径生成权限标识建议
   *
   * @param path 菜单路径，如 /system/user 或 user
   * @param parentPath 父菜单路径（可选）
   * @param menuType 菜单类型：M=目录 C=菜单 F=按钮
   * @param action 操作类型（按钮时使用）：list/add/edit/remove/export/import
   * @returns 权限标识建议
   */
  generatePermission(
    path: string,
    parentPath?: string,
    menuType?: string,
    action?: string,
  ): { perms: string; suggestions: string[] } {
    // 清理路径，移除开头的斜杠
    const cleanPath = path?.replace(/^\/+/, '') || '';
    const cleanParentPath = parentPath?.replace(/^\/+/, '') || '';

    // 构建完整路径
    let fullPath = cleanPath;
    if (cleanParentPath && !cleanPath.includes('/')) {
      fullPath = `${cleanParentPath}/${cleanPath}`;
    }

    // 将路径转换为权限格式：/system/user -> system:user
    const permBase = fullPath.replace(/\//g, ':');

    // 根据菜单类型生成权限标识
    let perms = '';
    const suggestions: string[] = [];

    if (menuType === 'F') {
      // 按钮类型：添加操作后缀
      const actionSuffix = action || 'list';
      perms = `${permBase}:${actionSuffix}`;
      suggestions.push(
        `${permBase}:list`,
        `${permBase}:query`,
        `${permBase}:add`,
        `${permBase}:edit`,
        `${permBase}:remove`,
        `${permBase}:export`,
        `${permBase}:import`,
      );
    } else if (menuType === 'C') {
      // 菜单类型：默认 list 权限
      perms = `${permBase}:list`;
      suggestions.push(`${permBase}:list`, `${permBase}:query`);
    } else {
      // 目录类型：通常不需要权限标识
      perms = '';
      suggestions.push(`${permBase}:list`);
    }

    return { perms, suggestions: [...new Set(suggestions)] };
  }

  /**
   * 获取菜单使用情况统计
   *
   * @param menuId 菜单ID
   * @returns 使用该菜单的角色列表
   */
  async getMenuUsage(menuId: number) {
    const roleMenus = await this.prisma.sysRoleMenu.findMany({
      where: { menuId },
      select: { roleId: true },
    });
    const roleIds = [...new Set(roleMenus.map((rm) => rm.roleId))];

    if (roleIds.length === 0) {
      return Result.ok({ menuId, roleCount: 0, roles: [] });
    }

    const rolesData = await this.prisma.sysRole.findMany({
      where: { roleId: { in: roleIds } },
      select: {
        roleId: true,
        roleName: true,
        roleKey: true,
        status: true,
      },
    });

    const roles = rolesData.map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      roleKey: role.roleKey,
      status: role.status === StatusEnum.NORMAL ? '0' : '1',
    }));

    return Result.ok({
      menuId,
      roleCount: roles.length,
      roles,
    });
  }

  /**
   * 级联删除菜单
   */
  async cascadeRemove(menuIds: number[]) {
    const data = await this.prisma.sysMenu.updateMany({
      where: {
        menuId: {
          in: menuIds,
        },
      },
      data: {
        delFlag: DelFlagEnum.DELETE,
      },
    });
    await this.clearCache();
    return Result.ok(data.count);
  }

  /**
   * 清除菜单缓存
   */
  private async clearCache() {
    const keys = await this.redis.keys(`${CacheEnum.SYS_MENU_KEY}*`);
    if (keys && keys.length > 0) {
      this.logger.log(`Clearing menu cache keys: ${keys.join(',')}`);
      await this.redis.del(keys);
    } else {
      this.logger.log('No menu cache keys found to clear.');
    }
  }

  async findMany(args: Prisma.SysMenuFindManyArgs) {
    return await this.prisma.sysMenu.findMany(args);
  }

  /**
   * 根据用户ID查询菜单
   *
   * @param userId 用户ID
   * @return 菜单列表
   */
  @Cacheable(CacheEnum.SYS_MENU_KEY, 'user:{userId}')
  async getMenuListByUserId(userId: number) {
    const roleIds = await this.userService.getRoleIds([userId]);
    let menuIds: number[] = [];

    if (roleIds.includes(1)) {
      const allMenus = await this.prisma.sysMenu.findMany({
        where: {
          delFlag: DelFlagEnum.NORMAL,
          status: StatusEnum.NORMAL,
        },
        select: {
          menuId: true,
        },
      });
      menuIds = allMenus.map((item) => item.menuId);
    } else {
      const menuWidthRoleList = await this.prisma.sysRoleMenu.findMany({
        where: {
          roleId: {
            in: roleIds,
          },
        },
        select: {
          menuId: true,
        },
      });
      menuIds = Uniq(menuWidthRoleList.map((item) => item.menuId));
    }

    if (menuIds.length === 0) {
      return Result.ok([]);
    }

    const menuList = await this.prisma.sysMenu.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
        status: StatusEnum.NORMAL,
        menuId: {
          in: menuIds,
        },
      },
      orderBy: {
        orderNum: 'asc',
      },
    });
    // 构建前端需要的菜单树
    const menuTree = buildMenus(menuList);
    return Result.ok(menuTree);
  }
}
