import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PageQueryDto } from 'src/common/dto/base.dto';

/**
 * 查询品牌列表DTO
 * 用于接收品牌列表查询的请求参数，支持分页和模糊搜索
 */
export class ListBrandDto extends PageQueryDto {
  /** 品牌名称，支持模糊查询 */
  @ApiProperty({ description: '品牌名称（模糊查询）', required: false, example: '苹果' })
  @IsString({ message: '品牌名称必须是字符串' })
  @IsOptional()
  name?: string;
}
