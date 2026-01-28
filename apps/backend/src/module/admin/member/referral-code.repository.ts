import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { UmsReferralCode, Prisma } from '@prisma/client';

/**
 * 推荐码仓储 (Referral Code Repository)
 * 提供对 ums_referral_code 表的标准化访问
 */
@Injectable()
export class ReferralCodeRepository extends BaseRepository<
  UmsReferralCode,
  Prisma.UmsReferralCodeCreateInput,
  Prisma.UmsReferralCodeUpdateInput,
  Prisma.UmsReferralCodeDelegate
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'umsReferralCode', 'id');
  }

  /**
   * 根据会员ID查找推荐码
   */
  async findByMemberId(memberId: string) {
    return this.delegate.findFirst({
      where: { memberId },
    });
  }

  /**
   * 根据推荐码查找
   */
  async findByCode(code: string) {
    return this.delegate.findUnique({
      where: { code },
    });
  }
}
