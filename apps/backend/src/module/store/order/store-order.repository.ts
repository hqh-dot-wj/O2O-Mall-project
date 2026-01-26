import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository';
import { OmsOrder, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class StoreOrderRepository extends BaseRepository<
  OmsOrder,
  Prisma.OmsOrderCreateInput,
  Prisma.OmsOrderUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'omsOrder');
  }
  async aggregate(
    args: Prisma.OmsOrderAggregateArgs,
  ): Promise<Prisma.GetOmsOrderAggregateType<Prisma.OmsOrderAggregateArgs>> {
    return (this.delegate as any).aggregate(args);
  }
}
