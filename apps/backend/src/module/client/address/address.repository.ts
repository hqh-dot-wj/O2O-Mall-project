import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseRepository } from 'src/common/repository/base.repository';
import { UmsAddress, Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AddressRepository extends BaseRepository<UmsAddress, Prisma.UmsAddressUncheckedCreateInput> {
    constructor(
        prisma: PrismaService,
        private readonly clsService: ClsService,
    ) {
        super(prisma, clsService, 'umsAddress');
    }

    /**
     * 获取用户默认地址
     */
    async findDefault(memberId: string) {
        return this.prisma.umsAddress.findFirst({
            where: { memberId, isDefault: true },
        });
    }

    /**
     * 统计用户地址数量
     */
    async countByMember(memberId: string) {
        return this.prisma.umsAddress.count({
            where: { memberId },
        });
    }

    /**
     * 清除用户默认地址
     */
    async clearDefault(memberId: string) {
        return this.prisma.umsAddress.updateMany({
            where: { memberId, isDefault: true },
            data: { isDefault: false },
        });
    }
}
