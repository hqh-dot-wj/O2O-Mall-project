import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { Prisma, FinWallet } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class WalletRepository extends BaseRepository<
  FinWallet,
  Prisma.FinWalletCreateInput,
  Prisma.FinWalletUpdateInput
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'finWallet');
  }
}
