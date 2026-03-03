import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 生成权限标识 DTO
 */
export class GeneratePermsDto {
  @ApiProperty({ description: '菜单路径', example: '/system/user' })
  @IsString()
  path: string;

  @ApiProperty({ description: '父菜单路径', required: false, example: '/system' })
  @IsOptional()
  @IsString()
  parentPath?: string;

  @ApiProperty({
    description: '菜单类型：M=目录 C=菜单 F=按钮',
    required: false,
    enum: ['M', 'C', 'F'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['M', 'C', 'F'])
  menuType?: string;

  @ApiProperty({
    description: '操作类型（按钮时使用）',
    required: false,
    enum: ['list', 'query', 'add', 'edit', 'remove', 'export', 'import'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['list', 'query', 'add', 'edit', 'remove', 'export', 'import'])
  action?: string;
}
