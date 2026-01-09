import { IsString, IsEnum, Length, IsOptional, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from 'src/common/dto/index';
import { StatusEnum, StatusEnumSchema } from 'src/common/enum';

export class ListPostDto extends PageQueryDto {
  @ApiProperty({ required: false, description: '岗位名称' })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  postName?: string;

  @ApiProperty({ required: false, description: '岗位编码' })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  postCode?: string;

  @ApiProperty({ enum: StatusEnum, enumName: 'StatusEnum', enumSchema: StatusEnumSchema, required: false })
  @IsOptional()
  @IsString()
  @IsEnum(StatusEnum)
  @Transform(({ value }) => {
    if (value === '0') return StatusEnum.NORMAL;
    if (value === '1') return StatusEnum.STOP;
    return value;
  })
  status?: StatusEnum;

  @ApiProperty({ required: false, description: '所属部门ID' })
  @IsOptional()
  @IsNumberString()
  belongDeptId?: string;
}
