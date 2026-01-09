import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RegionService } from './region.service';
import { Result } from 'src/common/response';

@ApiTags('LBS-行政区划管理')
@Controller('lbs/region')
export class RegionController {
    constructor(private readonly regionService: RegionService) { }

    @Get('list')
    @ApiOperation({ summary: '获取下级行政区划 (不传 parentId 则返回省份)' })
    @ApiQuery({ name: 'parentId', required: false, description: '父级Code' })
    async list(@Query('parentId') parentId?: string) {
        const data = await this.regionService.getChildren(parentId);
        return Result.ok(data);
    }

    @Get('name/:code')
    @ApiOperation({ summary: '获取行政区划名称' })
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
