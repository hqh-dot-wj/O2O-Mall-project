import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Prisma, FinTransaction } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TransactionRepository extends BaseRepository<
  FinTransaction,
  Prisma.FinTransactionCreateInput,
  Prisma.FinTransactionUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'finTransaction');
  }
}
