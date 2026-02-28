import { Controller, Get, Post, Put, Delete, Body, Query, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { DistributionService } from './distribution.service';
import { ProductConfigService } from './services/product-config.service';
import { DashboardService } from './services/dashboard.service';
import { LevelService } from './services/level.service';
import { ApplicationService } from './services/application.service';
import { UpdateDistConfigDto } from './dto/update-dist-config.dto';
import { CommissionPreviewDto, CommissionPreviewVo } from './dto/commission-preview.dto';
import { ListConfigLogsDto } from './dto/list-config-logs.dto';
import { CreateProductConfigDto } from './dto/create-product-config.dto';
import { UpdateProductConfigDto } from './dto/update-product-config.dto';
import { ListProductConfigDto } from './dto/list-product-config.dto';
import { BatchImportProductConfigDto } from './dto/batch-import-product-config.dto';
import { GetDashboardDto } from './dto/get-dashboard.dto';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { ListLevelDto } from './dto/list-level.dto';
import { UpdateMemberLevelDto } from './dto/update-member-level.dto';
import { ListMemberLevelLogDto } from './dto/list-member-level-log.dto';
import { ListApplicationDto } from './dto/list-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { BatchReviewDto } from './dto/batch-review.dto';
import { UpdateReviewConfigDto } from './dto/update-review-config.dto';
import { DistConfigVo, DistConfigLogVo } from './vo/dist-config.vo';
import { ProductConfigVo } from './vo/product-config.vo';
import { DashboardVo } from './vo/dashboard.vo';
import { LevelVo, MemberLevelLogVo } from './vo/level.vo';
import { LevelCheckVo } from './vo/level-check.vo';
import { ApplicationVo, ReviewConfigVo } from './vo/application.vo';
import { CurrentTenant } from 'src/common/tenant/tenant.decorator';
import { ClientInfo, ClientInfoDto } from 'src/common/decorators/common.decorator';

@ApiTags('分销规则配置')
@Controller('store/distribution')
export class DistributionController {
  constructor(
    private readonly distributionService: DistributionService,
    private readonly productConfigService: ProductConfigService,
    private readonly dashboardService: DashboardService,
    private readonly levelService: LevelService,
    private readonly applicationService: ApplicationService,
  ) {}

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
  async getConfigLogs(@CurrentTenant() tenantId: string, @Query() query: ListConfigLogsDto) {
    return this.distributionService.getConfigLogs(tenantId, query);
  }

  @Post('commission/preview')
  @Api({ summary: '佣金预估 (前端提示用)', type: CommissionPreviewVo })
  async getCommissionPreview(@Body() dto: CommissionPreviewDto) {
    return this.distributionService.getCommissionPreview(dto);
  }

  // ==================== 商品级分佣配置 ====================

  @Post('product-config')
  @Api({ summary: '创建商品级分佣配置', type: ProductConfigVo })
  async createProductConfig(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateProductConfigDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.productConfigService.create(tenantId, dto, clientInfo.userName || 'system');
  }

  @Put('product-config/:id')
  @Api({ summary: '更新商品级分佣配置', type: ProductConfigVo })
  async updateProductConfig(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductConfigDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.productConfigService.update(tenantId, id, dto, clientInfo.userName || 'system');
  }

  @Delete('product-config/:id')
  @Api({ summary: '删除商品级分佣配置' })
  async deleteProductConfig(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.productConfigService.delete(tenantId, id, clientInfo.userName || 'system');
  }

  @Get('product-config/list')
  @Api({ summary: '查询商品级分佣配置列表', type: ProductConfigVo, isArray: true })
  async getProductConfigList(@CurrentTenant() tenantId: string, @Query() query: ListProductConfigDto) {
    return this.productConfigService.findAll(tenantId, query);
  }

  @Get('product-config/:id')
  @Api({ summary: '查询单个商品级分佣配置', type: ProductConfigVo })
  async getProductConfig(@CurrentTenant() tenantId: string, @Param('id', ParseIntPipe) id: number) {
    return this.productConfigService.findOne(tenantId, id);
  }

  @Post('product-config/batch')
  @Api({ summary: '批量导入商品级分佣配置' })
  async batchImportProductConfig(
    @CurrentTenant() tenantId: string,
    @Body() dto: BatchImportProductConfigDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.productConfigService.batchImport(tenantId, dto.items, clientInfo.userName || 'system');
  }

  // ==================== 分销数据看板 ====================

  @Get('dashboard')
  @Api({ summary: '获取分销数据看板', type: DashboardVo })
  async getDashboard(@CurrentTenant() tenantId: string, @Query() query: GetDashboardDto) {
    return this.dashboardService.getDashboard(tenantId, query);
  }

  // ==================== 分销员等级体系 ====================

  @Post('level')
  @Api({ summary: '创建等级配置', type: LevelVo })
  async createLevel(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateLevelDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.levelService.create(tenantId, dto, clientInfo.userName || 'system');
  }

  @Put('level/:id')
  @Api({ summary: '更新等级配置', type: LevelVo })
  async updateLevel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLevelDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.levelService.update(tenantId, id, dto, clientInfo.userName || 'system');
  }

  @Delete('level/:id')
  @Api({ summary: '删除等级配置' })
  async deleteLevel(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.levelService.delete(tenantId, id, clientInfo.userName || 'system');
  }

  @Get('level/list')
  @Api({ summary: '查询等级列表', type: LevelVo, isArray: true })
  async getLevelList(@CurrentTenant() tenantId: string, @Query() query: ListLevelDto) {
    const levels = await this.levelService.findAll(tenantId, query);
    return { rows: levels, total: levels.length };
  }

  @Get('level/:id')
  @Api({ summary: '查询等级详情', type: LevelVo })
  async getLevel(@CurrentTenant() tenantId: string, @Param('id', ParseIntPipe) id: number) {
    return this.levelService.findOne(tenantId, id);
  }

  @Post('member-level')
  @Api({ summary: '手动调整会员等级' })
  async updateMemberLevel(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateMemberLevelDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.levelService.updateMemberLevel(tenantId, dto, clientInfo.userName || 'system');
  }

  @Get('member-level/logs')
  @Api({ summary: '查询会员等级变更日志', type: MemberLevelLogVo, isArray: true })
  async getMemberLevelLogs(@CurrentTenant() tenantId: string, @Query() query: ListMemberLevelLogDto) {
    return this.levelService.getMemberLevelLogs(tenantId, query);
  }

  @Get('level/check/:memberId')
  @Api({ summary: '检查会员升级条件', type: LevelCheckVo })
  async checkLevelUpgrade(@CurrentTenant() tenantId: string, @Param('memberId') memberId: string) {
    return this.levelService.checkUpgradeEligibility(tenantId, memberId);
  }

  // ==================== 分销员申请/审核 ====================

  @Get('application/list')
  @Api({ summary: '查询申请列表（管理端）', type: ApplicationVo, isArray: true })
  async listApplications(@CurrentTenant() tenantId: string, @Query() query: ListApplicationDto) {
    return this.applicationService.listApplications(tenantId, query);
  }

  @Post('application/:id/review')
  @Api({ summary: '审核申请（管理端）' })
  async reviewApplication(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewApplicationDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.applicationService.reviewApplication(tenantId, id, dto, clientInfo.userName || 'system');
  }

  @Post('application/batch-review')
  @Api({ summary: '批量审核（管理端）' })
  async batchReview(
    @CurrentTenant() tenantId: string,
    @Body() dto: BatchReviewDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.applicationService.batchReview(tenantId, dto, clientInfo.userName || 'system');
  }

  @Get('application/config')
  @Api({ summary: '获取审核配置（管理端）', type: ReviewConfigVo })
  async getReviewConfig(@CurrentTenant() tenantId: string) {
    return this.applicationService.getReviewConfig(tenantId);
  }

  @Put('application/config')
  @Api({ summary: '更新审核配置（管理端）' })
  async updateReviewConfig(
    @CurrentTenant() tenantId: string,
    @Body() dto: UpdateReviewConfigDto,
    @ClientInfo() clientInfo: ClientInfoDto,
  ) {
    return this.applicationService.updateReviewConfig(tenantId, dto, clientInfo.userName || 'system');
  }
}
