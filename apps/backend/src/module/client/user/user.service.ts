import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BusinessException } from 'src/common/exceptions';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) { }

    async info(userId: string) {
        const user = await this.prisma.umsMember.findUnique({
            where: { memberId: userId },
        });

        BusinessException.throwIfNull(user, '用户不存在');

        return user;
    }
}
