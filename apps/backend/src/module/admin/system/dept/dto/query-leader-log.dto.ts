import { IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PageQueryDto } from 'src/common/dto/index';

/**
 * 查询部门负责人变更历史 DTO
 */
export class QueryLeaderLogDto extends PageQueryDto {
  @ApiProperty({
    required: false,
    description: '部门ID',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  deptId?: number;
}
