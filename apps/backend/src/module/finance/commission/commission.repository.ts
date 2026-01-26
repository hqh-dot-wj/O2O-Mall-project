import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Prisma, FinCommission } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class CommissionRepository extends BaseRepository<
  FinCommission,
  Prisma.FinCommissionCreateInput,
  Prisma.FinCommissionUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'finCommission');
  }

  /**
   * Upsert commission record
   */
  async upsert(args: Prisma.FinCommissionUpsertArgs): Promise<FinCommission> {
    return (this.delegate as any).upsert(args);
  }

  /**
   * Aggregate commission data (used for limits)
   */
  async aggregate(
    args: Prisma.FinCommissionAggregateArgs,
  ): Promise<Prisma.GetFinCommissionAggregateType<Prisma.FinCommissionAggregateArgs>> {
    return (this.delegate as any).aggregate(args);
  }
}
