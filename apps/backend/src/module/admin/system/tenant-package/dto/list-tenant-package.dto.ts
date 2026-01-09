import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PageQueryDto } from 'src/common/dto/index';
import { StatusEnum } from 'src/common/enum';

export class ListTenantPackageDto extends PageQueryDto {
  @ApiProperty({ required: false, description: '套餐名称' })
  @IsOptional()
  @IsString()
  packageName?: string;

  @ApiProperty({ required: false, description: '状态(0正常 1停用)' })
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
