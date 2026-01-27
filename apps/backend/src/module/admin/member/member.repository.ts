import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { UmsMember, Prisma } from '@prisma/client';

/**
 * 会员数据访问层 (Member Repository)
 * 提供对 ums_member 表的标准化访问
 */
@Injectable()
export class MemberRepository extends BaseRepository<
    UmsMember,
    Prisma.UmsMemberCreateInput,
    Prisma.UmsMemberUpdateInput,
    Prisma.UmsMemberDelegate
> {
    constructor(prisma: PrismaService, cls: ClsService) {
        super(prisma, cls, 'umsMember', 'memberId');
    }

    /**
     * 按手机号查找会员
     */
    async findByMobile(mobile: string) {
        return this.delegate.findFirst({
            where: { mobile },
        });
    }

    /**
     * 检查手机号是否存在
     */
    async existsByMobile(mobile: string) {
        return this.exists({ mobile });
    }
}
