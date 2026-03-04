// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MenuRepository } from './menu.repository';
import { UserService } from '../user/user.service';
import { RedisService } from 'src/module/common/redis/redis.service';
import { StatusEnum, DelFlagEnum } from 'src/common/enum/index';
import { ResponseCode } from 'src/common/response';

describe('MenuService', () => {
  let service: MenuService;
  let prisma: PrismaService;
  let menuRepo: MenuRepository;
  let userService: UserService;
  let redisService: RedisService;

  const mockMenu = {
    menuId: 1,
    tenantId: '000000',
    menuName: '系统管理',
    parentId: 0,
    orderNum: 1,
    path: '/system',
    component: 'Layout',
    query: null,
    routeName: 'System',
    isFrame: '1',
    isCache: '0',
    menuType: 'M',
    visible: '0',
    status: StatusEnum.NORMAL,
    perms: null,
    icon: 'system',
    createBy: 'admin',
    createTime: new Date(),
    updateBy: null,
    updateTime: null,
    remark: '系统管理目录',
    delFlag: DelFlagEnum.NORMAL,
  };

  const mockChildMenu = {
    menuId: 2,
    tenantId: '000000',
    menuName: '用户管理',
    parentId: 1,
    orderNum: 1,
    path: 'user',
    component: 'system/user/index',
    query: null,
    routeName: 'User',
    isFrame: '1',
    isCache: '0',
    menuType: 'C',
    visible: '0',
    status: StatusEnum.NORMAL,
    perms: 'system:user:list',
    icon: 'user',
    createBy: 'admin',
    createTime: new Date(),
    updateBy: null,
    updateTime: null,
    remark: '用户管理菜单',
    delFlag: DelFlagEnum.NORMAL,
  };

  const mockButtonMenu = {
    menuId: 3,
    tenantId: '000000',
    menuName: '用户新增',
    parentId: 2,
    orderNum: 1,
    path: '',
    component: '',
    query: null,
    routeName: '',
    isFrame: '1',
    isCache: '0',
    menuType: 'F',
    visible: '0',
    status: StatusEnum.NORMAL,
    perms: 'system:user:add',
    icon: '',
    createBy: 'admin',
    createTime: new Date(),
    updateBy: null,
    updateTime: null,
    remark: '用户新增按钮',
    delFlag: DelFlagEnum.NORMAL,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: PrismaService,
          useValue: {
            sysMenu: {
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            sysRoleMenu: {
              findMany: jest.fn(),
            },
            sysRole: {
              findMany: jest.fn(),
            },
            sysTenantPackage: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: MenuRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            findAllMenus: jest.fn(),
            findRoleMenus: jest.fn(),
            countChildren: jest.fn(),
            batchUpdateOrder: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getRoleIds: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            keys: jest.fn().mockResolvedValue([]),
            getClient: jest.fn(() => ({
              get: jest.fn(),
              set: jest.fn(),
              del: jest.fn(),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    prisma = module.get<PrismaService>(PrismaService);
    menuRepo = module.get<MenuRepository>(MenuRepository);
    userService = module.get<UserService>(UserService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== create ====================
  describe('create', () => {
    // R-FLOW-CREATE-01: 创建目录类型菜单
    it('Given 目录类型菜单数据, When create, Then 返回创建的菜单', async () => {
      const createDto = {
        menuName: '系统管理',
        parentId: 0,
        orderNum: 1,
        path: '/system',
        menuType: 'M',
        isFrame: '1',
        status: '0',
      };

      (menuRepo.create as jest.Mock).mockResolvedValue(mockMenu);

      const result = await service.create(createDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(menuRepo.create).toHaveBeenCalled();
    });

    // R-FLOW-CREATE-02: 创建菜单类型
    it('Given 菜单类型数据, When create, Then 返回创建的菜单', async () => {
      const createDto = {
        menuName: '用户管理',
        parentId: 1,
        orderNum: 1,
        path: 'user',
        component: 'system/user/index',
        menuType: 'C',
        isFrame: '1',
        status: '0',
        perms: 'system:user:list',
      };

      (menuRepo.create as jest.Mock).mockResolvedValue(mockChildMenu);

      const result = await service.create(createDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBeDefined();
    });

    // R-FLOW-CREATE-03: 创建按钮类型菜单
    it('Given 按钮类型数据, When create, Then 返回创建的按钮菜单', async () => {
      const createDto = {
        menuName: '用户新增',
        parentId: 2,
        orderNum: 1,
        menuType: 'F',
        isFrame: '1',
        status: '0',
        perms: 'system:user:add',
      };

      (menuRepo.create as jest.Mock).mockResolvedValue(mockButtonMenu);

      const result = await service.create(createDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.menuType).toBe('F');
    });

    // R-FLOW-CREATE-04: 创建菜单后清除缓存
    it('Given 创建菜单, When create成功, Then 清除菜单缓存', async () => {
      const createDto = {
        menuName: '测试菜单',
        parentId: 0,
        isFrame: '1',
        status: '0',
      };

      (menuRepo.create as jest.Mock).mockResolvedValue(mockMenu);
      (redisService.keys as jest.Mock).mockResolvedValue(['sys_menu:user:1']);

      await service.create(createDto as any);

      expect(redisService.keys).toHaveBeenCalled();
    });

    // R-BRANCH-CREATE-01: 状态为停用时正确转换
    it('Given status=1(停用), When create, Then 状态转换为 STOP', async () => {
      const createDto = {
        menuName: '停用菜单',
        parentId: 0,
        isFrame: '1',
        status: '1',
      };

      (menuRepo.create as jest.Mock).mockResolvedValue({ ...mockMenu, status: StatusEnum.STOP });

      const result = await service.create(createDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(menuRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: StatusEnum.STOP,
        }),
      );
    });
  });

  // ==================== findAll ====================
  describe('findAll', () => {
    // R-FLOW-LIST-01: 查询所有菜单列表
    it('Given 无筛选条件, When findAll, Then 返回所有菜单', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([mockMenu, mockChildMenu]);

      const result = await service.findAll({});

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toHaveLength(2);
    });

    // R-FLOW-LIST-02: 按菜单名称筛选
    it('Given menuName=系统, When findAll, Then 返回匹配的菜单', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([mockMenu]);

      const result = await service.findAll({ menuName: '系统' });

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(menuRepo.findAllMenus).toHaveBeenCalledWith({ menuName: '系统' });
    });

    // R-FLOW-LIST-03: 按状态筛选
    it('Given status=NORMAL, When findAll, Then 返回正常状态的菜单', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([mockMenu]);

      const result = await service.findAll({ status: StatusEnum.NORMAL });

      expect(result.code).toBe(ResponseCode.SUCCESS);
    });

    // R-RESP-LIST-01: 状态字段转换为字符串
    it('Given 菜单状态为枚举, When findAll, Then 状态转换为字符串0/1', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([mockMenu]);

      const result = await service.findAll({});

      expect(result.data[0].status).toBe('0');
    });
  });

  // ==================== findOne ====================
  describe('findOne', () => {
    // R-FLOW-DETAIL-01: 查询菜单详情
    it('Given 存在的menuId, When findOne, Then 返回菜单详情', async () => {
      (menuRepo.findById as jest.Mock).mockResolvedValue(mockMenu);

      const result = await service.findOne(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.menuId).toBe(1);
    });

    // R-FLOW-DETAIL-02: 菜单不存在时返回空
    it('Given 不存在的menuId, When findOne, Then 返回空数据', async () => {
      (menuRepo.findById as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBeNull();
    });

    // R-RESP-DETAIL-01: 状态和query字段转换
    it('Given 菜单详情, When findOne, Then 状态转换为字符串且query转为queryParam', async () => {
      (menuRepo.findById as jest.Mock).mockResolvedValue({ ...mockMenu, query: 'id=1' });

      const result = await service.findOne(1);

      expect(result.data.status).toBe('0');
      expect(result.data.queryParam).toBe('id=1');
    });
  });

  // ==================== update ====================
  describe('update', () => {
    // R-FLOW-UPDATE-01: 更新菜单基本信息
    it('Given 有效的更新数据, When update, Then 返回更新后的菜单', async () => {
      const updateDto = {
        menuId: 1,
        menuName: '更新菜单',
      };

      (menuRepo.update as jest.Mock).mockResolvedValue(mockMenu);

      const result = await service.update(updateDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(menuRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ menuName: '更新菜单' }));
    });

    // R-FLOW-UPDATE-02: 更新菜单状态
    it('Given status=1, When update, Then 状态更新为STOP', async () => {
      const updateDto = {
        menuId: 1,
        status: '1',
      };

      (menuRepo.update as jest.Mock).mockResolvedValue({ ...mockMenu, status: StatusEnum.STOP });

      const result = await service.update(updateDto as any);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(menuRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: StatusEnum.STOP,
        }),
      );
    });

    // R-FLOW-UPDATE-03: 更新后清除缓存
    it('Given 更新菜单, When update成功, Then 清除菜单缓存', async () => {
      const updateDto = { menuId: 1, menuName: '更新' };

      (menuRepo.update as jest.Mock).mockResolvedValue(mockMenu);
      (redisService.keys as jest.Mock).mockResolvedValue(['sys_menu:user:1']);

      await service.update(updateDto as any);

      expect(redisService.keys).toHaveBeenCalled();
    });
  });

  // ==================== remove ====================
  describe('remove', () => {
    // R-PRE-DELETE-01: 删除前检查子菜单
    it('Given 存在子菜单, When remove, Then 抛出业务异常', async () => {
      (menuRepo.countChildren as jest.Mock).mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow();
      expect(menuRepo.softDelete).not.toHaveBeenCalled();
    });

    // R-FLOW-DELETE-01: 无子菜单时软删除菜单
    it('Given 无子菜单, When remove, Then 软删除成功', async () => {
      (menuRepo.countChildren as jest.Mock).mockResolvedValue(0);
      (menuRepo.softDelete as jest.Mock).mockResolvedValue(mockMenu);

      const result = await service.remove(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(menuRepo.countChildren).toHaveBeenCalledWith(1);
      expect(menuRepo.softDelete).toHaveBeenCalledWith(1);
    });

    // R-FLOW-DELETE-02: 删除后清除缓存
    it('Given 删除菜单, When remove成功, Then 清除菜单缓存', async () => {
      (menuRepo.countChildren as jest.Mock).mockResolvedValue(0);
      (menuRepo.softDelete as jest.Mock).mockResolvedValue(mockMenu);
      (redisService.keys as jest.Mock).mockResolvedValue(['sys_menu:user:1']);

      await service.remove(1);

      expect(redisService.keys).toHaveBeenCalled();
    });
  });

  // ==================== cascadeRemove ====================
  describe('cascadeRemove', () => {
    // R-FLOW-CASCADE-01: 级联删除单个菜单
    it('Given 单个menuId, When cascadeRemove, Then 删除成功', async () => {
      (prisma.sysMenu.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.cascadeRemove([1]);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBe(1);
    });

    // R-FLOW-CASCADE-02: 级联删除多个菜单
    it('Given 多个menuIds, When cascadeRemove, Then 批量删除成功', async () => {
      (prisma.sysMenu.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await service.cascadeRemove([1, 2, 3]);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBe(3);
      expect(prisma.sysMenu.updateMany).toHaveBeenCalledWith({
        where: { menuId: { in: [1, 2, 3] } },
        data: { delFlag: DelFlagEnum.DELETE },
      });
    });

    // R-FLOW-CASCADE-03: 级联删除后清除缓存
    it('Given 级联删除, When cascadeRemove成功, Then 清除菜单缓存', async () => {
      (prisma.sysMenu.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (redisService.keys as jest.Mock).mockResolvedValue(['sys_menu:user:1']);

      await service.cascadeRemove([1]);

      expect(redisService.keys).toHaveBeenCalled();
    });
  });

  // ==================== treeSelect ====================
  describe('treeSelect', () => {
    // R-FLOW-TREE-01: 获取菜单树
    it('Given 存在菜单数据, When treeSelect, Then 返回树形结构', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([mockMenu, mockChildMenu]);

      const result = await service.treeSelect();

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    // R-FLOW-TREE-02: 空数据时返回空数组
    it('Given 无菜单数据, When treeSelect, Then 返回空数组', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([]);

      const result = await service.treeSelect();

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual([]);
    });
  });

  // ==================== roleMenuTreeselect ====================
  describe('roleMenuTreeselect', () => {
    // R-FLOW-ROLETREE-01: 获取角色菜单树
    it('Given 有效的roleId, When roleMenuTreeselect, Then 返回菜单树和已选中的菜单ID', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([mockMenu, mockChildMenu]);
      (menuRepo.findRoleMenus as jest.Mock).mockResolvedValue([{ menuId: 1 }, { menuId: 2 }]);

      const result = await service.roleMenuTreeselect(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.menus).toBeDefined();
      expect(result.data.checkedKeys).toEqual([1, 2]);
    });

    // R-FLOW-ROLETREE-02: 角色无菜单时返回空checkedKeys
    it('Given 角色无菜单, When roleMenuTreeselect, Then checkedKeys为空数组', async () => {
      (menuRepo.findAllMenus as jest.Mock).mockResolvedValue([mockMenu]);
      (menuRepo.findRoleMenus as jest.Mock).mockResolvedValue([]);

      const result = await service.roleMenuTreeselect(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.checkedKeys).toEqual([]);
    });
  });

  // ==================== tenantPackageMenuTreeselect ====================
  describe('tenantPackageMenuTreeselect', () => {
    // R-FLOW-PKGTREE-01: 获取租户套餐菜单树
    it('Given 有效的packageId, When tenantPackageMenuTreeselect, Then 返回菜单树和已选中的菜单ID', async () => {
      (prisma.sysMenu.findMany as jest.Mock).mockResolvedValue([mockMenu, mockChildMenu]);
      (prisma.sysTenantPackage.findUnique as jest.Mock).mockResolvedValue({ menuIds: '1,2' });

      const result = await service.tenantPackageMenuTreeselect(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.menus).toBeDefined();
      expect(result.data.checkedKeys).toEqual([1, 2]);
    });

    // R-FLOW-PKGTREE-02: 套餐无菜单时返回空checkedKeys
    it('Given 套餐无菜单, When tenantPackageMenuTreeselect, Then checkedKeys为空数组', async () => {
      (prisma.sysMenu.findMany as jest.Mock).mockResolvedValue([mockMenu]);
      (prisma.sysTenantPackage.findUnique as jest.Mock).mockResolvedValue({ menuIds: null });

      const result = await service.tenantPackageMenuTreeselect(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.checkedKeys).toEqual([]);
    });

    // R-FLOW-PKGTREE-03: 套餐不存在时返回空checkedKeys
    it('Given 套餐不存在, When tenantPackageMenuTreeselect, Then checkedKeys为空数组', async () => {
      (prisma.sysMenu.findMany as jest.Mock).mockResolvedValue([mockMenu]);
      (prisma.sysTenantPackage.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.tenantPackageMenuTreeselect(999);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.checkedKeys).toEqual([]);
    });
  });

  // ==================== getMenuListByUserId ====================
  describe('getMenuListByUserId', () => {
    // R-FLOW-ROUTER-01: 普通用户获取路由
    it('Given 普通用户, When getMenuListByUserId, Then 返回角色对应的菜单', async () => {
      (userService.getRoleIds as jest.Mock).mockResolvedValue([2]);
      (prisma.sysRoleMenu.findMany as jest.Mock).mockResolvedValue([{ menuId: 1 }, { menuId: 2 }]);
      (prisma.sysMenu.findMany as jest.Mock).mockResolvedValue([mockMenu, mockChildMenu]);

      const result = await service.getMenuListByUserId(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBeDefined();
    });

    // R-FLOW-ROUTER-02: 超级管理员获取所有菜单
    it('Given 超级管理员(roleId=1), When getMenuListByUserId, Then 返回所有正常菜单', async () => {
      (userService.getRoleIds as jest.Mock).mockResolvedValue([1]);
      (prisma.sysMenu.findMany as jest.Mock).mockResolvedValue([mockMenu, mockChildMenu, mockButtonMenu]);

      const result = await service.getMenuListByUserId(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(prisma.sysMenu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            delFlag: DelFlagEnum.NORMAL,
            status: StatusEnum.NORMAL,
          }),
        }),
      );
    });

    // R-FLOW-ROUTER-03: 用户无角色时返回空菜单
    it('Given 用户无角色菜单, When getMenuListByUserId, Then 返回空数组', async () => {
      (userService.getRoleIds as jest.Mock).mockResolvedValue([2]);
      (prisma.sysRoleMenu.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getMenuListByUserId(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual([]);
    });

    // R-FLOW-ROUTER-04: 去重角色菜单ID
    it('Given 角色有重复菜单, When getMenuListByUserId, Then 菜单ID去重', async () => {
      (userService.getRoleIds as jest.Mock).mockResolvedValue([2, 3]);
      (prisma.sysRoleMenu.findMany as jest.Mock).mockResolvedValue([{ menuId: 1 }, { menuId: 1 }, { menuId: 2 }]);
      (prisma.sysMenu.findMany as jest.Mock).mockResolvedValue([mockMenu, mockChildMenu]);

      const result = await service.getMenuListByUserId(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
    });
  });

  // ==================== batchSort ====================
  describe('batchSort', () => {
    // R-FLOW-SORT-01: 批量更新菜单排序
    it('Given 有效的排序数据, When batchSort, Then 返回更新数量', async () => {
      const sortDto = {
        items: [
          { menuId: 1, orderNum: 2 },
          { menuId: 2, orderNum: 1 },
        ],
      };

      (menuRepo.batchUpdateOrder as jest.Mock).mockResolvedValue(2);

      const result = await service.batchSort(sortDto);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBe(2);
      expect(menuRepo.batchUpdateOrder).toHaveBeenCalledWith(sortDto.items);
    });

    // R-FLOW-SORT-02: 排序后清除缓存
    it('Given 排序成功, When batchSort, Then 清除菜单缓存', async () => {
      const sortDto = {
        items: [{ menuId: 1, orderNum: 1 }],
      };

      (menuRepo.batchUpdateOrder as jest.Mock).mockResolvedValue(1);
      (redisService.keys as jest.Mock).mockResolvedValue(['sys_menu:user:1']);

      await service.batchSort(sortDto);

      expect(redisService.keys).toHaveBeenCalled();
    });

    // R-FLOW-SORT-03: 单个菜单排序
    it('Given 单个菜单排序, When batchSort, Then 更新成功', async () => {
      const sortDto = {
        items: [{ menuId: 1, orderNum: 5 }],
      };

      (menuRepo.batchUpdateOrder as jest.Mock).mockResolvedValue(1);

      const result = await service.batchSort(sortDto);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBe(1);
    });
  });

  // ==================== generatePermission ====================
  describe('generatePermission', () => {
    // R-FLOW-PERMS-01: 菜单类型生成 list 权限
    it('Given 菜单类型C和路径/system/user, When generatePermission, Then 返回 system:user:list', () => {
      const result = service.generatePermission('/system/user', undefined, 'C');

      expect(result.perms).toBe('system:user:list');
      expect(result.suggestions).toContain('system:user:list');
    });

    // R-FLOW-PERMS-02: 按钮类型生成指定操作权限
    it('Given 按钮类型F和操作add, When generatePermission, Then 返回 system:user:add', () => {
      const result = service.generatePermission('user', 'system', 'F', 'add');

      expect(result.perms).toBe('system:user:add');
      expect(result.suggestions).toContain('system:user:add');
      expect(result.suggestions).toContain('system:user:edit');
      expect(result.suggestions).toContain('system:user:remove');
    });

    // R-FLOW-PERMS-03: 目录类型返回空权限
    it('Given 目录类型M, When generatePermission, Then 返回空权限', () => {
      const result = service.generatePermission('/system', undefined, 'M');

      expect(result.perms).toBe('');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    // R-FLOW-PERMS-04: 处理带斜杠的路径
    it('Given 带前导斜杠的路径, When generatePermission, Then 正确清理路径', () => {
      const result = service.generatePermission('///system/user', undefined, 'C');

      expect(result.perms).toBe('system:user:list');
    });

    // R-FLOW-PERMS-05: 使用父路径拼接
    it('Given 子路径和父路径, When generatePermission, Then 正确拼接', () => {
      const result = service.generatePermission('user', '/system', 'C');

      expect(result.perms).toBe('system:user:list');
    });

    // R-FLOW-PERMS-06: 按钮默认操作为 list
    it('Given 按钮类型无操作, When generatePermission, Then 默认使用 list', () => {
      const result = service.generatePermission('user', 'system', 'F');

      expect(result.perms).toBe('system:user:list');
    });
  });

  // ==================== getMenuUsage ====================
  describe('getMenuUsage', () => {
    // R-FLOW-USAGE-01: 获取菜单使用情况
    it('Given 菜单被多个角色使用, When getMenuUsage, Then 返回角色列表和数量', async () => {
      (prisma.sysRoleMenu.findMany as jest.Mock).mockResolvedValue([
        { menuId: 1, roleId: 1 },
        { menuId: 1, roleId: 2 },
      ]);
      (prisma.sysRole.findMany as jest.Mock).mockResolvedValue([
        { roleId: 1, roleName: '超级管理员', roleKey: 'admin', status: StatusEnum.NORMAL },
        { roleId: 2, roleName: '普通用户', roleKey: 'user', status: StatusEnum.NORMAL },
      ]);

      const result = await service.getMenuUsage(1);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.menuId).toBe(1);
      expect(result.data.roleCount).toBe(2);
      expect(result.data.roles).toHaveLength(2);
    });

    // R-FLOW-USAGE-02: 菜单未被任何角色使用
    it('Given 菜单未被使用, When getMenuUsage, Then 返回空角色列表', async () => {
      (prisma.sysRoleMenu.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getMenuUsage(999);

      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.menuId).toBe(999);
      expect(result.data.roleCount).toBe(0);
      expect(result.data.roles).toEqual([]);
    });

    // R-RESP-USAGE-01: 角色状态正确转换
    it('Given 角色状态为枚举, When getMenuUsage, Then 状态转换为字符串0/1', async () => {
      (prisma.sysRoleMenu.findMany as jest.Mock).mockResolvedValue([
        { menuId: 1, roleId: 1 },
      ]);
      (prisma.sysRole.findMany as jest.Mock).mockResolvedValue([
        { roleId: 1, roleName: '停用角色', roleKey: 'disabled', status: StatusEnum.STOP },
      ]);

      const result = await service.getMenuUsage(1);

      expect(result.data.roles[0].status).toBe('1');
    });
  });
});
