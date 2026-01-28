import { Injectable } from '@nestjs/common';
import { PmsBrand, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * 品牌仓储层
 * 封装品牌相关的数据访问逻辑，继承BaseRepository提供通用CRUD操作
 * 
 * @class BrandRepository
 * @extends {BaseRepository<PmsBrand, Prisma.PmsBrandCreateInput, Prisma.PmsBrandUpdateInput>}
 */
@Injectable()
export class BrandRepository extends BaseRepository<
  PmsBrand,
  Prisma.PmsBrandCreateInput,
  Prisma.PmsBrandUpdateInput
> {
  /**
   * 构造函数
   * @param prisma - Prisma服务实例
   * @param cls - CLS上下文服务，用于事务管理
   */
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'pmsBrand', 'brandId');
  }

  /**
   * 根据品牌名称查询品牌
   * @param name - 品牌名称
   * @returns 品牌对象或null
   */
  async findByName(name: string): Promise<PmsBrand | null> {
    return this.findOne({ name });
  }

  /**
   * 检查品牌是否被商品引用
   * 用于删除前的校验，防止删除正在使用的品牌
   * @param brandId - 品牌ID
   * @returns true表示被引用，false表示未被引用
   */
  async isUsedByProducts(brandId: number): Promise<boolean> {
    const count = await this.prisma.pmsProduct.count({
      where: { brandId },
    });
    return count > 0;
  }
}
