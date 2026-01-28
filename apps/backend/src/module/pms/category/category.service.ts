import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { Cacheable, CacheEvict } from 'src/common/decorators/redis.decorator';
import { CacheEnum } from 'src/common/enum/cache.enum';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto, UpdateCategoryDto, ListCategoryDto } from './dto';

/**
 * 分类服务层
 * 处理商品分类相关的业务逻辑，包括CRUD操作、树形结构构建和缓存管理
 * 
 * @class CategoryService
 */
@Injectable()
export class CategoryService {
  /**
   * 构造函数
   * @param categoryRepo - 分类仓储实例
   */
  constructor(private readonly categoryRepo: CategoryRepository) {}

  /**
   * 获取分类树（带Redis缓存）
   * 使用@Cacheable装饰器自动缓存查询结果，提升性能
   * 缓存键：pms:category:tree:tree
   * 
   * @returns 树形结构的分类列表
   */
  @Cacheable(CacheEnum.PMS_CATEGORY_TREE, 'tree')
  async findTree() {
    const categories = await this.categoryRepo.findAllForTree();
    return Result.ok(this.buildTree(categories));
  }

  /**
   * 获取分类列表（分页）
   * 支持按分类名称模糊搜索和按父级ID筛选
   *
   * @param query - 查询参数（包含分页和筛选条件）
   * @returns 分页结果，包含分类列表和总数
   */
  async findAll(query: ListCategoryDto) {
    // 使用分页助手计算分页参数
    const { pageNum, pageSize } = PaginationHelper.getPagination(query);

    // 构建查询条件
    const where: Prisma.PmsCategoryWhereInput = {};
    if (query.name) {
      where.name = { contains: query.name }; // 模糊查询分类名称
    }
    if (query.parentId !== undefined) {
      // parentId为0时查询顶级分类（parentId为null）
      where.parentId = query.parentId === 0 ? null : query.parentId;
    }

    // 执行分页查询，按排序号升序
    const { rows, total } = await this.categoryRepo.findPage({
      where,
      pageNum,
      pageSize,
      orderBy: 'sort',
      order: 'asc',
    });

    return Result.page(rows, total, pageNum, pageSize);
  }

  /**
   * 创建分类
   * 创建成功后自动清除分类树缓存
   * 使用事务确保数据一致性
   * 
   * @param dto - 创建分类DTO
   * @returns 创建成功的分类对象
   */
  @CacheEvict(CacheEnum.PMS_CATEGORY_TREE, '*')
  @Transactional()
  async create(dto: CreateCategoryDto) {
    const category = await this.categoryRepo.create({
      name: dto.name,
      level: 1, // 默认一级分类，可根据parentId计算
      icon: dto.icon || null,
      sort: dto.sort || 0,
      ...(dto.parentId && { parent: { connect: { catId: dto.parentId } } }),
      ...(dto.attrTemplateId && { attrTemplate: { connect: { templateId: dto.attrTemplateId } } }),
    });
    return Result.ok(category);
  }

  /**
   * 更新分类信息
   * 更新成功后自动清除分类树缓存
   * 使用事务确保数据一致性
   * 
   * @param id - 分类ID
   * @param dto - 更新分类DTO
   * @returns 更新后的分类对象
   */
  @CacheEvict(CacheEnum.PMS_CATEGORY_TREE, '*')
  @Transactional()
  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.update(id, dto);
    return Result.ok(category);
  }

  /**
   * 删除分类
   * 删除前会检查：
   * 1. 是否有子分类（有则不允许删除）
   * 2. 是否被商品引用（有则不允许删除）
   * 删除成功后自动清除分类树缓存
   * 使用事务确保数据一致性
   * 
   * @param id - 分类ID
   * @returns 删除成功的结果
   * @throws {BusinessException} 如果分类有子分类或被商品使用
   */
  @CacheEvict(CacheEnum.PMS_CATEGORY_TREE, '*')
  @Transactional()
  async remove(id: number) {
    // 检查是否有子分类
    const hasChildren = await this.categoryRepo.hasChildren(id);
    BusinessException.throwIf(hasChildren, '该分类下有子分类，无法删除', ResponseCode.BUSINESS_ERROR);

    // 检查是否被商品使用
    const isUsed = await this.categoryRepo.isUsedByProducts(id);
    BusinessException.throwIf(isUsed, '该分类已被商品使用，无法删除', ResponseCode.BUSINESS_ERROR);

    await this.categoryRepo.delete(id);
    return Result.ok();
  }

  /**
   * 查询分类详情
   * 
   * @param id - 分类ID
   * @returns 分类详情对象
   * @throws {BusinessException} 如果分类不存在
   */
  async findOne(id: number) {
    const category = await this.categoryRepo.findById(id);
    BusinessException.throwIf(!category, '分类不存在', ResponseCode.NOT_FOUND);
    return Result.ok(category);
  }

  /**
   * 构建树形结构（私有方法）
   * 递归构建父子关系的树形数据结构
   * 
   * @param items - 扁平的分类数组
   * @param parentId - 父级ID，null表示查找顶级分类
   * @returns 树形结构的分类数组
   */
  private buildTree(items: any[], parentId: number | null = null) {
    const tree: any[] = [];
    for (const item of items) {
      if (item.parentId === parentId) {
        // 递归查找子分类
        const children = this.buildTree(items, item.catId);
        if (children.length) {
          item.children = children;
        } else {
          item.children = undefined; // 没有子分类时设为undefined
        }
        tree.push(item);
      }
    }
    return tree;
  }
}
