import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateDistConfigDto {
    @ApiProperty({ description: '一级分佣比例 (0-100)', example: 60 })
    @IsNumber()
    @Min(0)
    @Max(100)
    level1Rate: number;

    @ApiProperty({ description: '二级分佣比例 (0-100)', example: 40 })
    @IsNumber()
    @Min(0)
    @Max(100)
    level2Rate: number;

    @ApiProperty({ description: '是否允许普通用户分销', example: true })
    @IsBoolean()
    enableLV0: boolean;
}
