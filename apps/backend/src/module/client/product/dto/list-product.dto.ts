import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * C端商品列表查询参数
 */
export class ClientListProductDto {
    @ApiPropertyOptional({ description: '商品名称' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: '分类ID' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    categoryId?: number;

    @ApiPropertyOptional({ description: '商品类型: REAL-实物, SERVICE-服务' })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiPropertyOptional({ description: '页码', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    pageNum?: number = 1;

    @ApiPropertyOptional({ description: '每页大小', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    pageSize?: number = 10;

    get skip(): number {
        return ((this.pageNum || 1) - 1) * (this.pageSize || 10);
    }

    get take(): number {
        return this.pageSize || 10;
    }
}
