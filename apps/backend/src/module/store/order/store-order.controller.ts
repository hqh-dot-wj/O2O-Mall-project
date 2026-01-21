import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { StoreOrderService } from './store-order.service';
import { ListStoreOrderDto, ReassignWorkerDto, VerifyServiceDto } from './dto/store-order.dto';

/**
 * Store端订单管理控制器
 */
@ApiTags('Store-订单管理')
@Controller('order')
export class StoreOrderController {
    constructor(private readonly storeOrderService: StoreOrderService) { }

    /**
     * 查询订单列表
     */
    @Get('list')
    @Api({ summary: '查询订单列表' })
    @RequirePermission('store:order:list')
    async findAll(
        @Query() query: ListStoreOrderDto,
    ) {
        return await this.storeOrderService.findAll(query);
    }

    /**
     * 查询订单详情
     */
    @Get('detail/:id')
    @Api({ summary: '查询订单详情' })
    @RequirePermission('store:order:query')
    async findOne(
        @Param('id') id: string,
    ) {
        // 默认允许查看佣金
        const canViewCommission = true;
        return await this.storeOrderService.findOne(id, canViewCommission);
    }

    /**
     * 获取待派单列表
     */
    @Get('dispatch/list')
    @Api({ summary: '获取待派单列表' })
    @RequirePermission('store:order:dispatch')
    async getDispatchList(
        @Query() query: ListStoreOrderDto,
    ) {
        return await this.storeOrderService.getDispatchList(query);
    }

    /**
     * 改派技师
     */
    @Post('reassign')
    @Api({ summary: '改派技师' })
    @RequirePermission('store:order:dispatch')
    async reassignWorker(
        @Body() dto: ReassignWorkerDto,
        @User('userId') userId: string,
    ) {
        return await this.storeOrderService.reassignWorker(dto, userId);
    }

    /**
     * 强制核销
     */
    @Post('verify')
    @Api({ summary: '强制核销' })
    @RequirePermission('store:order:verify')
    async verifyService(
        @Body() dto: VerifyServiceDto,
        @User('userId') userId: string,
    ) {
        return await this.storeOrderService.verifyService(dto, userId);
    }
}
