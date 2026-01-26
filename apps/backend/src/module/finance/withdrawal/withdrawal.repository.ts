import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository';
import { FinWithdrawal, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class WithdrawalRepository extends BaseRepository<
  FinWithdrawal,
  Prisma.FinWithdrawalCreateInput,
  Prisma.FinWithdrawalUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'finWithdrawal');
  }
}
