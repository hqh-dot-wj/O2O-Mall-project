import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { PaginationHelper } from 'src/common/utils/pagination.helper';
import { BrandRepository } from './brand.repository';
import { CreateBrandDto, UpdateBrandDto, ListBrandDto } from './dto';

/**
 * 品牌服务层
 * 处理品牌相关的业务逻辑，包括CRUD操作和业务规则校验
 *
 * @class BrandService
 */
@Injectable()
export class BrandService {
  /**
   * 构造函数
   * @param brandRepo - 品牌仓储实例
   */
  constructor(private readonly brandRepo: BrandRepository) {}

  /**
   * 查询品牌列表（分页）
   * 支持按品牌名称模糊搜索，按创建时间倒序排列
   *
   * @param query - 查询参数（包含分页和搜索条件）
   * @returns 分页结果，包含品牌列表和总数
   */
  async findAll(query: ListBrandDto) {
    // 使用分页助手计算分页参数
    const { pageNum, pageSize } = PaginationHelper.getPagination(query);

    // 构建查询条件
    const where: Prisma.PmsBrandWhereInput = {};
    if (query.name) {
      where.name = { contains: query.name }; // 模糊查询品牌名称
    }

    // 执行分页查询
    const { rows, total } = await this.brandRepo.findPage({
      where,
      pageNum,
      pageSize,
      orderBy: 'brandId',
      order: 'desc',
    });

    return Result.page(rows, total, pageNum, pageSize);
  }

  /**
   * 创建品牌
   * 使用事务确保数据一致性
   *
   * @param dto - 创建品牌DTO
   * @returns 创建成功的品牌对象
   */
  @Transactional()
  async create(dto: CreateBrandDto) {
    const brand = await this.brandRepo.create({
      name: dto.name,
      logo: dto.logo || '', // 默认空字符串
    });
    return Result.ok(brand);
  }

  /**
   * 更新品牌信息
   * 使用事务确保数据一致性
   *
   * @param id - 品牌ID
   * @param dto - 更新品牌DTO
   * @returns 更新后的品牌对象
   */
  @Transactional()
  async update(id: number, dto: UpdateBrandDto) {
    const brand = await this.brandRepo.update(id, dto);
    return Result.ok(brand);
  }

  /**
   * 删除品牌
   * 删除前会检查品牌是否被商品引用，如果被引用则不允许删除
   * 使用事务确保数据一致性
   *
   * @param id - 品牌ID
   * @returns 删除成功的结果
   * @throws {BusinessException} 如果品牌被商品使用
   */
  @Transactional()
  async remove(id: number) {
    // 检查品牌是否被商品使用
    const isUsed = await this.brandRepo.isUsedByProducts(id);
    BusinessException.throwIf(isUsed, '该品牌已被商品使用，无法删除', ResponseCode.BUSINESS_ERROR);

    await this.brandRepo.delete(id);
    return Result.ok();
  }

  /**
   * 查询品牌详情
   *
   * @param id - 品牌ID
   * @returns 品牌详情对象
   * @throws {BusinessException} 如果品牌不存在
   */
  async findOne(id: number) {
    const brand = await this.brandRepo.findById(id);
    BusinessException.throwIf(!brand, '品牌不存在', ResponseCode.NOT_FOUND);
    return Result.ok(brand);
  }
}
