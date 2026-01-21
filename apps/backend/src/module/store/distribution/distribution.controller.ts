import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { DistributionService } from './distribution.service';
import { UpdateDistConfigDto } from './dto/update-dist-config.dto';
import { DistConfigVo, DistConfigLogVo } from './vo/dist-config.vo';
import { CurrentTenant } from 'src/common/tenant/tenant.decorator';
import { ClientInfo, ClientInfoDto } from 'src/common/decorators/common.decorator';

@ApiTags('分销规则配置')
@Controller('store/distribution')
export class DistributionController {
    constructor(private readonly distributionService: DistributionService) { }

    @Get('config')
    @Api({ summary: '获取分销规则配置', type: DistConfigVo })
    async getConfig(@CurrentTenant() tenantId: string) {
        return this.distributionService.getConfig(tenantId);
    }

    @Post('config')
    @Api({ summary: '更新分销规则配置' })
    async updateConfig(
        @CurrentTenant() tenantId: string,
        @Body() dto: UpdateDistConfigDto,
        @ClientInfo() clientInfo: ClientInfoDto,
    ) {
        return this.distributionService.updateConfig(tenantId, dto, clientInfo.userName || 'system');
    }

    @Get('config/logs')
    @Api({ summary: '获取分销规则变更历史', type: DistConfigLogVo, isArray: true })
    async getConfigLogs(@CurrentTenant() tenantId: string) {
        return this.distributionService.getConfigLogs(tenantId);
    }
}
