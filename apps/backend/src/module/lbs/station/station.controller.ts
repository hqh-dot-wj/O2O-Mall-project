import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StationService } from './station.service';

@ApiTags('LBS-站点管理')
@Controller('lbs/station')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Post()
  @ApiOperation({ summary: '创建站点 (含围栏)' })
  async create(@Body() body: any) {
    // Body should validate DTO, simplified here
    return this.stationService.create(body);
  }

  @Get('list')
  @ApiOperation({ summary: '获取站点列表' })
  @ApiQuery({ name: 'tenantId', required: false })
  async list(@Query('tenantId') tenantId?: string) {
    return this.stationService.findAll(tenantId);
  }

  @Get('check-region')
  @ApiOperation({ summary: '判断坐标所在位置 (C端使用)' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  async checkRegion(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.stationService.findNearby(Number(lat), Number(lng));
  }
}
