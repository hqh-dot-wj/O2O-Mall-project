// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { DeptService } from './dept.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeptRepository } from './dept.repository';
import { RedisService } from 'src/module/common/redis/redis.service';
import { StatusEnum, DelFlagEnum, DataScopeEnum } from 'src/common/enum/index';
import { ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';

/**
 * 部门管理模块单元测试
 *
 * 测试覆盖验收标准：
 * - AC-1: 创建部门时，父部门ID为0时创建顶级部门
 * - AC-2: 创建部门时，自动计算祖级列表
 * - AC-3: 创建部门时，父部门不存在时返回错误
 * - AC-4: 修改部门时，如果修改了父部门，重新计算祖级列表
 * - AC-5: 删除部门时，如果存在子部门，返回错误
 * - AC-6: 删除部门时，使用软删除，数据不物理删除
 * - AC-9: 排除节点查询时，排除指定节点及其所有子节点
 * - AC-10: 获取部门树时，按显示顺序升序排列
 * - AC-11: 获取子部门ID列表时，包含指定部门及其所有子部门
 * - AC-12: 本部门数据权限时，返回指定部门ID
 * - AC-13: 本部门及下级数据权限时，返回指定部门及其所有子部门ID
 * - AC-14: 仅本人数据权限时，返回空数组
 */
describe('DeptService', () => {
  let service: DeptService;
  let prisma: PrismaService;
  let deptRepo: DeptRepository;

  // 测试数据 Fixtures
  const mockRootDept = {
    deptId: 100,
    tenantId: '000000',
    parentId: 0,
    ancestors: '0',
    deptName: '总公司',
    orderNum: 0,
    leader: 'admin',
    phone: '15888888888',
    email: 'admin@example.com',
    status: StatusEnum.NORMAL,
    delFlag: DelFlagEnum.NORMAL,
    createBy: 'admin',
    createTime: new Date(),
    updateBy: null,
    updateTime: null,
  };

  const mockChildDept = {
    ...mockRootDept,
    deptId: 101,
    parentId: 100,
    ancestors: '0,100',
    deptName: '技术部',
    orderNum: 1,
  };

  const mockGrandchildDept = {
    ...mockRootDept,
    deptId: 102,
    parentId: 101,
    ancestors: '0,100,101',
    deptName: '前端组',
    orderNum: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeptService,
        {
          provide: PrismaService,
          useValue: {
            sysDept: {
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
            },
            sysUser: {
              count: jest.fn(),
            },
            sysDeptLeaderLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: DeptRepository,
          useValue: {
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            countChildren: jest.fn(),
            countUsers: jest.fn(),
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
        {
          provide: ClsService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'tenantId') return '000000';
              if (key === 'userName') return 'admin';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DeptService>(DeptService);
    prisma = module.get<PrismaService>(PrismaService);
    deptRepo = module.get<DeptRepository>(DeptRepository);

    jest.clearAllMocks();
  });

  // ============================================================
  // 创建部门测试
  // ============================================================
  describe('create', () => {
    // AC-1: 创建部门时，父部门ID为0时创建顶级部门
    it('Given parentId=0, When create, Then ancestors="0" (AC-1)', async () => {
      // Arrange
      const createDto = {
        parentId: 0,
        deptName: '新顶级部门',
        orderNum: 1,
      };
      (deptRepo.create as jest.Mock).mockResolvedValue({ deptId: 200 });

      // Act
      const result = await service.create(createDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(deptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 0,
          ancestors: '0',
          deptName: '新顶级部门',
        }),
      );
    });

    // AC-2: 创建部门时，自动计算祖级列表
    it('Given parentId=100 with ancestors="0", When create, Then ancestors="0,100" (AC-2)', async () => {
      // Arrange
      const createDto = {
        parentId: 100,
        deptName: '子部门',
        orderNum: 1,
      };
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue({
        deptId: 100,
        ancestors: '0',
      });
      (deptRepo.create as jest.Mock).mockResolvedValue({ deptId: 201 });

      // Act
      const result = await service.create(createDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(deptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 100,
          ancestors: '0,100',
        }),
      );
    });

    // AC-2: 多层级祖级列表计算
    it('Given parentId=101 with ancestors="0,100", When create, Then ancestors="0,100,101" (AC-2)', async () => {
      // Arrange
      const createDto = {
        parentId: 101,
        deptName: '三级部门',
        orderNum: 0,
      };
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue({
        deptId: 101,
        ancestors: '0,100',
      });
      (deptRepo.create as jest.Mock).mockResolvedValue({ deptId: 202 });

      // Act
      const result = await service.create(createDto as any);

      // Assert
      expect(deptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ancestors: '0,100,101',
        }),
      );
    });

    // AC-3: 创建部门时，父部门不存在时返回错误
    it('Given parentId=999 not exists, When create, Then 500 父级部门不存在 (AC-3)', async () => {
      // Arrange
      const createDto = {
        parentId: 999,
        deptName: '子部门',
        orderNum: 1,
      };
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.create(createDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.INTERNAL_SERVER_ERROR);
      expect(result.msg).toBe('父级部门不存在');
      expect(deptRepo.create).not.toHaveBeenCalled();
    });

    // 边界情况：父部门 ancestors 为空字符串
    it('Given parent.ancestors is empty, When create, Then ancestors=parentId', async () => {
      // Arrange
      const createDto = {
        parentId: 100,
        deptName: '子部门',
        orderNum: 1,
      };
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue({
        deptId: 100,
        ancestors: '',
      });
      (deptRepo.create as jest.Mock).mockResolvedValue({ deptId: 201 });

      // Act
      await service.create(createDto as any);

      // Assert
      expect(deptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ancestors: '100',
        }),
      );
    });
  });

  // ============================================================
  // 查询部门列表测试
  // ============================================================
  describe('findAll', () => {
    it('Given no filter, When findAll, Then return all departments', async () => {
      // Arrange
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([mockRootDept, mockChildDept]);

      // Act
      const result = await service.findAll({});

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toHaveLength(2);
      expect(prisma.sysDept.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { delFlag: DelFlagEnum.NORMAL },
          orderBy: { orderNum: 'asc' },
        }),
      );
    });

    it('Given deptName filter, When findAll, Then filter by name contains', async () => {
      // Arrange
      const query = { deptName: '技术' };
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([mockChildDept]);

      // Act
      await service.findAll(query);

      // Assert
      const callArgs = (prisma.sysDept.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.deptName).toEqual({ contains: '技术' });
    });

    it('Given status filter, When findAll, Then filter by status', async () => {
      // Arrange
      const query = { status: StatusEnum.NORMAL };
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([mockRootDept]);

      // Act
      await service.findAll(query);

      // Assert
      const callArgs = (prisma.sysDept.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.status).toBe(StatusEnum.NORMAL);
    });
  });

  // ============================================================
  // 查询部门详情测试
  // ============================================================
  describe('findOne', () => {
    it('Given valid deptId, When findOne, Then return department detail', async () => {
      // Arrange
      (deptRepo.findById as jest.Mock).mockResolvedValue(mockRootDept);

      // Act
      const result = await service.findOne(100);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.deptId).toBe(100);
      expect(deptRepo.findById).toHaveBeenCalledWith(100);
    });
  });

  // ============================================================
  // 修改部门测试
  // ============================================================
  describe('update', () => {
    it('Given valid update without parent change, When update, Then success', async () => {
      // Arrange
      const updateDto = {
        deptId: 100,
        deptName: '更新后的部门名',
        parentId: 0,
        orderNum: 1,
      };
      (deptRepo.findById as jest.Mock).mockResolvedValue(mockRootDept);
      (deptRepo.update as jest.Mock).mockResolvedValue(mockRootDept);

      // Act
      const result = await service.update(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
    });

    // AC-4: 修改部门时，如果修改了父部门，重新计算祖级列表
    it('Given parentId changed to 100, When update, Then recalculate ancestors (AC-4)', async () => {
      // Arrange
      const updateDto = {
        deptId: 105,
        deptName: '移动的部门',
        parentId: 100,
        orderNum: 2,
      };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockRootDept,
        deptId: 105,
        parentId: 0,
        ancestors: '0',
      });
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue({
        deptId: 100,
        ancestors: '0',
      });
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([]); // 无子部门
      (deptRepo.update as jest.Mock).mockResolvedValue({ ...mockChildDept, deptId: 105 });

      // Act
      const result = await service.update(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(deptRepo.update).toHaveBeenCalledWith(
        105,
        expect.objectContaining({
          ancestors: '0,100',
        }),
      );
    });

    // 递归更新子部门祖级列表
    it('Given parentId changed and has children, When update, Then update children ancestors', async () => {
      // Arrange
      const updateDto = {
        deptId: 101,
        deptName: '技术部',
        parentId: 200, // 从 100 移动到 200
        orderNum: 1,
      };
      // 当前部门
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockChildDept,
        deptId: 101,
        parentId: 100,
        ancestors: '0,100',
      });
      // 新父部门
      (prisma.sysDept.findUnique as jest.Mock)
        .mockResolvedValueOnce({ deptId: 200, ancestors: '0' }) // calculateAncestors
        .mockResolvedValueOnce({ deptId: 200, ancestors: '0' }); // checkNotChildAsParent
      // 子部门列表
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([
        { deptId: 102, ancestors: '0,100,101' },
        { deptId: 103, ancestors: '0,100,101' },
      ]);
      (prisma.sysDept.update as jest.Mock).mockResolvedValue({});
      (deptRepo.update as jest.Mock).mockResolvedValue({});

      // Act
      const result = await service.update(updateDto as any);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      // 验证子部门的祖级列表被更新
      expect(prisma.sysDept.update).toHaveBeenCalledTimes(2);
      expect(prisma.sysDept.update).toHaveBeenCalledWith({
        where: { deptId: 102 },
        data: { ancestors: '0,200,101' },
      });
      expect(prisma.sysDept.update).toHaveBeenCalledWith({
        where: { deptId: 103 },
        data: { ancestors: '0,200,101' },
      });
    });

    it('Given parentId=self, When update, Then throw 不能将自己设为父部门', async () => {
      // Arrange
      const updateDto = {
        deptId: 100,
        parentId: 100,
        deptName: '部门',
        orderNum: 0,
      };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockRootDept,
        parentId: 0,
      });

      // Act & Assert
      await expect(service.update(updateDto as any)).rejects.toThrow(BusinessException);
      try {
        await service.update(updateDto as any);
      } catch (error) {
        expect(error.getResponse().msg).toBe('不能将自己设为父部门');
      }
    });

    it('Given new parent is child, When update, Then throw 不能将子部门设为父部门', async () => {
      // Arrange
      const updateDto = {
        deptId: 100,
        parentId: 102, // 102 是 100 的子部门
        deptName: '部门',
        orderNum: 0,
      };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockRootDept,
        deptId: 100,
        parentId: 0,
        ancestors: '0',
      });
      // checkNotChildAsParent 查询新父部门
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue({
        deptId: 102,
        ancestors: '0,100,101', // 包含 100，说明 102 是 100 的子部门
      });

      // Act & Assert
      await expect(service.update(updateDto as any)).rejects.toThrow(BusinessException);
      try {
        await service.update(updateDto as any);
      } catch (error) {
        expect(error.getResponse().msg).toBe('不能将子部门设为父部门');
      }
    });

    it('Given new parent not exists, When update, Then throw 父级部门不存在', async () => {
      // Arrange
      const updateDto = {
        deptId: 100,
        parentId: 999,
        deptName: '部门',
        orderNum: 0,
      };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockRootDept,
        parentId: 0,
      });
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(updateDto as any)).rejects.toThrow(BusinessException);
      try {
        await service.update(updateDto as any);
      } catch (error) {
        expect(error.getResponse().msg).toBe('父级部门不存在');
      }
    });
  });

  // ============================================================
  // 删除部门测试
  // ============================================================
  describe('remove', () => {
    // AC-6: 删除部门时，使用软删除，数据不物理删除
    it('Given valid deptId without children and users, When remove, Then soft delete (AC-6)', async () => {
      // Arrange
      (deptRepo.countChildren as jest.Mock).mockResolvedValue(0);
      (deptRepo.countUsers as jest.Mock).mockResolvedValue(0);
      (deptRepo.softDelete as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.remove(100);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(deptRepo.softDelete).toHaveBeenCalledWith(100);
    });

    // AC-5: 删除部门时，如果存在子部门，返回错误
    it('Given deptId has children, When remove, Then throw 该部门存在子部门，无法删除 (AC-5)', async () => {
      // Arrange
      (deptRepo.countChildren as jest.Mock).mockResolvedValue(2);

      // Act & Assert
      await expect(service.remove(100)).rejects.toThrow(BusinessException);
      try {
        await service.remove(100);
      } catch (error) {
        expect(error.getResponse().msg).toBe('该部门存在子部门，无法删除');
      }
      expect(deptRepo.softDelete).not.toHaveBeenCalled();
    });

    // 删除部门前检查关联用户
    it('Given deptId has users, When remove, Then throw 该部门存在关联用户，无法删除', async () => {
      // Arrange
      (deptRepo.countChildren as jest.Mock).mockResolvedValue(0);
      (deptRepo.countUsers as jest.Mock).mockResolvedValue(5);

      // Act & Assert
      await expect(service.remove(100)).rejects.toThrow(BusinessException);
      try {
        await service.remove(100);
      } catch (error) {
        expect(error.getResponse().msg).toBe('该部门存在关联用户，无法删除');
      }
      expect(deptRepo.softDelete).not.toHaveBeenCalled();
    });

    it('Given deptId not exists, When remove, Then return 0 affected', async () => {
      // Arrange
      (deptRepo.countChildren as jest.Mock).mockResolvedValue(0);
      (deptRepo.countUsers as jest.Mock).mockResolvedValue(0);
      (deptRepo.softDelete as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await service.remove(999);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toBe(0);
    });
  });

  // ============================================================
  // 部门选择框测试
  // ============================================================
  describe('optionselect', () => {
    it('Given normal departments exist, When optionselect, Then return only normal status', async () => {
      // Arrange
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([mockRootDept, mockChildDept]);

      // Act
      const result = await service.optionselect();

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(Array.isArray(result.data)).toBe(true);
      expect(prisma.sysDept.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            delFlag: DelFlagEnum.NORMAL,
            status: StatusEnum.NORMAL,
          },
          orderBy: { orderNum: 'asc' },
        }),
      );
    });
  });

  // ============================================================
  // 排除节点查询测试
  // ============================================================
  describe('findListExclude', () => {
    // AC-9: 排除节点查询时，排除指定节点及其所有子节点
    it('Given deptId=100, When findListExclude, Then exclude 100 and its children (AC-9)', async () => {
      // Arrange
      const otherDept = { ...mockRootDept, deptId: 200, deptName: '其他部门' };
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([otherDept]);

      // Act
      const result = await service.findListExclude(100);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      const callArgs = (prisma.sysDept.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.NOT.OR).toEqual(
        expect.arrayContaining([
          { deptId: 100 },
          { ancestors: { contains: ',100,' } },
          { ancestors: { startsWith: '100,' } },
          { ancestors: { endsWith: ',100' } },
        ]),
      );
    });
  });

  // ============================================================
  // 部门树测试
  // ============================================================
  describe('deptTree', () => {
    // AC-10: 获取部门树时，按显示顺序升序排列
    it('Given departments exist, When deptTree, Then return tree ordered by orderNum (AC-10)', async () => {
      // Arrange
      const mockDepts = [
        { ...mockRootDept, deptId: 100, parentId: 0, orderNum: 0 },
        { ...mockChildDept, deptId: 101, parentId: 100, orderNum: 1 },
        { ...mockGrandchildDept, deptId: 102, parentId: 101, orderNum: 0 },
      ];
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue(mockDepts);

      // Act
      const result = await service.deptTree();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(prisma.sysDept.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { delFlag: DelFlagEnum.NORMAL },
          orderBy: { orderNum: 'asc' },
        }),
      );
    });

    it('Given empty departments, When deptTree, Then return empty array', async () => {
      // Arrange
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.deptTree();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // 获取子部门ID列表测试
  // ============================================================
  describe('getChildDeptIds', () => {
    // AC-11: 获取子部门ID列表时，包含指定部门及其所有子部门
    it('Given deptId=100 with children, When getChildDeptIds, Then return all descendant IDs (AC-11)', async () => {
      // Arrange
      const mockDepts = [{ deptId: 100 }, { deptId: 101 }, { deptId: 102 }];
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue(mockDepts);

      // Act
      const result = await service.getChildDeptIds(100);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result).toContain(100);
      expect(result).toContain(101);
      expect(result).toContain(102);
    });

    it('Given deptId with no children, When getChildDeptIds, Then return only self', async () => {
      // Arrange
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([{ deptId: 102 }]);

      // Act
      const result = await service.getChildDeptIds(102);

      // Assert
      expect(result).toEqual([102]);
    });
  });

  // ============================================================
  // 数据权限查询测试
  // ============================================================
  describe('findDeptIdsByDataScope', () => {
    // AC-14: 仅本人数据权限时，返回空数组
    it('Given dataScope=DATA_SCOPE_SELF, When findDeptIdsByDataScope, Then return empty array (AC-14)', async () => {
      // Act
      const result = await service.findDeptIdsByDataScope(100, DataScopeEnum.DATA_SCOPE_SELF);

      // Assert
      expect(result).toEqual([]);
      expect(prisma.sysDept.findMany).not.toHaveBeenCalled();
    });

    // AC-12: 本部门数据权限时，返回指定部门ID
    it('Given dataScope=DATA_SCOPE_DEPT, When findDeptIdsByDataScope, Then return only deptId (AC-12)', async () => {
      // Arrange
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([{ deptId: 100 }]);

      // Act
      const result = await service.findDeptIdsByDataScope(100, DataScopeEnum.DATA_SCOPE_DEPT);

      // Assert
      expect(result).toEqual([100]);
      const callArgs = (prisma.sysDept.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.deptId).toBe(100);
    });

    // AC-13: 本部门及下级数据权限时，返回指定部门及其所有子部门ID
    it('Given dataScope=DATA_SCOPE_DEPT_AND_CHILD, When findDeptIdsByDataScope, Then return dept and children (AC-13)', async () => {
      // Arrange
      const mockDepts = [{ deptId: 100 }, { deptId: 101 }, { deptId: 102 }];
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue(mockDepts);

      // Act
      const result = await service.findDeptIdsByDataScope(100, DataScopeEnum.DATA_SCOPE_DEPT_AND_CHILD);

      // Assert
      expect(result).toEqual([100, 101, 102]);
      const callArgs = (prisma.sysDept.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.OR).toEqual([{ deptId: 100 }, { ancestors: { contains: '100' } }]);
    });
  });

  // ============================================================
  // 部门移动测试
  // ============================================================
  describe('move', () => {
    it('Given valid move request, When move, Then update parent and ancestors', async () => {
      // Arrange
      const moveDeptDto = { deptId: 101, newParentId: 200 };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockChildDept,
        deptId: 101,
        parentId: 100,
        ancestors: '0,100',
      });
      (prisma.sysDept.findUnique as jest.Mock)
        .mockResolvedValueOnce({ deptId: 200, ancestors: '0' }) // checkNotChildAsParent
        .mockResolvedValueOnce({ deptId: 200, ancestors: '0' }); // calculateAncestors
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([]); // no children
      (deptRepo.update as jest.Mock).mockResolvedValue({});

      // Act
      const result = await service.move(moveDeptDto);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(deptRepo.update).toHaveBeenCalledWith(101, {
        parentId: 200,
        ancestors: '0,200',
      });
    });

    it('Given same parent, When move, Then return success without update', async () => {
      // Arrange
      const moveDeptDto = { deptId: 101, newParentId: 100 };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockChildDept,
        deptId: 101,
        parentId: 100,
        ancestors: '0,100',
      });

      // Act
      const result = await service.move(moveDeptDto);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(deptRepo.update).not.toHaveBeenCalled();
    });

    it('Given move to self, When move, Then throw 不能将自己设为父部门', async () => {
      // Arrange
      const moveDeptDto = { deptId: 100, newParentId: 100 };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockRootDept,
        deptId: 100,
        parentId: 0,
      });

      // Act & Assert
      await expect(service.move(moveDeptDto)).rejects.toThrow(BusinessException);
    });

    it('Given move to child, When move, Then throw 不能将子部门设为父部门', async () => {
      // Arrange
      const moveDeptDto = { deptId: 100, newParentId: 102 };
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockRootDept,
        deptId: 100,
        parentId: 0,
        ancestors: '0',
      });
      (prisma.sysDept.findUnique as jest.Mock).mockResolvedValue({
        deptId: 102,
        ancestors: '0,100,101', // 102 is child of 100
      });

      // Act & Assert
      await expect(service.move(moveDeptDto)).rejects.toThrow(BusinessException);
    });

    it('Given dept not exists, When move, Then throw 部门不存在', async () => {
      // Arrange
      const moveDeptDto = { deptId: 999, newParentId: 100 };
      (deptRepo.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.move(moveDeptDto)).rejects.toThrow(BusinessException);
    });
  });

  // ============================================================
  // 部门人员统计测试
  // ============================================================
  describe('getDeptUserStats', () => {
    it('Given valid deptId, When getDeptUserStats, Then return stats', async () => {
      // Arrange
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockRootDept,
        deptId: 100,
        deptName: '总公司',
      });
      (deptRepo.countUsers as jest.Mock).mockResolvedValue(5);
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([
        { deptId: 100 },
        { deptId: 101 },
        { deptId: 102 },
      ]);
      (prisma.sysUser.count as jest.Mock).mockResolvedValue(15);

      // Act
      const result = await service.getDeptUserStats(100);

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data).toEqual({
        deptId: 100,
        deptName: '总公司',
        directUserCount: 5,
        totalUserCount: 15,
        childDeptCount: 2,
      });
    });

    it('Given dept not exists, When getDeptUserStats, Then throw 部门不存在', async () => {
      // Arrange
      (deptRepo.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getDeptUserStats(999)).rejects.toThrow(BusinessException);
    });

    it('Given dept with no children, When getDeptUserStats, Then childDeptCount=0', async () => {
      // Arrange
      (deptRepo.findById as jest.Mock).mockResolvedValue({
        ...mockGrandchildDept,
        deptId: 102,
        deptName: '前端组',
      });
      (deptRepo.countUsers as jest.Mock).mockResolvedValue(3);
      (prisma.sysDept.findMany as jest.Mock).mockResolvedValue([{ deptId: 102 }]);
      (prisma.sysUser.count as jest.Mock).mockResolvedValue(3);

      // Act
      const result = await service.getDeptUserStats(102);

      // Assert
      expect(result.data.childDeptCount).toBe(0);
      expect(result.data.directUserCount).toBe(3);
      expect(result.data.totalUserCount).toBe(3);
    });
  });

  // ============================================================
  // 负责人变更历史测试
  // ============================================================
  describe('getLeaderChangeHistory', () => {
    it('Given valid query, When getLeaderChangeHistory, Then return paginated history', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 1,
          tenantId: '000000',
          deptId: 100,
          deptName: '总公司',
          oldLeader: '张三',
          newLeader: '李四',
          operator: 'admin',
          createTime: new Date(),
        },
      ];
      (prisma.sysDeptLeaderLog.findMany as jest.Mock).mockResolvedValue(mockLogs);
      (prisma.sysDeptLeaderLog.count as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await service.getLeaderChangeHistory({ pageNum: 1, pageSize: 10 });

      // Assert
      expect(result.code).toBe(ResponseCode.SUCCESS);
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.total).toBe(1);
    });

    it('Given deptId filter, When getLeaderChangeHistory, Then filter by deptId', async () => {
      // Arrange
      (prisma.sysDeptLeaderLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.sysDeptLeaderLog.count as jest.Mock).mockResolvedValue(0);

      // Act
      await service.getLeaderChangeHistory({ deptId: 100, pageNum: 1, pageSize: 10 });

      // Assert
      const callArgs = (prisma.sysDeptLeaderLog.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.deptId).toBe(100);
    });
  });
});
