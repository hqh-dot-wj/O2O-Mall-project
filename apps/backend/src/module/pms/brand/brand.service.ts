import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Result } from 'src/common/response';

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: any) {
    const { pageNum = 1, pageSize = 10, name } = params;
    const skip = (pageNum - 1) * pageSize;
    const where: Prisma.PmsBrandWhereInput = {};
    if (name) {
      where.name = { contains: name };
    }

    const [records, total] = await Promise.all([
      this.prisma.pmsBrand.findMany({
        where,
        skip: Number(skip),
        take: Number(pageSize),
        orderBy: { brandId: 'desc' },
      }),
      this.prisma.pmsBrand.count({ where }),
    ]);

    return Result.page(records, total, Number(pageNum), Number(pageSize));
  }

  async create(data: Prisma.PmsBrandCreateInput) {
    const res = await this.prisma.pmsBrand.create({ data });
    return Result.ok(res);
  }

  async update(id: number, data: Prisma.PmsBrandUpdateInput) {
    const res = await this.prisma.pmsBrand.update({
      where: { brandId: id },
      data,
    });
    return Result.ok(res);
  }

  async remove(id: number) {
    // Check if used by products
    const count = await this.prisma.pmsProduct.count({
      where: { brandId: id },
    });
    if (count > 0) {
      throw new BadRequestException('Cannot delete brand used by products');
    }

    const res = await this.prisma.pmsBrand.delete({
      where: { brandId: id },
    });
    return Result.ok(res);
  }
}
