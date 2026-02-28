import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PageQueryDto } from 'src/common/dto/base.dto';

/** 等级列表查询，继承分页参数以兼容前端 useTable；Service 实际返回全量，忽略分页 */
export class ListLevelDto extends PageQueryDto {
  @ApiProperty({ description: '是否激活', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isActive?: boolean;
}
