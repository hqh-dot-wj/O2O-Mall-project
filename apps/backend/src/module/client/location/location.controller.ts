import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { ClientLocationService } from './location.service';
import { MatchTenantDto, NearbyTenantsQueryDto } from './dto';
import { MatchTenantVo, NearbyTenantVo } from './vo';
import { Result } from 'src/common/response';

@ApiTags('C端-位置服务')
@Controller('client/location')
export class ClientLocationController {
    constructor(private readonly locationService: ClientLocationService) { }

    /**
     * 根据坐标匹配归属租户
     */
    @Api({ summary: '根据坐标匹配归属租户', type: MatchTenantVo })
    @Post('match-tenant')
    async matchTenant(@Body() dto: MatchTenantDto) {
        const result = await this.locationService.matchTenantByLocation(dto.lat, dto.lng);
        return Result.ok(result);
    }

    /**
     * 获取附近租户列表 (用于手动切换)
     */
    @Api({ summary: '获取附近租户列表', type: NearbyTenantVo, isArray: true })
    @Get('nearby-tenants')
    async getNearbyTenants(@Query() query: NearbyTenantsQueryDto) {
        const result = await this.locationService.getNearbyTenants(query.lat, query.lng);
        return Result.ok(result);
    }
}
