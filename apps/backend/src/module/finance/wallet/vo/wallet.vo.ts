import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class WalletVo {
    @ApiProperty({ description: '钱包ID' })
    id: string;

    @ApiProperty({ description: '会员ID' })
    memberId: string;

    @ApiProperty({ description: '可用余额' })
    balance: number | Decimal;

    @ApiProperty({ description: '冻结余额' })
    frozen: number | Decimal;

    @ApiProperty({ description: '总收入' })
    totalIncome: number | Decimal;

    @ApiProperty({ description: '版本号' })
    version: number;
}
