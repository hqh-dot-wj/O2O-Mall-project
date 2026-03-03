import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 部门移动 DTO
 * @description 将部门移动到新的父部门下
 */
export class MoveDeptDto {
  @ApiProperty({
    required: true,
    description: '要移动的部门ID',
  })
  @IsNumber()
  deptId: number;

  @ApiProperty({
    required: true,
    description: '新的父部门ID（0表示移动到顶级）',
  })
  @IsNumber()
  newParentId: number;
}
