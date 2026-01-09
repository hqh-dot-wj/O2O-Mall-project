import { IsString, IsEnum, Length, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from 'src/common/dto';
import { StatusEnum, StatusEnumSchema } from 'src/common/enum';

/**
 * 角色列表查询 DTO
 */
export class ListRoleDto extends PageQueryDto {
  @ApiProperty({ required: false, description: '角色名称' })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  roleName?: string;

  @ApiProperty({ required: false, description: '角色权限字符串' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  roleKey?: string;

  @ApiProperty({
    required: false,
    description: '角色状态（0正常 1停用）',
    enum: StatusEnum,
    enumName: 'StatusEnum',
    enumSchema: StatusEnumSchema,
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

  @ApiProperty({ required: false, description: '角色ID' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  roleId?: string;
}
