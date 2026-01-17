import { ApiProperty } from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';

export class ClientUserVo {
    @ApiProperty({ description: '用户ID' })
    memberId: string;

    @ApiProperty({ description: '用户昵称' })
    nickname: string;

    @ApiProperty({ description: '用户头像' })
    avatar: string;

    @ApiProperty({ description: '手机号' })
    mobile: string;

    @ApiProperty({ description: '状态', enum: MemberStatus })
    status: MemberStatus;

    @ApiProperty({ description: '余额' })
    balance: number;

    @ApiProperty({ description: '冻结余额' })
    frozenBalance: number;

    @ApiProperty({ description: '积分' })
    points: number;
}
