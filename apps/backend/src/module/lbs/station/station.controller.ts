import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { BusinessType } from 'src/common/constant/business.constant';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { StationService } from './station.service';
import { CheckRegionDto, CreateStationDto, ListStationQueryDto } from './dto/station.dto';

@ApiTags('LBS-站点管理')
@ApiBearerAuth('Authorization')
@Controller('lbs/station')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Api({ summary: '创建站点 (含围栏)', body: CreateStationDto })
  @RequirePermission('lbs:station:create')
  @Operlog({ businessType: BusinessType.INSERT })
  @Post()
  async create(@Body() body: CreateStationDto) {
    return this.stationService.create(body);
  }

  @Api({ summary: '获取站点列表' })
  @RequirePermission('lbs:station:list')
  @Get('list')
  async list(@Query() query: ListStationQueryDto) {
    return this.stationService.findAll(query.tenantId);
  }

  @Api({ summary: '判断坐标所在位置 (管理端调试)' })
  @RequirePermission('lbs:station:query')
  @Get('check-region')
  async checkRegion(@Query() query: CheckRegionDto) {
    return this.stationService.findNearby(query.lat, query.lng);
  }
}
