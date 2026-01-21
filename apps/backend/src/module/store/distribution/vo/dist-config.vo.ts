import { ApiProperty } from '@nestjs/swagger';

export class DistConfigVo {
    @ApiProperty({ description: '配置ID' })
    id: number;

    @ApiProperty({ description: '一级分佣比例 (0-100)' })
    level1Rate: number;

    @ApiProperty({ description: '二级分佣比例 (0-100)' })
    level2Rate: number;

    @ApiProperty({ description: '是否允许普通用户分销' })
    enableLV0: boolean;

    @ApiProperty({ description: '创建时间' })
    createTime: string;
}

export class DistConfigLogVo {
    @ApiProperty({ description: '日志ID' })
    id: number;

    @ApiProperty({ description: '配置ID' })
    configId: number;

    @ApiProperty({ description: '一级分佣比例 (0-100)' })
    level1Rate: number;

    @ApiProperty({ description: '二级分佣比例 (0-100)' })
    level2Rate: number;

    @ApiProperty({ description: '是否允许普通用户分销' })
    enableLV0: boolean;

    @ApiProperty({ description: '操作人' })
    operator: string;

    @ApiProperty({ description: '创建时间' })
    createTime: string;
}
