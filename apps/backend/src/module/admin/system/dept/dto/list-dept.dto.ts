import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum, StatusEnumSchema } from 'src/common/enum';

export class ListDeptDto {
  @ApiProperty({
    required: false,
    description: '部门名称',
  })
  @IsOptional()
  @IsString()
  deptName?: string;

  @ApiProperty({
    enum: StatusEnum,
    enumName: 'StatusEnum',
    enumSchema: StatusEnumSchema,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(StatusEnum)
  @Transform(({ value }) => {
    if (value === '0') return StatusEnum.NORMAL;
    if (value === '1') return StatusEnum.STOP;
    return value;
  })
  status?: StatusEnum;
}
