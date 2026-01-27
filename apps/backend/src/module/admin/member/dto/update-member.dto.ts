import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新推荐人 Dto
 */
export class UpdateReferrerDto {
    @ApiProperty({ description: '会员 ID' })
    @IsNotEmpty({ message: '会员 ID 不能为空' })
    @IsString()
    memberId: string;

    @ApiProperty({ description: '推荐人 ID' })
    @IsNotEmpty({ message: '推荐人 ID 不能为空' })
    @IsString()
    referrerId: string;
}

/**
 * 更新租户 Dto
 */
export class UpdateMemberTenantDto {
    @ApiProperty({ description: '会员 ID' })
    @IsNotEmpty({ message: '会员 ID 不能为空' })
    @IsString()
    memberId: string;

    @ApiProperty({ description: '租户 ID' })
    @IsNotEmpty({ message: '租户 ID 不能为空' })
    @IsString()
    tenantId: string;
}

/**
 * 更新会员状态 Dto
 */
export class UpdateMemberStatusDto {
    @ApiProperty({ description: '会员 ID' })
    @IsNotEmpty({ message: '会员 ID 不能为空' })
    @IsString()
    memberId: string;

    @ApiProperty({ description: '状态 (0: 正常, 1: 禁用)' })
    @IsNotEmpty({ message: '状态不能为空' })
    @IsString()
    status: string;
}

/**
 * 修改会员等级 Dto
 */
export class UpdateMemberLevelDto {
    @ApiProperty({ description: '会员 ID' })
    @IsNotEmpty({ message: '会员 ID 不能为空' })
    @IsString()
    memberId: string;

    @ApiProperty({ description: '目标等级 (0: 普通, 1: C1, 2: C2)' })
    @IsNotEmpty({ message: '目标等级不能为空' })
    @IsNumber()
    levelId: number;
}
