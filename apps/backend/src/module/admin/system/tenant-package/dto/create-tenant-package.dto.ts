import { IsString, IsEnum, Length, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum, StatusEnumSchema } from 'src/common/enum';

export class CreateTenantPackageDto {
  @ApiProperty({ required: true, description: '套餐名称' })
  @IsString()
  @Length(1, 50)
  packageName: string;

  @ApiProperty({ required: false, description: '关联的菜单ID列表', type: [Number] })
  @IsOptional()
  @IsArray()
  menuIds?: number[];

  @ApiProperty({ required: false, description: '菜单树选择项是否关联显示' })
  @IsOptional()
  @IsBoolean()
  menuCheckStrictly?: boolean;

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

  @ApiProperty({ required: false, description: '备注' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}
