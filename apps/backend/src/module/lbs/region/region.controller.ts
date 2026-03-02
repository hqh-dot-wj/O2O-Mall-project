import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { RegionService } from './region.service';
import { Result } from 'src/common/response';
import { ListRegionDto } from './dto/region.dto';

@ApiTags('LBS-行政区划管理')
@ApiBearerAuth('Authorization')
@Controller('lbs/region')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Api({ summary: '获取下级行政区划 (不传 parentCode 则返回省份)' })
  @RequirePermission('lbs:region:list')
  @Get('list')
  async list(@Query() query: ListRegionDto) {
    const data = await this.regionService.getChildren(query.parentCode);
    return Result.ok(data);
  }

  @Api({
    summary: '获取行政区划名称',
    params: [{ name: 'code', description: '行政区划编码', type: 'string' }],
  })
  @RequirePermission('lbs:region:query')
  @Get('name/:code')
  async getName(@Param('code') code: string) {
    const name = await this.regionService.getRegionName(code);
    return Result.ok(name);
  }

  // @Get('tree')
  // @ApiOperation({ summary: '获取完整树 (慎用，数据量大)' })
  // async tree() {
  //   return this.regionService.getTree();
  // }
}
