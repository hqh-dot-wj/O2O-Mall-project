import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class ListRegionDto extends PageQueryDto {
    @ApiProperty({ description: '父级编码', required: false })
    @IsOptional()
    @IsString()
    parentCode?: string;

    @ApiProperty({ description: '行政区划名称', required: false })
    @IsOptional()
    @IsString()
    name?: string;
}
