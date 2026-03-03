import { ApiProperty } from '@nestjs/swagger';

/**
 * 字典使用统计结果
 */
export class DictStatsDto {
  @ApiProperty({ description: '字典类型' })
  dictType: string;

  @ApiProperty({ description: '字典名称' })
  dictName: string;

  @ApiProperty({ description: '字典数据数量' })
  dataCount: number;

  @ApiProperty({ description: '缓存状态', enum: ['cached', 'not_cached'] })
  cacheStatus: 'cached' | 'not_cached';

  @ApiProperty({ description: '最后访问时间', required: false })
  lastAccessTime?: Date;
}

/**
 * 字典统计汇总
 */
export class DictStatsSummaryDto {
  @ApiProperty({ description: '字典类型总数' })
  totalTypeCount: number;

  @ApiProperty({ description: '字典数据总数' })
  totalDataCount: number;

  @ApiProperty({ description: '已缓存的字典类型数量' })
  cachedTypeCount: number;

  @ApiProperty({ description: '字典类型详细统计', type: [DictStatsDto] })
  details: DictStatsDto[];
}
