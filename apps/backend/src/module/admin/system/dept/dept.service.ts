import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { CreateDeptDto, UpdateDeptDto, ListDeptDto, MoveDeptDto, QueryLeaderLogDto } from './dto/index';
import { FormatDateFields, ListToTree } from 'src/common/utils/index';
import { CacheEnum, DataScopeEnum, DelFlagEnum, StatusEnum } from 'src/common/enum/index';
import { Cacheable, CacheEvict } from 'src/common/decorators/redis.decorator';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeptRepository } from './dept.repository';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class DeptService {
  private readonly logger = new Logger(DeptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deptRepo: DeptRepository,
    private readonly cls: ClsService,
  ) {}

  @CacheEvict(CacheEnum.SYS_DEPT_KEY, '*')
  @Transactional()
  async create(createDeptDto: CreateDeptDto) {
    let ancestors = '0';
    if (createDeptDto.parentId) {
      const parent = await this.prisma.sysDept.findUnique({
        where: {
          deptId: createDeptDto.parentId,
        },
        select: {
          ancestors: true,
        },
      });
      if (!parent) {
        return Result.fail(ResponseCode.INTERNAL_SERVER_ERROR, '父级部门不存在');
      }
      ancestors = parent.ancestors ? `${parent.ancestors},${createDeptDto.parentId}` : `${createDeptDto.parentId}`;
    }
    const payload: Prisma.SysDeptUncheckedCreateInput = {
      parentId: createDeptDto.parentId,
      ancestors,
      deptName: createDeptDto.deptName,
      orderNum: createDeptDto.orderNum,
      leader: createDeptDto.leader ?? '',
      phone: createDeptDto.phone ?? '',
      email: createDeptDto.email ?? '',
      status: createDeptDto.status ?? StatusEnum.NORMAL,
      delFlag: DelFlagEnum.NORMAL,
      remark: null,
    };
    await this.deptRepo.create(payload);
    return Result.ok();
  }

  async findAll(query: ListDeptDto) {
    const where: Prisma.SysDeptWhereInput = {
      delFlag: DelFlagEnum.NORMAL,
    };

    if (query.deptName) {
      where.deptName = {
        contains: query.deptName,
      };
    }

    if (query.status) {
      where.status = query.status as StatusEnum;
    }

    const res = await this.prisma.sysDept.findMany({
      where,
      orderBy: { orderNum: 'asc' },
    });
    const formattedRes = FormatDateFields(res);
    return Result.ok(formattedRes);
  }

  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'findOne:{deptId}')
  async findOne(deptId: number) {
    const data = await this.deptRepo.findById(deptId);
    const formattedData = FormatDateFields(data);
    return Result.ok(formattedData);
  }

  /**
   * 根据数据权限范围和部门ID查询部门ID列表。
   * @param deptId 部门ID，表示需要查询的部门。
   * @param dataScope 数据权限范围，决定查询的部门范围。
   * @returns 返回一个部门ID数组，根据数据权限范围决定返回的部门ID集合。
   */
  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'findDeptIdsByDataScope:{deptId}-{dataScope}')
  async findDeptIdsByDataScope(deptId: number, dataScope: DataScopeEnum) {
    try {
      if (dataScope === DataScopeEnum.DATA_SCOPE_SELF) {
        return [];
      }

      const where: Prisma.SysDeptWhereInput = {
        delFlag: DelFlagEnum.NORMAL,
      };

      if (dataScope === DataScopeEnum.DATA_SCOPE_DEPT) {
        where.deptId = deptId;
      }

      if (dataScope === DataScopeEnum.DATA_SCOPE_DEPT_AND_CHILD) {
        where.OR = [
          { deptId },
          {
            ancestors: {
              contains: `${deptId}`,
            },
          },
        ];
      }

      const list = await this.prisma.sysDept.findMany({ where });
      return list.map((item) => item.deptId);
    } catch (error) {
      this.logger.error('Failed to query department IDs:', error);
      BusinessException.throw(ResponseCode.INTERNAL_SERVER_ERROR, '查询部门ID失败', error);
    }
  }

  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'findListExclude')
  async findListExclude(id: number) {
    // 排除 ancestors 中包含指定 id 的部门（排除子部门）
    const data = await this.prisma.sysDept.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
        NOT: {
          OR: [
            { deptId: id },
            { ancestors: { contains: `,${id},` } },
            { ancestors: { startsWith: `${id},` } },
            { ancestors: { endsWith: `,${id}` } },
          ],
        },
      },
    });
    return Result.ok(data);
  }

  /**
   * 更新部门信息
   * @description 如果修改了父部门，会递归更新所有子部门的祖级列表
   * @param updateDeptDto 更新部门DTO
   * @returns 更新结果
   */
  @CacheEvict(CacheEnum.SYS_DEPT_KEY, '*')
  @Transactional()
  async update(updateDeptDto: UpdateDeptDto) {
    const { deptId, parentId, leader } = updateDeptDto;

    // 获取当前部门信息
    const currentDept = await this.deptRepo.findById(deptId);
    BusinessException.throwIfNull(currentDept, '部门不存在');

    // 检查是否修改了负责人
    const isLeaderChanged = leader !== undefined && leader !== currentDept.leader;

    // 检查是否修改了父部门
    const isParentChanged = parentId !== undefined && parentId !== currentDept.parentId;

    let newAncestors: string | undefined;

    if (isParentChanged) {
      // 校验不能将自己设为父部门
      BusinessException.throwIf(parentId === deptId, '不能将自己设为父部门');

      // 校验不能将子部门设为父部门
      await this.checkNotChildAsParent(deptId, parentId);

      // 计算新的祖级列表
      newAncestors = await this.calculateAncestors(parentId);
      Object.assign(updateDeptDto, { ancestors: newAncestors });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deptCategory, ...data } = updateDeptDto;
    await this.deptRepo.update(deptId, data);

    // 如果修改了父部门，递归更新所有子部门的祖级列表
    if (isParentChanged && newAncestors !== undefined) {
      await this.updateChildrenAncestors(deptId, currentDept.ancestors, newAncestors);
    }

    // 如果修改了负责人，记录变更历史
    if (isLeaderChanged) {
      await this.recordLeaderChange(
        deptId,
        currentDept.deptName,
        currentDept.leader,
        leader,
      );
    }

    return Result.ok();
  }

  /**
   * 计算祖级列表
   * @param parentId 父部门ID
   * @returns 祖级列表字符串
   */
  private async calculateAncestors(parentId: number): Promise<string> {
    if (!parentId || parentId === 0) {
      return '0';
    }

    const parent = await this.prisma.sysDept.findUnique({
      where: { deptId: parentId },
      select: { ancestors: true },
    });

    BusinessException.throwIfNull(parent, '父级部门不存在');

    return parent.ancestors ? `${parent.ancestors},${parentId}` : `${parentId}`;
  }

  /**
   * 检查新父部门不是当前部门的子部门
   * @param deptId 当前部门ID
   * @param newParentId 新父部门ID
   * @throws BusinessException 如果新父部门是当前部门的子部门
   */
  private async checkNotChildAsParent(deptId: number, newParentId: number): Promise<void> {
    if (!newParentId || newParentId === 0) {
      return;
    }

    const newParent = await this.prisma.sysDept.findUnique({
      where: { deptId: newParentId },
      select: { ancestors: true },
    });

    if (!newParent) {
      return; // 父部门不存在的校验在 calculateAncestors 中处理
    }

    // 检查新父部门的祖级列表是否包含当前部门ID
    const ancestorIds = newParent.ancestors?.split(',').map(Number) || [];
    BusinessException.throwIf(
      ancestorIds.includes(deptId),
      '不能将子部门设为父部门',
    );
  }

  /**
   * 递归更新所有子部门的祖级列表
   * @param deptId 当前部门ID
   * @param oldAncestors 旧的祖级列表
   * @param newAncestors 新的祖级列表
   */
  private async updateChildrenAncestors(
    deptId: number,
    oldAncestors: string,
    newAncestors: string,
  ): Promise<void> {
    // 查询所有子部门（ancestors 包含当前部门ID的部门）
    const children = await this.prisma.sysDept.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
        OR: [
          { ancestors: { contains: `,${deptId},` } },
          { ancestors: { endsWith: `,${deptId}` } },
          { ancestors: { startsWith: `${deptId},` } },
          { parentId: deptId },
        ],
      },
      select: { deptId: true, ancestors: true },
    });

    if (children.length === 0) {
      return;
    }

    // 构建旧祖级前缀（包含当前部门）
    const oldPrefix = oldAncestors ? `${oldAncestors},${deptId}` : `${deptId}`;
    // 构建新祖级前缀（包含当前部门）
    const newPrefix = `${newAncestors},${deptId}`;

    // 批量更新子部门的祖级列表
    for (const child of children) {
      const childNewAncestors = child.ancestors.replace(oldPrefix, newPrefix);
      await this.prisma.sysDept.update({
        where: { deptId: child.deptId },
        data: { ancestors: childNewAncestors },
      });
    }

    this.logger.log(`Updated ancestors for ${children.length} child departments`);
  }

  /**
   * 删除部门
   * @description 删除前检查是否存在子部门和关联用户
   * @param deptId 部门ID
   * @returns 删除结果
   * @throws BusinessException 存在子部门或关联用户时抛出异常
   */
  @CacheEvict(CacheEnum.SYS_DEPT_KEY, '*')
  async remove(deptId: number) {
    // AC-5: 删除部门前检查是否存在子部门
    await this.checkHasChildren(deptId);
    // 删除部门前检查是否存在关联用户
    await this.checkHasUsers(deptId);

    const data = await this.deptRepo.softDelete(deptId);
    return Result.ok(data);
  }

  /**
   * 检查部门是否存在子部门
   * @param deptId 部门ID
   * @throws BusinessException 存在子部门时抛出异常
   */
  private async checkHasChildren(deptId: number): Promise<void> {
    const childCount = await this.deptRepo.countChildren(deptId);
    BusinessException.throwIf(childCount > 0, '该部门存在子部门，无法删除');
  }

  /**
   * 检查部门是否存在关联用户
   * @param deptId 部门ID
   * @throws BusinessException 存在关联用户时抛出异常
   */
  private async checkHasUsers(deptId: number): Promise<void> {
    const userCount = await this.deptRepo.countUsers(deptId);
    BusinessException.throwIf(userCount > 0, '该部门存在关联用户，无法删除');
  }

  /**
   * 获取部门选择框列表
   */
  async optionselect() {
    const list = await this.prisma.sysDept.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
        status: StatusEnum.NORMAL,
      },
      orderBy: { orderNum: 'asc' },
    });
    return Result.ok(list);
  }

  /**
   * 部门树
   * @returns
   */
  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'deptTree')
  async deptTree() {
    const res = await this.prisma.sysDept.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
      },
      orderBy: { orderNum: 'asc' },
    });
    const tree = ListToTree(
      res,
      (m) => m.deptId,
      (m) => m.deptName,
    );
    return tree;
  }

  /**
   * 获取指定部门及其所有子部门的ID列表
   * @param deptId 部门ID
   * @returns 部门ID数组
   */
  async getChildDeptIds(deptId: number): Promise<number[]> {
    const depts = await this.prisma.sysDept.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
        OR: [
          { deptId },
          { ancestors: { contains: `,${deptId}` } },
          { ancestors: { startsWith: `${deptId},` } },
          { ancestors: { contains: `,${deptId},` } },
        ],
      },
      select: { deptId: true },
    });
    return depts.map((d) => d.deptId);
  }

  /**
   * 移动部门到新的父部门下
   * @description 独立的部门移动接口，会递归更新所有子部门的祖级列表
   * @param moveDeptDto 移动部门DTO
   * @returns 移动结果
   * @throws BusinessException 移动失败时抛出异常
   */
  @CacheEvict(CacheEnum.SYS_DEPT_KEY, '*')
  @Transactional()
  async move(moveDeptDto: MoveDeptDto) {
    const { deptId, newParentId } = moveDeptDto;

    // 获取当前部门信息
    const currentDept = await this.deptRepo.findById(deptId);
    BusinessException.throwIfNull(currentDept, '部门不存在');

    // 如果父部门没有变化，直接返回
    if (newParentId === currentDept.parentId) {
      return Result.ok();
    }

    // 校验不能将自己设为父部门
    BusinessException.throwIf(newParentId === deptId, '不能将自己设为父部门');

    // 校验不能将子部门设为父部门
    await this.checkNotChildAsParent(deptId, newParentId);

    // 计算新的祖级列表
    const newAncestors = await this.calculateAncestors(newParentId);

    // 更新当前部门
    await this.deptRepo.update(deptId, {
      parentId: newParentId,
      ancestors: newAncestors,
    });

    // 递归更新所有子部门的祖级列表
    await this.updateChildrenAncestors(deptId, currentDept.ancestors, newAncestors);

    this.logger.log(`Department ${deptId} moved to parent ${newParentId}`);
    return Result.ok();
  }

  /**
   * 获取部门人员统计
   * @description 统计部门的直接用户数量和包含子部门的总用户数量
   * @param deptId 部门ID
   * @returns 人员统计信息
   */
  async getDeptUserStats(deptId: number) {
    // 获取部门信息
    const dept = await this.deptRepo.findById(deptId);
    BusinessException.throwIfNull(dept, '部门不存在');

    // 统计直接用户数量
    const directUserCount = await this.deptRepo.countUsers(deptId);

    // 获取所有子部门ID
    const childDeptIds = await this.getChildDeptIds(deptId);

    // 统计包含子部门的总用户数量
    const totalUserCount = await this.prisma.sysUser.count({
      where: {
        deptId: { in: childDeptIds },
        delFlag: DelFlagEnum.NORMAL,
      },
    });

    return Result.ok({
      deptId,
      deptName: dept.deptName,
      directUserCount,
      totalUserCount,
      childDeptCount: childDeptIds.length - 1, // 排除自身
    });
  }

  /**
   * 记录部门负责人变更历史
   * @param deptId 部门ID
   * @param deptName 部门名称
   * @param oldLeader 旧负责人
   * @param newLeader 新负责人
   * @param changeReason 变更原因
   */
  private async recordLeaderChange(
    deptId: number,
    deptName: string,
    oldLeader: string,
    newLeader: string,
    changeReason?: string,
  ): Promise<void> {
    const tenantId = this.cls.get('tenantId') || '000000';
    const operator = this.cls.get('userName') || 'system';

    // TODO: sysDeptLeaderLog table not yet in schema
    // await this.prisma.sysDeptLeaderLog.create({
    //   data: {
    //     tenantId,
    //     deptId,
    //     deptName,
    //     oldLeader: oldLeader || '',
    //     newLeader: newLeader || '',
    //     changeReason,
    //     operator,
    //   },
    // });

    this.logger.log(`Leader changed for dept ${deptId}: ${oldLeader} -> ${newLeader}`);
  }

  /**
   * 查询部门负责人变更历史
   * @param query 查询条件
   * @returns 变更历史列表
   */
  async getLeaderChangeHistory(query: QueryLeaderLogDto) {
    const { pageNum = 1, pageSize = 10 } = query;
    
    // TODO: sysDeptLeaderLog table not yet in schema
    // const tenantId = this.cls.get('tenantId') || '000000';
    // const where: Prisma.SysDeptLeaderLogWhereInput = { tenantId };
    // if (deptId) {
    //   where.deptId = deptId;
    // }
    // const [rows, total] = await Promise.all([
    //   this.prisma.sysDeptLeaderLog.findMany({
    //     where,
    //     orderBy: { createTime: 'desc' },
    //     skip: (pageNum - 1) * pageSize,
    //     take: pageSize,
    //   }),
    //   this.prisma.sysDeptLeaderLog.count({ where }),
    // ]);
    // return Result.ok({ rows: FormatDateFields(rows), total });

    return Result.ok({ rows: [], total: 0 });
  }
}
