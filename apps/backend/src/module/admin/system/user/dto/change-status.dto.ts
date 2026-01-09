import { IsString, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum, StatusEnumSchema } from 'src/common/enum';

/**
 * 修改用户状态 DTO
 */
export class ChangeUserStatusDto {
  @ApiProperty({ required: true, description: '用户ID' })
  @IsNumber()
  userId: number;

  @ApiProperty({ enum: StatusEnum, enumName: 'StatusEnum', enumSchema: StatusEnumSchema, required: true })
  @IsString()
  @IsEnum(StatusEnum)
  @Transform(({ value }) => {
    if (value === '0') return StatusEnum.NORMAL;
    if (value === '1') return StatusEnum.STOP;
    return value;
  })
  status: StatusEnum;
}
