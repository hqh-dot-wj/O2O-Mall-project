import { ApiProperty } from '@nestjs/swagger';

/**
 * Member Status Enum
 * 1: Normal
 * 2: Disabled
 */
export const MemberStatusEnum = {
    NORMAL: '1',
    DISABLED: '2',
};

export class MemberVo {
    @ApiProperty({ description: 'Member ID' })
    memberId: string;

    @ApiProperty({ description: 'Nickname' })
    nickname: string;

    @ApiProperty({ description: 'Avatar URL' })
    avatar: string;

    @ApiProperty({ description: 'Mobile number' })
    mobile: string;

    @ApiProperty({ description: 'Status (1: Normal, 2: Disabled)' })
    status: string;

    @ApiProperty({ description: 'Registration Time' })
    createTime: Date;

    @ApiProperty({ description: 'Tenant ID' })
    tenantId: string;

    @ApiProperty({ description: 'Tenant Name' })
    tenantName?: string;

    @ApiProperty({ description: 'Referrer ID' })
    referrerId?: string;

    @ApiProperty({ description: 'Referrer Name' })
    referrerName?: string;

    @ApiProperty({ description: 'Referrer Mobile' })
    referrerMobile?: string;

    @ApiProperty({ description: 'Indirect Referrer ID' })
    indirectReferrerId?: string;

    @ApiProperty({ description: 'Indirect Referrer Name' })
    indirectReferrerName?: string;

    @ApiProperty({ description: 'Indirect Referrer Mobile' })
    indirectReferrerMobile?: string;

    // --- Reserved Fields for Wallet (Future Use) ---

    @ApiProperty({ description: 'Wallet Balance (Reserved)', default: 0 })
    balance: number;

    @ApiProperty({ description: 'Total Commission (Reserved)', default: 0 })
    commission: number;

    @ApiProperty({ description: 'Order Count (Reserved)', default: 0 })
    orderCount: number;
}
