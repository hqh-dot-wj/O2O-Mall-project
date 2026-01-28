import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { UmsUpgradeApply, Prisma } from '@prisma/client';

/**
 * 升级申请数据访问层 (Upgrade Apply Repository)
 * 提供对 ums_upgrade_apply 表的标准化访问
 */
@Injectable()
export class UpgradeApplyRepository extends BaseRepository<
  UmsUpgradeApply,
  Prisma.UmsUpgradeApplyCreateInput,
  Prisma.UmsUpgradeApplyUpdateInput,
  Prisma.UmsUpgradeApplyDelegate
> {
  constructor(prisma: PrismaService, cls: ClsService) {
    super(prisma, cls, 'umsUpgradeApply', 'id');
  }

  /**
   * 统计待审批申请数
   */
  async countPending(where: Prisma.UmsUpgradeApplyWhereInput) {
    return this.delegate.count({
      where: { ...where, status: 'PENDING' },
    });
  }
}
